import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

/**
 * alma-webhook (edge function Deno) — chaîne de paiement Alma, 15/09/2026.
 *
 * Couvre : vérification de signature HMAC, parsing du payload webhook,
 * décision de statut de paiement (état renvoyé par l'API Alma), et les
 * branches qui répondent HTTP 200 malgré une erreur interne (Alma exige un
 * 200 pour ne pas re-livrer indéfiniment le webhook — voir commentaires
 * ci-dessous).
 *
 * Harnais faux-Deno identique à execute-workflow-echec-action.test.ts /
 * submit-pdp-simulee.test.ts : les imports distants sont mockés, `Deno` est
 * un faux global, et le fichier est chargé via un chemin en variable pour
 * que tsc (tsconfig.app.json) ne suive pas ce code Deno.
 *
 * Comportement surprenant découvert en lisant le code (documenté, pas un
 * bug — voir le commentaire de `verifyAlmaSignature` dans le fichier de
 * prod) : secret absent OU en-tête de signature absent sont tous deux
 * ACCEPTÉS en « mode dégradé », pas rejetés. La sécurité est alors déléguée
 * à la re-vérification du paiement auprès de l'API Alma, plus loin dans le
 * handler. Les tests ci-dessous vérifient le comportement réel, pas une
 * intuition de rejet.
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
vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({ createClient }));

type Gestionnaire = (req: Request) => Promise<Response>;
type VerifResult = { ok: boolean; reason?: string };
let gestionnaire: Gestionnaire;
let verifyAlmaSignature: (rawBody: string, signature: string | null) => Promise<VerifResult>;

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
  const chemin = "../../../supabase/functions/alma-webhook/index.ts";
  const mod = await import(/* @vite-ignore */ chemin);
  verifyAlmaSignature = mod.verifyAlmaSignature;
  expect(serveState.handler).not.toBeNull();
  gestionnaire = serveState.handler!;
});

beforeEach(() => {
  setEnv({});
  createClient.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function hmacHex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("https://projet.supabase.co/functions/v1/alma-webhook", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("alma-webhook — verifyAlmaSignature (HMAC-SHA256)", () => {
  const body = '{"payment_id":"pay_123"}';

  it("secret absent → ACCEPTÉ en mode dégradé (pas rejeté : la garantie vient de la re-vérification API Alma)", async () => {
    setEnv({}); // ALMA_WEBHOOK_SECRET absent
    const r = await verifyAlmaSignature(body, "peu-importe");
    expect(r.ok).toBe(true);
    expect(r.reason).toBe("no_secret_configured");
  });

  it("en-tête x-alma-signature absent (secret configuré) → ACCEPTÉ en mode dégradé IPN", async () => {
    setEnv({ ALMA_WEBHOOK_SECRET: "s3cret" });
    const r = await verifyAlmaSignature(body, null);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe("no_signature_header_ipn_mode");
  });

  it("HMAC incorrect → rejeté", async () => {
    setEnv({ ALMA_WEBHOOK_SECRET: "s3cret" });
    const mauvaiseSignature = await hmacHex("un-autre-secret", body);
    const r = await verifyAlmaSignature(body, mauvaiseSignature);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("signature_mismatch");
  });

  it("HMAC correct → accepté", async () => {
    setEnv({ ALMA_WEBHOOK_SECRET: "s3cret" });
    const bonneSignature = await hmacHex("s3cret", body);
    const r = await verifyAlmaSignature(body, bonneSignature);
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it("HMAC correct avec préfixe 'sha256=' et casse différente → accepté (comparaison normalisée)", async () => {
    setEnv({ ALMA_WEBHOOK_SECRET: "s3cret" });
    const bonneSignature = await hmacHex("s3cret", body);
    const r = await verifyAlmaSignature(body, `sha256=${bonneSignature.toUpperCase()}`);
    expect(r.ok).toBe(true);
  });
});

describe("alma-webhook — parsing du payload webhook", () => {
  it("JSON valide → payment_id correctement extrait (requête envoyée à l'API Alma avec cet identifiant)", async () => {
    setEnv({
      ALMA_API_KEY: "sk_test_xxx",
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "srv",
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ message: "not found" }), { status: 404 }));

    const res = await gestionnaire(makeRequest(JSON.stringify({ payment_id: "pay_json_ok" })));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/payments/pay_json_ok");
    // Alma API a répondu 404 → branche « vérification échouée » (voir section dédiée plus bas).
    expect(res.status).toBe(200);
  });

  it("JSON malformé → géré proprement, pas de crash, et aucun appel à l'API Alma", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await gestionnaire(makeRequest("{not valid json"));

    expect(res.status).toBe(200);
    const corps = await res.json();
    // Ni JSON.parse ni le repli URLSearchParams ne trouvent de payment_id/id
    // dans cette chaîne : la fonction s'arrête proprement avant tout appel réseau.
    expect(corps.status).toBe("ignored");
    expect(corps.reason).toBe("no_payment_id");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("alma-webhook — décision de statut de paiement (état renvoyé par l'API Alma)", () => {
  it("état 'paid' → traité comme paiement à enregistrer (ici : idempotence, déjà enregistré)", async () => {
    setEnv({ ALMA_API_KEY: "sk_test_xxx" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          state: "paid",
          custom_data: { facture_id: "fact_1" },
          purchase_amount: 12300,
          installments_count: 3,
        }),
        { status: 200 },
      ),
    );
    const maybeSingle = vi.fn(async () => ({ data: { id: "paiement_existant" }, error: null }));
    const eq2 = vi.fn(() => ({ maybeSingle }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    const select = vi.fn(() => ({ eq: eq1 }));
    createClient.mockReturnValue({ from: vi.fn(() => ({ select })) });

    const res = await gestionnaire(makeRequest(JSON.stringify({ payment_id: "pay_paid" })));

    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.status).toBe("already_recorded");
    expect(corps.id).toBe("paiement_existant");
    expect(eq2).toHaveBeenCalledWith("reference", "ALMA-pay_paid");
  });

  it("état différent de 'paid'/'in_progress' (ex. expired = paiement non abouti) → ignoré, aucune écriture en base", async () => {
    setEnv({ ALMA_API_KEY: "sk_test_xxx" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ state: "expired" }), { status: 200 }),
    );

    const res = await gestionnaire(makeRequest(JSON.stringify({ payment_id: "pay_expired" })));

    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.status).toBe("ignored");
    expect(corps.state).toBe("expired");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("surprenant : l'état 'in_progress' (paiement pas encore soldé) est traité EXACTEMENT comme 'paid', pas comme un échec", async () => {
    setEnv({ ALMA_API_KEY: "sk_test_xxx" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          state: "in_progress",
          custom_data: { facture_id: "fact_3" },
          purchase_amount: 4500,
          installments_count: 4,
        }),
        { status: 200 },
      ),
    );
    const maybeSingle = vi.fn(async () => ({ data: { id: "paiement_deja_la" }, error: null }));
    const eq2 = vi.fn(() => ({ maybeSingle }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    const select = vi.fn(() => ({ eq: eq1 }));
    createClient.mockReturnValue({ from: vi.fn(() => ({ select })) });

    const res = await gestionnaire(makeRequest(JSON.stringify({ payment_id: "pay_in_progress" })));

    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.status).toBe("already_recorded");
  });
});

describe("alma-webhook — branches qui répondent HTTP 200 malgré une erreur interne", () => {
  // Volontaire dans les 3 cas ci-dessous : Alma exige un 200 pour ne pas
  // re-livrer indéfiniment le webhook (boucle de retries qui spamme sinon).
  // Le VRAI statut est porté par les champs `status`/`reason` du corps JSON,
  // pas par le code HTTP — c'est ce que chaque test vérifie explicitement.

  it("vérification API Alma échouée → HTTP 200, status interne 'error_logged' / reason 'alma_api_verify_failed'", async () => {
    setEnv({ ALMA_API_KEY: "sk_test_xxx" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "payment not found" }), { status: 404 }),
    );

    const res = await gestionnaire(makeRequest(JSON.stringify({ payment_id: "pay_verif_ko" })));

    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.status).toBe("error_logged");
    expect(corps.reason).toBe("alma_api_verify_failed");
    expect(corps.alma_status).toBe(404);
    expect(corps.payment_id).toBe("pay_verif_ko");
  });

  it("échec d'insertion en base → HTTP 200, status interne 'error_logged' / reason 'insert_failed'", async () => {
    setEnv({ ALMA_API_KEY: "sk_test_xxx" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          state: "paid",
          custom_data: { facture_id: "fact_2" },
          purchase_amount: 5000,
          installments_count: 1,
        }),
        { status: 200 },
      ),
    );
    const maybeSingle = vi.fn(async () => ({ data: null, error: null })); // pas encore enregistré
    const eq2 = vi.fn(() => ({ maybeSingle }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    const select = vi.fn(() => ({ eq: eq1 }));
    const single = vi.fn(async () => ({ data: null, error: { message: "colonne manquante" } }));
    const insertSelect = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: insertSelect }));
    createClient.mockReturnValue({ from: vi.fn(() => ({ select, insert })) });

    const res = await gestionnaire(makeRequest(JSON.stringify({ payment_id: "pay_insert_ko" })));

    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.status).toBe("error_logged");
    expect(corps.reason).toBe("insert_failed");
    expect(corps.error).toBe("colonne manquante");
    expect(corps.facture_id).toBe("fact_2");
  });

  it("erreur inattendue (catch-all, ex. panne réseau vers l'API Alma) → HTTP 200, status interne 'error_logged'", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("panne réseau"));

    const res = await gestionnaire(makeRequest(JSON.stringify({ payment_id: "pay_catchall" })));

    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.status).toBe("error_logged");
    expect(corps.error).toBe("panne réseau");
  });
});
