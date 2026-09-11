import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Les chemins qui INSÈRENT une facture déjà « emise » doivent y poser ses
 * coordonnées figées et ses totaux HT/TVA.
 *
 * `snapshot_facture_on_emission` (migration 20260519123424:100) est un
 * déclencheur BEFORE **UPDATE** : il ne s'exécute jamais pour ces
 * factures-là. Sans ce bloc, buyer_* et montant_ht restent NULL, la garde les
 * gèle définitivement, et toute réimpression suit la fiche vivante (D2).
 */

const { etat } = vi.hoisted(() => ({
  etat: {
    inserts: [] as { table: string; valeurs: Record<string, unknown> }[],
    contact: { prenom: "Jean", nom: "Dupont", email: "jean@example.fr", rue: "1 rue A", code_postal: "75001", ville: "Paris" },
    devis: {
      id: "d1",
      contact_id: "c1",
      numero_devis: "DEV-2026-0001",
      session_inscription_id: null,
      type_financement: "personnel",
      montant_total: 1200,
    } as Record<string, unknown>,
    devisLignes: [{ catalogue_formation_id: null, description: "Formation", quantite: 2, prix_unitaire_ht: 500, tva_percent: 20 }],
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/utils/getCentreId", () => ({ getUserCentreId: () => Promise.resolve("centre-1") }));
vi.mock("@/integrations/supabase/client", () => {
  const donneesDe = (table: string) => {
    if (table === "contacts") return etat.contact;
    if (table === "partners") return null;
    if (table === "devis") return etat.devis;
    if (table === "devis_lignes") return etat.devisLignes;
    return null;
  };
  const chaine = (table: string) => {
    const resultat = () => ({ data: donneesDe(table), error: null });
    const c: Record<string, unknown> = {
      single: () => Promise.resolve(resultat()),
      maybeSingle: () => Promise.resolve(resultat()),
      then: (resoudre: (v: unknown) => unknown) => resoudre(resultat()),
    };
    for (const methode of ["select", "eq", "is", "in", "order", "limit", "update"]) c[methode] = () => c;
    return c;
  };
  return {
    supabase: {
      from: (table: string) => ({
        ...chaine(table),
        insert: (valeurs: Record<string, unknown>) => {
          etat.inserts.push({ table, valeurs });
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: "facture-creee", ...valeurs }, error: null }) }),
            then: (resoudre: (v: unknown) => unknown) => resoudre({ data: null, error: null }),
          };
        },
      }),
      rpc: () => Promise.resolve({ data: "FAC-2026-0600", error: null }),
    },
  };
});

import { creerFactureExpress } from "@/lib/facture-express";
import { useConvertDevisToFacture } from "@/hooks/useDevis";

function enveloppe({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("factures créées directement « emise »", () => {
  beforeEach(() => {
    etat.inserts = [];
  });

  it("facturation express : acheteur figé et montants dans l'INSERT", async () => {
    await creerFactureExpress({ contactId: "c1", montant: 990, description: "Session VTC" });

    const facture = etat.inserts.find((i) => i.table === "factures");
    expect(facture?.valeurs).toMatchObject({
      statut: "emise",
      buyer_type: "b2c",
      buyer_name_snapshot: "Jean Dupont",
      buyer_address_snapshot: { line1: "1 rue A", postal_code: "75001", city: "Paris", country: "FR" },
      buyer_email_facturation: "jean@example.fr",
      montant_ht: 990,
      montant_tva: 0,
    });
  });

  it("conversion d'un devis : acheteur figé et totaux calculés depuis les lignes du devis", async () => {
    const { result } = renderHook(() => useConvertDevisToFacture(), { wrapper: enveloppe });
    result.current.mutate("d1");

    await waitFor(() => expect(etat.inserts.some((i) => i.table === "factures")).toBe(true));
    const facture = etat.inserts.find((i) => i.table === "factures");
    expect(facture?.valeurs).toMatchObject({
      statut: "emise",
      buyer_type: "b2c",
      buyer_name_snapshot: "Jean Dupont",
      buyer_email_facturation: "jean@example.fr",
      montant_ht: 1000,
      montant_tva: 200,
    });
  });
});
