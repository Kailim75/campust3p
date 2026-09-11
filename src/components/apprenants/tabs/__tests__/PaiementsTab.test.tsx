import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

vi.mock("@/components/ui/select", () => import("@/test/select-natif"));
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

  /**
   * Le double projette le tiers payeur sur les colonnes RÉELLEMENT demandées
   * par le select : sans cela, une requête qui oublie `siret` recevrait quand
   * même le SIRET du fixture et aucun test ne pourrait voir le défaut.
   */
  const projeter = (table: string, donnees: unknown, colonnes: string) => {
    if (table !== "factures" || !Array.isArray(donnees)) return donnees;
    const bloc = /payeur_partner:[^(]*\(([^)]*)\)/.exec(colonnes || "");
    if (!bloc) return donnees;
    const champs = bloc[1].split(",").map((c) => c.trim());
    return donnees.map((facture: Record<string, unknown>) => {
      const inscription = facture.session_inscription as Record<string, unknown> | undefined;
      const payeur = inscription?.payeur_partner as Record<string, unknown> | undefined;
      if (!inscription || !payeur) return facture;
      const projete: Record<string, unknown> = {};
      for (const champ of champs) if (champ in payeur) projete[champ] = payeur[champ];
      return { ...facture, session_inscription: { ...inscription, payeur_partner: projete } };
    });
  };

  const chaine = (table: string) => {
    let colonnes = "";
    const resultat = () => ({ data: projeter(table, donneesDe(table), colonnes), error: null });
    const c: Record<string, unknown> = {
      single: () => Promise.resolve(resultat()),
      maybeSingle: () => Promise.resolve(resultat()),
      then: (resoudre: (v: unknown) => unknown) => resoudre(resultat()),
    };
    c.select = (cols?: unknown) => {
      if (typeof cols === "string") colonnes = cols;
      return c;
    };
    for (const methode of ["eq", "is", "in", "order", "limit"]) {
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
const { generateFacturePDF } = vi.hoisted(() => ({
  generateFacturePDF: vi.fn((..._args: unknown[]) => ({ save: () => {}, output: () => "data:application/pdf;base64,XX" })),
}));
vi.mock("@/lib/pdf-generator", () => ({ generateFacturePDF }));

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

  it("la facture créée par un versement naît émise AVEC ses coordonnées figées", async () => {
    // `snapshot_facture_on_emission` est un BEFORE UPDATE : cette facture,
    // insérée déjà « emise », n'y passera jamais. Sans coordonnées figées dans
    // l'INSERT, toute réimpression suivrait la fiche apprenant du jour.
    afficher();
    await ouvrirLeFormulaire();
    const selectFacture = screen
      .getAllByTestId("select-natif")
      .find((s) => within(s).queryByText(/Créer une nouvelle facture/)) as HTMLSelectElement;
    fireEvent.change(selectFacture, { target: { value: "__new__" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "990" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer facture & enregistrer" }));

    await waitFor(() => expect(etat.inserts.some((i) => i.table === "factures")).toBe(true));
    const facture = etat.inserts.find((i) => i.table === "factures");
    expect(facture?.valeurs).toMatchObject({
      statut: "emise",
      buyer_type: "b2c",
      buyer_name_snapshot: "Sofia KARAI",
      buyer_email_facturation: "sofia@exemple.fr",
      montant_ht: 990,
      montant_tva: 0,
      // D5 : le déclencheur (BEFORE UPDATE) ne posera jamais ni la date
      // d'émission ni la mention d'exonération sur une facture née émise.
      date_emission: new Date().toISOString().slice(0, 10),
      motif_exoneration_tva: "TVA non applicable, art. 261-4-4°a du CGI",
    });
  });
});

/**
 * F5 (11/09/2026) — le PDF d'une facture émise imprime l'acheteur figé à
 * l'émission (buyer_*), et non la fiche contact telle qu'elle est aujourd'hui.
 */
describe("PaiementsTab — PDF d'une facture émise (F5)", () => {
  beforeEach(() => {
    etat.factures = [];
    etat.paiements = [];
    etat.inserts = [];
    generateFacturePDF.mockClear();
  });

  it("imprime les coordonnées figées de l'acheteur, pas la fiche courante", async () => {
    etat.factures = [{
      ...emise,
      contact_id: "c1",
      buyer_type: "b2c",
      buyer_name_snapshot: "Sofia Karai-Figée",
      buyer_address_snapshot: { line1: "3 rue Figée", postal_code: "92120", city: "Montrouge", country: "FR" },
      buyer_email_facturation: "figee@exemple.fr",
    }];

    afficher();
    const bouton = await screen.findByTitle("Télécharger PDF");
    // La fiche contact se charge en parallèle des factures : on reclique tant
    // qu'elle n'est pas là (le clic sans fiche ne génère rien).
    await waitFor(() => {
      fireEvent.click(bouton);
      expect(generateFacturePDF).toHaveBeenCalled();
    });

    expect(generateFacturePDF.mock.calls[0][1]).toMatchObject({
      prenom: "Sofia Karai-Figée",
      nom: "",
      rue: "3 rue Figée",
      code_postal: "92120",
      ville: "Montrouge",
      email: "figee@exemple.fr",
    });
  });

  it("la pièce jointe envoyée par email porte le MÊME acheteur figé", async () => {
    // Chemin distinct du téléchargement (buildFacturePdfBase64) : il n'était
    // retenu par aucune assertion, une mutation ciblée passait au vert.
    etat.factures = [{
      ...emise,
      contact_id: "c1",
      buyer_type: "b2c",
      buyer_name_snapshot: "Sofia Karai-Figée",
      buyer_address_snapshot: { line1: "3 rue Figée", postal_code: "92120", city: "Montrouge", country: "FR" },
      buyer_email_facturation: "figee@exemple.fr",
    }];

    afficher();
    const bouton = await screen.findByTitle("Envoyer par email");
    await waitFor(() => {
      fireEvent.click(bouton);
      expect(generateFacturePDF).toHaveBeenCalled();
    });

    expect(generateFacturePDF.mock.calls[0][1]).toMatchObject({
      prenom: "Sofia Karai-Figée",
      nom: "",
      rue: "3 rue Figée",
      email: "figee@exemple.fr",
    });
  });

  it("tiers payeur : le PDF porte son SIRET et sa TVA intracommunautaire", async () => {
    // Sans `siret, tva_intracom` dans le select du tiers payeur, extractPayerInfo
    // ne peut rien remonter : la même facture sortait AVEC ces mentions depuis
    // la fiche facture et SANS depuis l'onglet Paiements — deux documents
    // comptables différents pour une seule pièce figée.
    etat.factures = [{
      ...emise,
      contact_id: "c1",
      buyer_type: "b2c",
      buyer_name_snapshot: "Sofia Karai-Figée",
      buyer_address_snapshot: { line1: "3 rue Figée", postal_code: "92120", city: "Montrouge", country: "FR" },
      buyer_email_facturation: "figee@exemple.fr",
      session_inscription: {
        id: "si1",
        type_payeur: "opco",
        montant_pris_en_charge: 500,
        reste_a_charge: 0,
        payeur_partner: {
          id: "p1",
          company_name: "OPCO Mobilités",
          email: "compta@opco.fr",
          address: "10 avenue des OPCO",
          siret: "44455566600011",
          tva_intracom: "FR30444555666",
        },
        session: null,
      },
    }];

    afficher();
    const bouton = await screen.findByTitle("Télécharger PDF");
    await waitFor(() => {
      fireEvent.click(bouton);
      expect(generateFacturePDF).toHaveBeenCalled();
    });

    expect((generateFacturePDF.mock.calls[0][0] as { payer?: Record<string, unknown> }).payer).toMatchObject({
      company_name: "OPCO Mobilités",
      siret: "44455566600011",
      tva_intracom: "FR30444555666",
    });
  });
});
