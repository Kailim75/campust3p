import { describe, it, expect } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { clientImprimeFacture, extractPayerInfo, variablesGabaritFacture, type ClientPdfFacture } from "@/lib/facture-payer-utils";
import { generateFacturePDF, type FactureInfo } from "@/lib/pdf-generator";

/**
 * F5 (11/09/2026) — le client imprimé sur une facture émise vient de ses
 * coordonnées figées (buyer_*), la fiche contact/entreprise n'est qu'un repli.
 * Sans cela, une facture émise changeait d'acheteur au gré des fiches (fusion
 * de contacts, déménagement, nouvelle raison sociale).
 */

async function textePdf(doc: { output: (type: "arraybuffer") => ArrayBuffer }): Promise<string> {
  const pdf = await getDocument({ data: new Uint8Array(doc.output("arraybuffer")) }).promise;
  let texte = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const contenu = await page.getTextContent();
    texte += contenu.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return texte;
}

const ficheApprenant = {
  nom: "Dupont",
  prenom: "Jean",
  email: "jean@exemple.fr",
  telephone: "0600000000",
  rue: "1 rue A",
  code_postal: "75001",
  ville: "Paris",
};

const repliApprenant: ClientPdfFacture = {
  contact: ficheApprenant,
  ...extractPayerInfo(null, ficheApprenant),
};

const snapshotParticulier = {
  buyer_type: "b2c",
  buyer_name_snapshot: "Jean-bis Dupont",
  buyer_address_snapshot: { line1: "2 rue B", postal_code: "92120", city: "Montrouge", country: "FR" },
  buyer_email_facturation: "jean-bis@exemple.fr",
};

const repliEntreprise: ClientPdfFacture = {
  contact: { nom: "Nouveau Nom SARL", prenom: "", email: "contact@nouveau.fr" },
  payer: { company_name: "Nouveau Nom SARL", address: "9 avenue Z 69000 Lyon", email: "contact@nouveau.fr", siret: "99999999900099" },
  beneficiaire: undefined,
  montant_pris_en_charge: 1800,
  reste_a_charge: 0,
};

const snapshotEntreprise = {
  buyer_type: "b2b",
  buyer_name_snapshot: "Société Figée SAS",
  buyer_address_snapshot: { line1: "5 place C", postal_code: "92240", city: "Malakoff", country: "FR" },
  buyer_email_facturation: "compta@figee.fr",
  buyer_siret: "12345678900011",
  buyer_tva_intracom: "FR12345678901",
};

const factureInfo = (statut: string, client: ClientPdfFacture): FactureInfo => ({
  numero_facture: "FAC-2026-0502",
  montant_total: 1800,
  total_paye: 0,
  statut,
  type_financement: "personnel",
  date_emission: "2026-09-01",
  payer: client.payer,
  beneficiaire: client.beneficiaire,
  montant_pris_en_charge: client.montant_pris_en_charge,
  reste_a_charge: client.reste_a_charge,
  lignes: [{ description: "Formation VTC", quantite: 1, prix_unitaire_ht: 1800 }],
});

describe("clientImprimeFacture", () => {
  it("brouillon : la fiche, même si des coordonnées figées traînent", () => {
    const r = clientImprimeFacture({ statut: "brouillon", contact_id: "k1", ...snapshotParticulier }, repliApprenant);
    expect(r.source).toBe("fiche");
    expect(r.contact).toEqual(ficheApprenant);
  });

  it("facture émise ancienne sans coordonnées figées : repli sur la fiche", () => {
    const r = clientImprimeFacture({ statut: "emise", contact_id: "k1", buyer_name_snapshot: "  " }, repliApprenant);
    expect(r.source).toBe("fiche");
    expect(r.contact).toEqual(ficheApprenant);
  });

  it("particulier émis : nom, adresse et e-mail figés ; téléphone lu sur la fiche", () => {
    const r = clientImprimeFacture({ statut: "payee", contact_id: "k1", ...snapshotParticulier }, repliApprenant);
    expect(r.source).toBe("coordonnees_figees");
    expect(r.contact).toMatchObject({
      prenom: "Jean-bis Dupont",
      nom: "",
      rue: "2 rue B",
      code_postal: "92120",
      ville: "Montrouge",
      email: "jean-bis@exemple.fr",
      telephone: "0600000000",
    });
    expect(r.payer).toBeUndefined();
  });

  it("entreprise émise : raison sociale, adresse, SIRET et TVA figés", () => {
    const r = clientImprimeFacture(
      { statut: "emise", client_partner_id: "p1", contact_id: null, montant_total: 1800, ...snapshotEntreprise },
      repliEntreprise,
    );
    expect(r.payer).toEqual({
      company_name: "Société Figée SAS",
      address: "5 place C 92240 Malakoff",
      email: "compta@figee.fr",
      siret: "12345678900011",
      tva_intracom: "FR12345678901",
    });
    expect(r.contact.nom).toBe("Société Figée SAS");
  });

  it("apprenant dont l'acheteur figé est une entreprise : bloc entreprise + bénéficiaire", () => {
    const r = clientImprimeFacture(
      { statut: "emise", contact_id: "k1", montant_total: 1800, ...snapshotEntreprise },
      repliApprenant,
    );
    expect(r.payer?.company_name).toBe("Société Figée SAS");
    expect(r.beneficiaire).toMatchObject({ nom: "Dupont", prenom: "Jean" });
  });
});

describe("PDF de facture (générateur front) — rendu mesuré", () => {
  it("particulier émis : imprime l'acheteur figé, pas la fiche courante", async () => {
    const client = clientImprimeFacture({ statut: "emise", contact_id: "k1", ...snapshotParticulier }, repliApprenant);
    const texte = await textePdf(generateFacturePDF(factureInfo("emise", client), client.contact));
    expect(texte).toContain("Jean-bis Dupont");
    expect(texte).toContain("2 rue B");
    expect(texte).toContain("92120 Montrouge");
    expect(texte).not.toContain("1 rue A");
  });

  it("entreprise émise : imprime SIRET et TVA intracommunautaire figés", async () => {
    const client = clientImprimeFacture(
      { statut: "emise", client_partner_id: "p1", contact_id: null, montant_total: 1800, ...snapshotEntreprise },
      repliEntreprise,
    );
    const texte = await textePdf(generateFacturePDF(factureInfo("emise", client), client.contact));
    expect(texte).toContain("Société Figée SAS");
    expect(texte).toContain("SIRET : 12345678900011");
    expect(texte).toContain("TVA intracom. : FR12345678901");
    expect(texte).not.toContain("Nouveau Nom SARL");
    expect(texte).not.toContain("99999999900099");
  });
});

/**
 * Tiers payeur (OPCO, employeur) : c'est une facture B2B, le bloc « FACTURÉ À »
 * doit porter le SIRET et la TVA intracommunautaire du payeur. `extractPayerInfo`
 * ne les remontait pas : le SIRET n'apparaissait jamais sur ce chemin.
 */
describe("extractPayerInfo — identifiants du tiers payeur", () => {
  it("remonte SIRET et TVA intracommunautaire du partenaire payeur", () => {
    const { payer } = extractPayerInfo(
      {
        type_payeur: "opco",
        montant_pris_en_charge: 1800,
        reste_a_charge: 0,
        payeur_partner: {
          company_name: "OPCO Mobilités",
          email: "contact@opco.fr",
          address: "9 av Z 69000 Lyon",
          siret: "44455566600077",
          tva_intracom: "FR30444555666",
        },
      },
      { nom: "Dupont", prenom: "Jean" },
    );

    expect(payer).toMatchObject({
      company_name: "OPCO Mobilités",
      siret: "44455566600077",
      tva_intracom: "FR30444555666",
    });
  });

  it("un payeur sans SIRET n'imprime pas de champ vide", () => {
    const { payer } = extractPayerInfo(
      {
        type_payeur: "entreprise",
        montant_pris_en_charge: 500,
        reste_a_charge: 0,
        payeur_partner: { company_name: "Employeur SARL", email: null, address: null, siret: "  ", tva_intracom: null },
      },
      null,
    );

    expect(payer?.siret).toBeUndefined();
    expect(payer?.tva_intracom).toBeUndefined();
  });
});

/**
 * Template Studio : un gabarit généré pour une facture est un document imprimé
 * portant un numéro de facture et un client. Il lisait {{nom}}, {{prenom}} et
 * {{email}} sur la fiche contact vivante, jamais sur buyer_*.
 */
describe("variablesGabaritFacture — gabarits Template Studio", () => {
  const fiche = {
    nom: "Nouveau-Nom",
    prenom: "Jean",
    email: "nouveau@exemple.fr",
    rue: "50 rue Déménagée",
    code_postal: "13001",
    ville: "Marseille",
  };

  it("facture émise : nom, e-mail et adresse figés", () => {
    expect(
      variablesGabaritFacture(
        {
          statut: "emise",
          contact_id: "c1",
          buyer_type: "b2c",
          buyer_name_snapshot: "Jean Ancien-Nom",
          buyer_address_snapshot: { line1: "2 rue B", postal_code: "92120", city: "Montrouge", country: "FR" },
          buyer_email_facturation: "fige@exemple.fr",
        },
        fiche,
      ),
    ).toEqual({
      nom: "",
      prenom: "Jean Ancien-Nom",
      email: "fige@exemple.fr",
      adresse: "2 rue B, 92120, Montrouge",
    });
  });

  it("brouillon : la fiche reste la source", () => {
    expect(variablesGabaritFacture({ statut: "brouillon", contact_id: "c1" }, fiche)).toEqual({
      nom: "Nouveau-Nom",
      prenom: "Jean",
      email: "nouveau@exemple.fr",
      adresse: "50 rue Déménagée, 13001, Marseille",
    });
  });
});
