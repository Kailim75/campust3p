import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

/**
 * alma-payment (edge function Deno) — création/consultation de paiements
 * Alma côté centre connecté, 15/09/2026.
 *
 * Lot court (bonus, cf. consigne) : cas nominal + un cas d'erreur seulement.
 * Reconcile/reconcile-cron/process-payment-reminders restent hors périmètre
 * de ce lot — voir la PR.
 *
 * Même harnais faux-Deno que alma-webhook.test.ts / submit-pdp-simulee.test.ts.
 */

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
const serveState = vi.hoisted(() => ({
  handler: null as null | ((req: Request) => Promise<Response>),
}));

vi.mock("https://deno.land/std@0.168.0/http/server.ts", () => ({
  serve: (h: (req: Request) => Promise<Response>) => {
    serveState.handler = h;
  },
}));
vi.mock("https://esm.sh/@supabase/supabase-js@2.49.2", () => ({ createClient }));

type Gestionnaire = (req: Request) => Promise<Response>;
let gestionnaire: Gestionnaire;

const envValues: Record<string, string | undefined> = {};
function setEnv(overrides: Record<string, string | undefined>) {
  for (const k of Object.keys(envValues)) delete envValues[k];
  Object.assign(envValues, overrides);
}

beforeAll(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (k: string) => envValues[k] },
  };
  // Chemin en variable : tsc (tsconfig.app.json) ne suit pas ce code Deno.
  const chemin = "../../../supabase/functions/alma-payment/index.ts";
  await import(/* @vite-ignore */ chemin);
  expect(serveState.handler).not.toBeNull();
  gestionnaire = serveState.handler!;
});

beforeEach(() => {
  setEnv({ ALMA_API_KEY: "sk_test_xxx" });
  createClient.mockReset();
  createClient.mockReturnValue({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user_1" } }, error: null })),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://projet.supabase.co/functions/v1/alma-payment", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer jeton", ...headers },
    body: JSON.stringify(body),
  });
}

describe("alma-payment — garde d'authentification", () => {
  it("pas d'en-tête Authorization Bearer → 401, aucun appel Supabase", async () => {
    const req = new Request("https://projet.supabase.co/functions/v1/alma-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "check_mode" }),
    });

    const res = await gestionnaire(req);

    expect(res.status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("alma-payment — cas nominal", () => {
  it("action 'eligibility' avec réponse Alma OK → success:true, data transmise telle quelle", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ eligible: true, plans: [{ installments_count: 3 }] }), { status: 200 }),
    );

    const res = await gestionnaire(makeRequest({ action: "eligibility", amount: 10000 }));

    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.success).toBe(true);
    expect(corps.data).toEqual({ eligible: true, plans: [{ installments_count: 3 }] });
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/payments/eligibility");
  });
});

describe("alma-payment — cas d'erreur API Alma", () => {
  it("Alma répond une erreur (ex. 422) → 500, success:false, message d'erreur transmis", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "invalid amount" }), { status: 422 }),
    );

    const res = await gestionnaire(makeRequest({ action: "eligibility", amount: -1 }));

    expect(res.status).toBe(500);
    const corps = await res.json();
    expect(corps.success).toBe(false);
    expect(corps.error).toContain("Alma eligibility failed");
    expect(corps.error).toContain("invalid amount");
  });
});
