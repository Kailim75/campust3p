import { describe, it, expect, vi, beforeAll } from "vitest";

/**
 * F8 (11/09/2026) — api-v1, DELETE /factures/:id, exécutée dans un faux Deno.
 * Un refus de la base (garde des factures émises) doit parvenir à
 * l'intégrateur avec son motif, et non derrière « Suppression impossible ».
 */

const REFUS =
  "Mise à la corbeille refusée : la facture FAC-2026-0502 est émise (statut « Émise »). Une facture émise ne se supprime pas.";

const { etat } = vi.hoisted(() => ({
  etat: { gestionnaire: null as null | ((req: Request) => Promise<Response>) },
}));

vi.mock("https://deno.land/std@0.168.0/http/server.ts", () => ({
  serve: (h: (req: Request) => Promise<Response>) => {
    etat.gestionnaire = h;
  },
}));

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: () => ({
    rpc: async () => ({ data: "centre-1", error: null }),
    from: () => ({
      // verifyRecordInCentre
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { centre_id: "centre-1" }, error: null }) }),
      }),
      // mise à la corbeille
      update: () => ({
        eq: () => ({ is: async () => ({ error: { message: REFUS, code: "P0001" } }) }),
      }),
    }),
  }),
}));

beforeAll(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (nom: string) => (nom === "SUPABASE_URL" ? "https://projet.supabase.co" : "cle") },
  };
  // Chemin en variable : tsc (tsconfig.app.json) ne suit pas ce code Deno.
  const fonction = "../../../supabase/functions/api-v1/index.ts";
  await import(/* @vite-ignore */ fonction);
});

describe("api-v1 — DELETE d'une facture refusé par la base", () => {
  it("renvoie le motif de la base", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(etat.gestionnaire).not.toBeNull();

    const reponse = await etat.gestionnaire!(
      new Request("https://projet.supabase.co/functions/v1/api-v1/factures/f1", {
        method: "DELETE",
        headers: { "x-api-key": "ct3p_cle_de_test" },
      }),
    );

    expect(reponse.status).toBe(400);
    const corps = (await reponse.json()) as { error: string };
    expect(corps.error).toBe(REFUS);
  });
});
