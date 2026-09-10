import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Deux régressions verrouillées ici (relecture d'intégration du 10/09/2026),
 * nées toutes deux de l'exclusion des factures brouillon des totaux :
 *
 * B2 — le formulaire de versement listait TOUTES les factures et
 *      pré-sélectionnait l'unique existante, brouillon compris. La secrétaire
 *      saisissait 500 €, la ligne apparaissait dans « Versements », et « Payé »
 *      restait à 0 € : `sommePaiementsFactures` écarte les versements rattachés
 *      à une facture non comptée.
 * B3 — un apprenant n'ayant qu'un brouillon de 990 € affichait
 *      « 0 € facturé / 0 € payé / 0 € restant — Soldé », là où il doit encore
 *      990 €. Inversion de vérité comptable, corrigée par un troisième état.
 */

const { etat } = vi.hoisted(() => ({
  etat: {
    factures: [] as Record<string, unknown>[],
    paiements: [] as Record<string, unknown>[],
    inserts: [] as { table: string; valeurs: Record<string, unknown> }[],
  },
}));

vi.mock("@/integrations/supabase/client", () => {
  const donneesDe = (table: string) => {
    if (table === "factures") return etat.factures;
    if (table === "paiements") return etat.paiements;
    if (table === "contacts") {
      return {
        nom: "KARAI", prenom: "Sofia", email: "sofia@exemple.fr",
        telephone: null, rue: null, code_postal: null, ville: null,
      };
    }
    return [];
  };

  const chaine = (table: string) => {
    const resultat = () => ({ data: donneesDe(table), error: null });
    const c: Record<string, unknown> = {
      single: () => Promise.resolve(resultat()),
      then: (resoudre: (v: unknown) => unknown) => resoudre(resultat()),
    };
    for (const methode of ["select", "eq", "is", "in", "order", "limit"]) {
      c[methode] = () => c;
    }
    return c;
  };

  return {
    supabase: {
      from: (table: string) => ({
        ...chaine(table),
        insert: (valeurs: Record<string, unknown>) => {
          etat.inserts.push({ table, valeurs });
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: "facture-creee" }, error: null }),
            }),
            then: (resoudre: (v: unknown) => unknown) => resoudre({ data: null, error: null }),
          };
        },
      }),
      rpc: () => Promise.resolve({ data: "FAC-TEST-001", error: null }),
    },
  };
});

// Surfaces hors périmètre : elles interrogent Supabase ou génèrent des PDF.
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/hooks/useCentreFormation", () => ({ useCentreFormation: () => ({ centreFormation: null }) }));
vi.mock("@/hooks/useEmailComposer", () => ({
  useEmailComposer: () => ({ composerProps: { open: false, onOpenChange: () => {} }, openComposer: vi.fn() }),
}));
vi.mock("@/components/email/EmailComposerModal", () => ({ EmailComposerModal: () => null }));
vi.mock("@/components/paiements/FactureLibreDialog", () => ({ FactureLibreDialog: () => null }));
vi.mock("@/components/paiements/EditFactureLibreDialog", () => ({ EditFactureLibreDialog: () => null }));
vi.mock("../FinancementSection", () => ({ FinancementSection: () => null }));
vi.mock("@/lib/facture-express", () => ({ creerFactureExpress: vi.fn() }));
vi.mock("@/utils/getCentreId", () => ({ getUserCentreId: () => Promise.resolve("centre-1") }));
vi.mock("@/lib/pdf-generator", () => ({
  generateFacturePDF: () => ({ save: () => {}, output: () => "data:application/pdf;base64,XX" }),
}));

import { PaiementsTab } from "../PaiementsTab";

const brouillon = {
  id: "f-brouillon", numero_facture: "FAC-2026-0007", montant_total: 990,
  statut: "brouillon", type_financement: "personnel", date_emission: null, commentaires: null,
};
const emise = {
  id: "f-emise", numero_facture: "FAC-2026-0008", montant_total: 500,
  statut: "emise", type_financement: "personnel", date_emission: null, commentaires: null,
};

function afficher() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PaiementsTab contactId="c1" />
    </QueryClientProvider>,
  );
}

async function ouvrirLeFormulaire() {
  fireEvent.click(await screen.findByRole("button", { name: /Ajouter un versement/ }));
}

describe("PaiementsTab — état du solde (B3)", () => {
  beforeEach(() => {
    etat.factures = [];
    etat.paiements = [];
    etat.inserts = [];
  });

  it("n'annonce pas « Soldé » quand la seule facture est un brouillon", async () => {
    etat.factures = [brouillon];

    afficher();

    expect(await screen.findByText("Rien à encaisser")).toBeInTheDocument();
    expect(screen.queryByText("Soldé")).toBeNull();
    expect(screen.queryByText("Impayé")).toBeNull();
  });

  it("annonce « Impayé » sur une facture émise non réglée", async () => {
    etat.factures = [emise];

    afficher();

    expect(await screen.findByText("Impayé")).toBeInTheDocument();
    expect(screen.queryByText("Rien à encaisser")).toBeNull();
  });

  it("n'annonce « Soldé » qu'une fois la créance réelle éteinte", async () => {
    etat.factures = [emise];
    etat.paiements = [{
      id: "p1", facture_id: "f-emise", montant: 500,
      mode_paiement: "cb", reference: null, date_paiement: null,
    }];

    afficher();

    expect(await screen.findByText("Soldé")).toBeInTheDocument();
  });
});

describe("PaiementsTab — versement rattaché à la bonne facture (B2)", () => {
  beforeEach(() => {
    etat.factures = [];
    etat.paiements = [];
    etat.inserts = [];
  });

  it("bloque la saisie quand aucune facture n'est encaissable", async () => {
    etat.factures = [brouillon];

    afficher();
    await ouvrirLeFormulaire();

    expect(screen.getByText(/Aucune facture à encaisser/)).toBeInTheDocument();
    // Ni champ de montant ni bouton d'enregistrement : rien ne peut partir
    // sur un brouillon.
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("button", { name: "Enregistrer" })).toBeNull();
  });

  it("pré-sélectionne la facture émise et non le brouillon en tête de liste", async () => {
    // Ordre volontaire : le brouillon est premier, c'est lui que l'ancien
    // `factures[0]` attrapait.
    etat.factures = [brouillon, emise];

    afficher();
    await ouvrirLeFormulaire();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "500" } });

    const enregistrer = screen.getByRole("button", { name: "Enregistrer" });
    expect(enregistrer).toBeEnabled();
    fireEvent.click(enregistrer);

    await waitFor(() => {
      expect(etat.inserts.some((i) => i.table === "paiements")).toBe(true);
    });
    const versement = etat.inserts.find((i) => i.table === "paiements");
    expect(versement?.valeurs.facture_id).toBe("f-emise");
    expect(versement?.valeurs.montant).toBe(500);
    // Aucune facture ne doit avoir été créée au passage (risque de doublon).
    expect(etat.inserts.some((i) => i.table === "factures")).toBe(false);
  });

  it("laisse créer une facture quand l'apprenant n'en a aucune", async () => {
    afficher();
    await ouvrirLeFormulaire();

    // Rien à encaisser, mais le chemin « Créer une nouvelle facture » (qui
    // émet une facture comptée) reste ouvert : pas de message de blocage.
    expect(screen.queryByText(/Aucune facture à encaisser/)).toBeNull();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });
});
