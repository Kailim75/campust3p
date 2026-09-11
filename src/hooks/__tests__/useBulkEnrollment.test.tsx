import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Session } from "../useSessions";

/**
 * Inscription groupée avec facturation automatique (défaut du 11/09/2026).
 *
 * Le hook générait les N numéros de facture AVANT toute insertion, puis
 * insérait les N factures d'un bloc. La RPC `generate_numero_facture` calcule
 * MAX(numéro de l'année) + 1 sur les lignes déjà en base : elle rendait donc N
 * fois le même numéro, l'insertion groupée tombait sur l'unicité de
 * `numero_facture`, et AUCUNE facture n'était créée — sans que l'écran le dise.
 *
 * Le client Supabase simulé reproduit les deux règles de la base qui font le
 * défaut : le calcul MAX + 1 de la RPC, et la contrainte UNIQUE (une insertion,
 * groupée ou non, est rejetée en bloc avec le code 23505).
 */

type Ligne = Record<string, unknown>;

const { base, toastMock } = vi.hoisted(() => ({
  base: {
    factures: [] as Ligne[],
    /** Chaque appel à `insert` sur `factures`, dans l'ordre. */
    tentatives: [] as Ligne[][],
    rpcEnErreur: false,
    /** Erreur renvoyée à toute insertion de facture (hors unicité). */
    refusInsertion: null as null | { code: string; message: string },
    /**
     * Rend vrai quand un autre utilisateur doit enregistrer une facture au
     * MÊME numéro juste avant cette tentative (création simultanée).
     */
    concurrence: null as null | ((lignes: Ligne[], rang: number) => boolean),
  },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/integrations/supabase/client", () => {
  // public.generate_numero_facture() : MAX(numéro de l'année) + 1 sur les
  // lignes DÉJÀ en base, sur quatre chiffres.
  const genererNumero = () => {
    const max = base.factures.reduce<number>((m, f) => {
      const r = /^FAC-2026-(\d+)$/.exec(String(f.numero_facture));
      return r ? Math.max(m, Number(r[1])) : m;
    }, 0);
    return `FAC-2026-${String(max + 1).padStart(4, "0")}`;
  };

  // factures.numero_facture TEXT NOT NULL UNIQUE : insertion atomique.
  const insererFactures = (valeurs: Ligne | Ligne[]) => {
    const lignes = Array.isArray(valeurs) ? valeurs : [valeurs];
    base.tentatives.push(lignes);
    if (base.refusInsertion) return { data: null, error: base.refusInsertion };
    if (base.concurrence?.(lignes, base.tentatives.length)) {
      base.factures.push({ numero_facture: lignes[0].numero_facture, contact_id: "autre-utilisateur" });
    }
    const pris = new Set(base.factures.map((f) => f.numero_facture));
    for (const ligne of lignes) {
      if (pris.has(ligne.numero_facture)) {
        return {
          data: null,
          error: {
            code: "23505",
            message: 'duplicate key value violates unique constraint "factures_numero_facture_key"',
          },
        };
      }
      pris.add(ligne.numero_facture);
    }
    base.factures.push(...lignes);
    return { data: null, error: null };
  };

  return {
    supabase: {
      rpc: (nom: string) => {
        if (nom !== "generate_numero_facture") throw new Error(`RPC inattendue : ${nom}`);
        if (base.rpcEnErreur) {
          return Promise.resolve({ data: null, error: { code: "42501", message: "permission denied" } });
        }
        return Promise.resolve({ data: genererNumero(), error: null });
      },
      from: (table: string) => {
        if (table === "session_inscriptions") {
          return {
            // Session vide : ni inscrit existant, ni doublon.
            select: (_colonnes: string, options?: { head?: boolean }) => ({
              eq: () =>
                Promise.resolve(options?.head ? { count: 0, error: null } : { data: [], error: null }),
            }),
            insert: (lignes: Ligne[]) => ({
              select: () =>
                Promise.resolve({
                  data: lignes.map((l) => ({ id: `insc-${String(l.contact_id)}`, ...l })),
                  error: null,
                }),
            }),
          };
        }
        if (table === "factures") {
          return { insert: (valeurs: Ligne | Ligne[]) => Promise.resolve(insererFactures(valeurs)) };
        }
        throw new Error(`Table inattendue : ${table}`);
      },
    },
  };
});

import { useBulkEnrollment, ESSAIS_MAX_NUMERO_FACTURE } from "../useBulkEnrollment";

const session = {
  id: "s1",
  nom: "Taxi septembre",
  prix: 990,
  places_totales: 12,
} as unknown as Session;

async function inscrire(contactIds = ["c1", "c2", "c3"]) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useBulkEnrollment(), { wrapper });
  let bilan: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
  await act(async () => {
    bilan = await result.current.mutateAsync({ sessionId: "s1", contactIds, session });
  });
  return bilan!;
}

const facturesDuHook = () => base.factures.filter((f) => f.contact_id !== "autre-utilisateur");

beforeEach(() => {
  base.factures = [];
  base.tentatives = [];
  base.rpcEnErreur = false;
  base.refusInsertion = null;
  base.concurrence = null;
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("useBulkEnrollment — facturation automatique", () => {
  it("trois apprenants : trois numéros distincts, trois factures, facturesCreated = 3", async () => {
    const bilan = await inscrire();

    expect(bilan.success).toEqual(["c1", "c2", "c3"]);
    expect(bilan.facturesCreated).toBe(3);
    expect(bilan.facturesEnEchec).toEqual([]);

    const numeros = facturesDuHook().map((f) => f.numero_facture);
    expect(numeros).toEqual(["FAC-2026-0001", "FAC-2026-0002", "FAC-2026-0003"]);

    // Ni le statut, ni les montants, ni les champs insérés ne changent.
    const aujourdhui = new Date().toISOString().split("T")[0];
    expect(facturesDuHook()).toEqual(
      ["c1", "c2", "c3"].map((c, i) => ({
        contact_id: c,
        session_inscription_id: `insc-${c}`,
        numero_facture: numeros[i],
        montant_total: 990,
        type_financement: "personnel",
        statut: "brouillon",
        date_emission: aujourdhui,
        commentaires: "Facture auto-générée pour la session: Taxi septembre",
      })),
    );

    expect(toastMock.error).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("3 facture(s) brouillon créée(s)");
  });

  it("violation d'unicité au deuxième : nouveau numéro, trois factures au final", async () => {
    // Un autre utilisateur enregistre une facture au numéro que le hook
    // s'apprête à insérer, juste avant la deuxième insertion.
    base.concurrence = (_lignes, rang) => rang === 2;

    const bilan = await inscrire();

    expect(bilan.facturesCreated).toBe(3);
    expect(bilan.facturesEnEchec).toEqual([]);
    expect(facturesDuHook().map((f) => f.contact_id)).toEqual(["c1", "c2", "c3"]);

    const numeros = facturesDuHook().map((f) => f.numero_facture);
    expect(new Set(numeros).size).toBe(3);
    expect(numeros).not.toContain("FAC-2026-0002"); // pris par l'autre utilisateur

    // c2 a été tenté deux fois (conflit, puis succès).
    const tentativesC2 = base.tentatives.filter((l) => l.some((f) => f.contact_id === "c2"));
    expect(tentativesC2).toHaveLength(2);
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("conflit persistant : essais bornés, échec remonté à l'appelant et affiché", async () => {
    base.concurrence = (lignes) => lignes.some((f) => f.contact_id === "c2");

    const bilan = await inscrire();

    // Les inscriptions restent réussies ; seule la facture de c2 manque.
    expect(bilan.success).toEqual(["c1", "c2", "c3"]);
    expect(bilan.facturesCreated).toBe(2);
    expect(bilan.facturesEnEchec).toEqual(["c2"]);
    expect(facturesDuHook().map((f) => f.contact_id)).toEqual(["c1", "c3"]);

    const tentativesC2 = base.tentatives.filter((l) => l.some((f) => f.contact_id === "c2"));
    expect(tentativesC2).toHaveLength(ESSAIS_MAX_NUMERO_FACTURE);
    expect(ESSAIS_MAX_NUMERO_FACTURE).toBeGreaterThan(1);

    expect(toastMock.error).toHaveBeenCalledTimes(1);
    expect(toastMock.error.mock.calls[0][0]).toBe("Facture non créée pour 1 stagiaire(s)");
    expect(toastMock.error.mock.calls[0][1].description).toContain("2 facture(s) brouillon créée(s) sur 3");
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("numéro impossible à générer : aucune facture, tous les échecs remontés", async () => {
    base.rpcEnErreur = true;

    const bilan = await inscrire();

    expect(bilan.facturesCreated).toBe(0);
    expect(bilan.facturesEnEchec).toEqual(["c1", "c2", "c3"]);
    expect(base.tentatives).toHaveLength(0);
    expect(toastMock.error).toHaveBeenCalledTimes(1);
    expect(toastMock.error.mock.calls[0][0]).toBe("Facture non créée pour 3 stagiaire(s)");
  });

  it("refus hors unicité (droits) : pas de nouvel essai inutile, échec remonté", async () => {
    base.refusInsertion = { code: "42501", message: "new row violates row-level security policy" };

    const bilan = await inscrire();

    expect(bilan.facturesCreated).toBe(0);
    expect(bilan.facturesEnEchec).toEqual(["c1", "c2", "c3"]);
    expect(base.tentatives).toHaveLength(3); // une seule tentative par facture
    expect(toastMock.error).toHaveBeenCalledTimes(1);
  });
});
