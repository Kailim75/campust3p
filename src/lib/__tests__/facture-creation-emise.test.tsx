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
    echecLignes: false,
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
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
          const refus = table === "facture_lignes" && etat.echecLignes ? { message: "Ajout de ligne refusé" } : null;
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: "facture-creee", ...valeurs }, error: null }) }),
            then: (resoudre: (v: unknown) => unknown) => resoudre({ data: null, error: refus }),
          };
        },
      }),
      rpc: () => Promise.resolve({ data: "FAC-2026-0600", error: null }),
    },
  };
});

import { toast } from "sonner";
import { creerFactureExpress } from "@/lib/facture-express";
import { useConvertDevisToFacture } from "@/hooks/useDevis";

function enveloppe({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("factures créées directement « emise »", () => {
  beforeEach(() => {
    etat.inserts = [];
    etat.echecLignes = false;
    vi.mocked(toast.warning).mockClear();
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

  it("les cinq chemins posent la date d'émission ET la mention d'exonération (D5)", async () => {
    // Le déclencheur (BEFORE UPDATE) ne passera jamais sur ces factures : sans
    // ces deux valeurs, elles restent à jamais sans date d'émission (anomalie
    // bloquante INVOICE_DATE) ni mention de TVA, et la garde refuse ensuite
    // toute réparation.
    await creerFactureExpress({ contactId: "c1", montant: 990, description: "Session VTC" });
    const express = etat.inserts.find((i) => i.table === "factures");
    expect(express?.valeurs).toMatchObject({
      date_emission: new Date().toISOString().slice(0, 10),
      motif_exoneration_tva: "TVA non applicable, art. 261-4-4°a du CGI",
    });

    etat.inserts = [];
    const { result } = renderHook(() => useConvertDevisToFacture(), { wrapper: enveloppe });
    result.current.mutate("d1");
    await waitFor(() => expect(etat.inserts.some((i) => i.table === "factures")).toBe(true));
    expect(etat.inserts.find((i) => i.table === "factures")?.valeurs).toMatchObject({
      date_emission: new Date().toISOString().slice(0, 10),
      motif_exoneration_tva: "TVA non applicable, art. 261-4-4°a du CGI",
    });
  });

  it("facturation express : ligne refusée, le message dit de réessayer tout de suite", async () => {
    // La facture émise existe avec ses montants figés ; la garde ne laisse
    // rattraper ses lignes que dans les quinze minutes. Jusqu'ici l'échec
    // n'était qu'un console.error : l'utilisateur ne savait rien.
    etat.echecLignes = true;
    await creerFactureExpress({ contactId: "c1", montant: 990, description: "Session VTC" });

    expect(toast.warning).toHaveBeenCalledWith(expect.stringMatching(/réessayez immédiatement/));
  });

  it("conversion d'un devis : lignes refusées → avertissement, devis converti, aucune seconde facture", async () => {
    // La facture émise a bien été créée ; ses lignes échouent. La conversion ne
    // doit PAS être relancée en erreur : sinon le devis n'est pas marqué
    // « converti » et un second essai fabrique une deuxième facture émise
    // indestructible. On avertit, et le devis passe quand même « converti ».
    vi.mocked(toast.error).mockClear();
    etat.echecLignes = true;
    const { result } = renderHook(() => useConvertDevisToFacture(), { wrapper: enveloppe });
    await result.current.mutateAsync("d1");

    const facturesCreees = etat.inserts.filter((i) => i.table === "factures");
    expect(facturesCreees).toHaveLength(1);
    expect(toast.warning).toHaveBeenCalledWith(expect.stringMatching(/réessayez immédiatement/));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
