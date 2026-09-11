import { describe, it, expect, vi, beforeAll } from "vitest";

/**
 * F6 (11/09/2026) — edge function submit-pdp, exécutée dans un faux Deno.
 * Tant que la PDP est simulée, TOUTE demande est refusée avant la moindre
 * lecture ou écriture : aucun client Supabase créé, aucun appel réseau.
 */

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({ createClient }));

type Gestionnaire = (req: Request) => Promise<Response>;
let gestionnaire: Gestionnaire | null = null;

beforeAll(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    serve: (h: Gestionnaire) => {
      gestionnaire = h;
    },
    env: { get: () => undefined },
  };
  // Chemin en variable : tsc (tsconfig.app.json) ne suit pas ce code Deno.
  const fonction = "../../../supabase/functions/submit-pdp/index.ts";
  await import(/* @vite-ignore */ fonction);
});

describe("submit-pdp — plateforme simulée", () => {
  it("refuse la transmission sans rien lire ni écrire, avec un message en français", async () => {
    const appelsReseau = vi.spyOn(globalThis, "fetch");
    expect(gestionnaire).not.toBeNull();

    const reponse = await gestionnaire!(
      new Request("https://projet.supabase.co/functions/v1/submit-pdp", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://t3pcampus.net", authorization: "Bearer jeton" },
        body: JSON.stringify({ facture_id: "f1", pdp_target: "ppf" }),
      }),
    );

    expect(reponse.status).toBe(501);
    const corps = (await reponse.json()) as { error: string };
    expect(corps.error).toMatch(/Aucune facture n'a été transmise/);
    expect(createClient).not.toHaveBeenCalled();
    expect(appelsReseau).not.toHaveBeenCalled();
  });
});
