import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

/**
 * Réparation RLS bucket "signatures" (15/09/2026) — edge function
 * portal-upload-signature, exécutée dans un faux Deno.
 *
 * Le portail apprenant est anonyme (jeton opaque, pas de session Supabase) :
 * le rôle anon n'a aucun droit sur le bucket privé "signatures" (policies
 * sig_* réservées à authenticated + admin/staff/super_admin, migration
 * 20260305171158). Cette edge function, en service_role, doit :
 *  - revalider le jeton elle-même (jamais faire confiance au contact_id
 *    envoyé par le client) ;
 *  - résoudre le centre depuis la session en base (jamais depuis une entrée
 *    client) ;
 *  - ne JAMAIS répondre succès si l'UPDATE de l'émargement n'a touché
 *    aucune ligne.
 */

const { reponses } = vi.hoisted(() => ({
  reponses: {
    token: { data: [{ contact_id: "contact-1", expire_at: "2999-01-01T00:00:00Z" }], error: null as unknown },
    emargement: { data: { id: "em-1", contact_id: "contact-1", session_id: "sess-1" }, error: null as unknown },
    session: { data: { centre_id: "centre-1" }, error: null as unknown },
    upload: { error: null as unknown },
    update: { data: [{ id: "em-1" }], error: null as unknown },
  },
}));

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: () => ({
    rpc: async () => reponses.token,
    from: (table: string) => {
      if (table === "emargements") {
        return {
          select: () => ({
            eq: () => ({ is: () => ({ maybeSingle: async () => reponses.emargement }) }),
          }),
          update: () => ({
            eq: () => ({ select: async () => reponses.update }),
          }),
        };
      }
      if (table === "sessions") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => reponses.session }) }) };
      }
      throw new Error(`table inattendue dans le test: ${table}`);
    },
    storage: { from: () => ({ upload: async () => reponses.upload }) },
  }),
}));

type Gestionnaire = (req: Request) => Promise<Response>;
let gestionnaire: Gestionnaire | null = null;

beforeAll(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    serve: (h: Gestionnaire) => {
      gestionnaire = h;
    },
    env: { get: () => "valeur-test" },
  };
  // Chemin en variable : tsc (tsconfig.app.json) ne suit pas ce code Deno.
  const fonction = "../../../supabase/functions/portal-upload-signature/index.ts";
  await import(/* @vite-ignore */ fonction);
});

function requete(corps: Record<string, unknown>): Request {
  return new Request("https://projet.supabase.co/functions/v1/portal-upload-signature", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://t3pcampus.net" },
    body: JSON.stringify(corps),
  });
}

const CORPS_VALIDE = { token: "jeton-valide", emargementId: "em-1", signatureDataBase64: "aGVsbG8=" };

describe("portal-upload-signature", () => {
  beforeEach(() => {
    reponses.token = {
      data: [{ contact_id: "contact-1", expire_at: "2999-01-01T00:00:00Z" }],
      error: null,
    };
    reponses.emargement = {
      data: { id: "em-1", contact_id: "contact-1", session_id: "sess-1" },
      error: null,
    };
    reponses.session = { data: { centre_id: "centre-1" }, error: null };
    reponses.upload = { error: null };
    reponses.update = { data: [{ id: "em-1" }], error: null };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("est bien installée comme gestionnaire", () => {
    expect(gestionnaire).not.toBeNull();
  });

  it("paramètres manquants → 400", async () => {
    const reponse = await gestionnaire!(requete({ token: "x" }));
    expect(reponse.status).toBe(400);
  });

  it("jeton invalide (aucune ligne renvoyée par la RPC) → 401", async () => {
    reponses.token = { data: [], error: null };
    const reponse = await gestionnaire!(requete(CORPS_VALIDE));
    expect(reponse.status).toBe(401);
  });

  it("jeton expiré → 401 explicite", async () => {
    reponses.token = {
      data: [{ contact_id: "contact-1", expire_at: "2020-01-01T00:00:00Z" }],
      error: null,
    };
    const reponse = await gestionnaire!(requete(CORPS_VALIDE));
    expect(reponse.status).toBe(401);
    const corps = (await reponse.json()) as { error: string };
    expect(corps.error).toMatch(/expiré/);
  });

  it("émargement d'un autre contact → 403 (le jeton ne prouve pas la propriété de N'IMPORTE QUEL émargement)", async () => {
    reponses.emargement = {
      data: { id: "em-1", contact_id: "autre-contact", session_id: "sess-1" },
      error: null,
    };
    const reponse = await gestionnaire!(requete(CORPS_VALIDE));
    expect(reponse.status).toBe(403);
  });

  it("chemin de succès : upload dans signatures/<centre_id résolu en base>/emargements/…", async () => {
    const reponse = await gestionnaire!(requete(CORPS_VALIDE));
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as { success: boolean; path: string };
    expect(corps.success).toBe(true);
    expect(corps.path).toMatch(/^centre-1\/emargements\/em-1_\d+\.png$/);
  });

  it("l'UPDATE touche 0 ligne → échec explicite, jamais un succès muet", async () => {
    reponses.update = { data: [], error: null };
    const reponse = await gestionnaire!(requete(CORPS_VALIDE));
    expect(reponse.status).toBe(500);
    const corps = (await reponse.json()) as { success: boolean; error: string };
    expect(corps.success).toBe(false);
    expect(corps.error).toMatch(/mis à jour/);
  });
});
