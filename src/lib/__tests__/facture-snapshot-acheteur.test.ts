import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Coordonnées figées posées DÈS LA CRÉATION d'une facture née « emise ».
 *
 * Constat des relecteurs (banc PGlite) : `snapshot_facture_on_emission` est un
 * déclencheur BEFORE **UPDATE** (migration 20260519123424:100). Une facture
 * INSÉRÉE avec statut='emise' reçoit donc buyer_* et montant_ht à NULL, et la
 * garde les gèlera vides à jamais — le PDF suivrait alors la fiche vivante
 * (déménagement, fusion de doublons, changement de raison sociale).
 */

const { reponses, requetes } = vi.hoisted(() => ({
  reponses: { partners: null as unknown, contacts: null as unknown, erreur: null as unknown },
  requetes: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      requetes.push(table);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: table === "partners" ? reponses.partners : reponses.contacts,
              error: reponses.erreur,
            }),
          }),
        }),
      };
    },
  },
}));

import {
  blocFigeNouvelleFacture,
  coordonneesFigeesContact,
  coordonneesFigeesPartenaire,
  totauxFigesDepuisLignes,
} from "../facture-snapshot-acheteur";

describe("coordonnées figées de l'acheteur (création d'une facture émise)", () => {
  beforeEach(() => {
    reponses.partners = null;
    reponses.contacts = null;
    reponses.erreur = null;
    requetes.length = 0;
  });

  it("apprenant : nom « Prénom Nom », adresse jsonb de la même forme que le déclencheur", () => {
    expect(
      coordonneesFigeesContact({
        prenom: "Jean",
        nom: "Dupont",
        email: "jean@example.fr",
        rue: "1 rue A",
        code_postal: "75001",
        ville: "Paris",
      }),
    ).toEqual({
      buyer_type: "b2c",
      buyer_name_snapshot: "Jean Dupont",
      buyer_address_snapshot: { line1: "1 rue A", postal_code: "75001", city: "Paris", country: "FR" },
      buyer_email_facturation: "jean@example.fr",
      buyer_country: "FR",
    });
  });

  it("entreprise : SIRET et TVA intracommunautaire figés, e-mail de facturation prioritaire", () => {
    expect(
      coordonneesFigeesPartenaire({
        company_name: "OPCO Mobilités",
        email: "contact@opco.fr",
        email_facturation: "factures@opco.fr",
        address: "9 av Z",
        code_postal: "69000",
        ville: "Lyon",
        siret: "12345678900011",
        tva_intracom: "FR40123456789",
      }),
    ).toEqual({
      buyer_type: "b2b",
      buyer_name_snapshot: "OPCO Mobilités",
      buyer_address_snapshot: { line1: "9 av Z", postal_code: "69000", city: "Lyon", country: "FR" },
      buyer_email_facturation: "factures@opco.fr",
      buyer_country: "FR",
      buyer_siret: "12345678900011",
      buyer_tva_intracom: "FR40123456789",
    });
  });

  it("fiche sans nom : aucun bloc figé plutôt qu'un nom vide que rien ne pourrait corriger", () => {
    expect(coordonneesFigeesContact({ prenom: "  ", nom: "" })).toBeNull();
    expect(coordonneesFigeesPartenaire({ company_name: "" })).toBeNull();
  });

  it("totaux : mêmes formules que les colonnes GENERATED de facture_lignes", () => {
    expect(
      totauxFigesDepuisLignes([
        { quantite: 2, prix_unitaire_ht: 500, tva_percent: 20 },
        { quantite: 1, prix_unitaire_ht: 100, tva_percent: 0 },
      ]),
    ).toEqual({ montant_ht: 1100, montant_tva: 200 });
  });

  it("facture née émise : le bloc porte l'acheteur figé ET montant_ht / montant_tva", async () => {
    reponses.contacts = { prenom: "Jean", nom: "Dupont", email: "jean@example.fr", rue: "1 rue A", code_postal: "75001", ville: "Paris" };

    const bloc = await blocFigeNouvelleFacture({
      statut: "emise",
      contactId: "c1",
      lignes: [{ quantite: 1, prix_unitaire_ht: 990, tva_percent: 0 }],
    });

    expect(bloc.buyer_name_snapshot).toBe("Jean Dupont");
    expect(bloc.buyer_type).toBe("b2c");
    expect(bloc.buyer_address_snapshot).toEqual({ line1: "1 rue A", postal_code: "75001", city: "Paris", country: "FR" });
    expect(bloc.montant_ht).toBe(990);
    expect(bloc.montant_tva).toBe(0);
  });

  it("entreprise cliente : la fiche partenaire l'emporte, comme dans le déclencheur", async () => {
    reponses.partners = { company_name: "ACME SARL", address: "3 rue B", code_postal: "31000", ville: "Toulouse", siret: "99988877700022" };

    const bloc = await blocFigeNouvelleFacture({
      statut: "emise",
      contactId: null,
      partnerId: "p1",
      lignes: [{ quantite: 1, prix_unitaire_ht: 2000, tva_percent: 20 }],
    });

    expect(requetes).toEqual(["partners"]);
    expect(bloc.buyer_type).toBe("b2b");
    expect(bloc.buyer_name_snapshot).toBe("ACME SARL");
    expect(bloc.buyer_siret).toBe("99988877700022");
    expect(bloc.montant_tva).toBe(400);
  });

  it("brouillon : bloc vide — rien ne change pour lui, le déclencheur figera à l'émission", async () => {
    reponses.contacts = { prenom: "Jean", nom: "Dupont" };
    const bloc = await blocFigeNouvelleFacture({
      statut: "brouillon",
      contactId: "c1",
      lignes: [{ quantite: 1, prix_unitaire_ht: 990, tva_percent: 0 }],
    });
    expect(bloc).toEqual({});
    expect(requetes).toEqual([]);
  });

  it("fiche illisible : la facture se crée quand même, sans coordonnées figées", async () => {
    reponses.erreur = { message: "réseau" };
    const bloc = await blocFigeNouvelleFacture({
      statut: "emise",
      contactId: "c1",
      totaux: { montant_ht: 990, montant_tva: 0 },
    });
    expect(bloc).toEqual({ montant_ht: 990, montant_tva: 0 });
  });
});
