import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

/**
 * Totaux financiers de la page Sessions.
 *
 * Ce hook n'avait aucun test alors que toute son arithmétique repose sur un
 * point fragile : les versements arrivent IMBRIQUÉS sous leur facture
 * (`factures.paiements`), sans `facture_id`, et le hook reconstruit ce
 * rattachement avant de sommer. Si cette reconstruction casse, tous les
 * « CA sécurisé » de la page retombent silencieusement à 0 €. Le cas « facture
 * émise partiellement payée » ci-dessous est le garde-fou : il rougit dès que
 * `facture_id` n'est plus reporté.
 *
 * La règle vérifiée par ailleurs : une facture en BROUILLON ou ANNULÉE ne
 * compte ni au facturé ni au payé, et le versement qui y est rattaché non plus.
 */

const etat = vi.hoisted(() => ({
  reponse: { data: [] as unknown[] | null, error: null as unknown },
}));

// postgrest-js : le builder est chaînable ET « thenable ».
vi.mock("@/integrations/supabase/client", () => {
  const methodes = ["select", "eq", "in", "is", "not", "order", "limit"];
  const builder = () => {
    const b: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(etat.reponse).then(resolve, reject),
    };
    methodes.forEach((m) => {
      b[m] = () => b;
    });
    return b;
  };
  return { supabase: { from: () => builder() } };
});

import { useSessionFinancials, type SessionFinancialData } from "../useSessionFinancials";

interface PaiementImbrique {
  montant: number | string | null;
}

interface FactureImbriquee {
  id: string;
  montant_total: number | string | null;
  statut: string | null;
  date_echeance?: string | null;
  paiements?: PaiementImbrique[] | null;
}

interface InscriptionLigne {
  session_id: string;
  factures?: FactureImbriquee[] | null;
}

/** Monte le hook sur un jeu d'inscriptions et renvoie la map par session. */
async function charger(
  inscriptions: InscriptionLigne[],
): Promise<Record<string, SessionFinancialData>> {
  etat.reponse = { data: inscriptions, error: null };

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);

  const { result } = renderHook(() => useSessionFinancials(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result.current.data as Record<string, SessionFinancialData>;
}

beforeEach(() => {
  etat.reponse = { data: [], error: null };
});

describe("useSessionFinancials", () => {
  it("rattache le versement imbriqué à sa facture émise partiellement payée", async () => {
    const map = await charger([
      {
        session_id: "S1",
        factures: [
          {
            id: "F1",
            montant_total: 1000,
            statut: "emise",
            date_echeance: null,
            paiements: [{ montant: 400 }],
          },
        ],
      },
    ]);

    // Le cœur du garde-fou : 400 € ne peuvent être comptés que si `facture_id`
    // a bien été reconstruit depuis la relation imbriquée.
    expect(map.S1.total_paye).toBe(400);
    expect(map.S1.ca_securise).toBe(400);
    expect(map.S1.total_facture).toBe(1000);
    expect(map.S1.ca_potentiel).toBe(1000);
    expect(map.S1.nb_inscriptions).toBe(1);
    expect(map.S1.nb_non_factures).toBe(0);
  });

  it("additionne plusieurs versements sur la même facture", async () => {
    const map = await charger([
      {
        session_id: "S1",
        factures: [
          {
            id: "F1",
            montant_total: 1000,
            statut: "partiel",
            paiements: [{ montant: 250 }, { montant: 150 }],
          },
        ],
      },
    ]);

    expect(map.S1.total_paye).toBe(400);
    expect(map.S1.nb_partiel).toBe(1);
  });

  it("ignore le brouillon et son versement, et compte l'inscription comme non facturée", async () => {
    const map = await charger([
      {
        session_id: "S1",
        factures: [
          {
            id: "F1",
            montant_total: 800,
            statut: "brouillon",
            paiements: [{ montant: 800 }],
          },
        ],
      },
    ]);

    // Un devis en brouillon n'est pas encore dû : ni facturé, ni encaissé.
    expect(map.S1.total_facture).toBe(0);
    expect(map.S1.ca_potentiel).toBe(0);
    expect(map.S1.total_paye).toBe(0);
    expect(map.S1.ca_securise).toBe(0);
    // Aucune facture COMPTÉE : l'inscrit doit apparaître comme non facturé.
    expect(map.S1.nb_inscriptions).toBe(1);
    expect(map.S1.nb_non_factures).toBe(1);
  });

  it("ignore la facture annulée et son versement", async () => {
    const map = await charger([
      {
        session_id: "S1",
        factures: [
          {
            id: "F1",
            montant_total: 600,
            statut: "annulee",
            paiements: [{ montant: 600 }],
          },
        ],
      },
    ]);

    expect(map.S1.total_facture).toBe(0);
    expect(map.S1.total_paye).toBe(0);
    expect(map.S1.nb_non_factures).toBe(1);
  });

  it("ne laisse pas l'acompte d'une annulée gonfler le payé d'une facture émise", async () => {
    const map = await charger([
      {
        session_id: "S1",
        factures: [
          { id: "F1", montant_total: 1000, statut: "emise", paiements: [{ montant: 300 }] },
          { id: "F2", montant_total: 500, statut: "annulee", paiements: [{ montant: 500 }] },
        ],
      },
    ]);

    // Le payé ne peut pas dépasser le facturé : 300 sur 1000.
    expect(map.S1.total_facture).toBe(1000);
    expect(map.S1.total_paye).toBe(300);
    expect(map.S1.nb_non_factures).toBe(0);
  });

  it("compte l'inscription sans aucune facture", async () => {
    const map = await charger([
      { session_id: "S1", factures: [] },
      { session_id: "S1", factures: null },
    ]);

    expect(map.S1.nb_inscriptions).toBe(2);
    expect(map.S1.nb_non_factures).toBe(2);
    expect(map.S1.total_facture).toBe(0);
  });

  it("agrège les inscriptions d'une même session et sépare les sessions", async () => {
    const map = await charger([
      {
        session_id: "S1",
        factures: [{ id: "F1", montant_total: 1000, statut: "emise", paiements: [{ montant: 400 }] }],
      },
      {
        session_id: "S1",
        factures: [{ id: "F2", montant_total: 500, statut: "payee", paiements: [{ montant: 500 }] }],
      },
      {
        session_id: "S2",
        factures: [{ id: "F3", montant_total: 200, statut: "emise", paiements: [] }],
      },
    ]);

    expect(map.S1.total_facture).toBe(1500);
    expect(map.S1.total_paye).toBe(900);
    expect(map.S1.nb_payes).toBe(1);
    expect(map.S2.total_facture).toBe(200);
    expect(map.S2.total_paye).toBe(0);
  });

  it("compte en retard une facture comptée échue avec un restant dû, jamais une annulée", async () => {
    const map = await charger([
      {
        session_id: "S1",
        factures: [
          {
            id: "F1",
            montant_total: 1000,
            statut: "emise",
            date_echeance: "2020-01-01",
            paiements: [{ montant: 400 }],
          },
          {
            id: "F2",
            montant_total: 900,
            statut: "annulee",
            date_echeance: "2020-01-01",
            paiements: [],
          },
          {
            id: "F3",
            montant_total: 300,
            statut: "payee",
            date_echeance: "2020-01-01",
            paiements: [{ montant: 300 }],
          },
        ],
      },
    ]);

    // F1 seule : F2 est hors assiette, F3 est soldée.
    expect(map.S1.nb_en_retard).toBe(1);
  });

  it("traite les montants renvoyés en chaîne par PostgREST", async () => {
    const map = await charger([
      {
        session_id: "S1",
        factures: [
          { id: "F1", montant_total: "1000.50", statut: "emise", paiements: [{ montant: "250.25" }] },
        ],
      },
    ]);

    expect(map.S1.total_facture).toBe(1000.5);
    expect(map.S1.total_paye).toBe(250.25);
  });
});
