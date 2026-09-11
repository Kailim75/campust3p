import type { PayerInfo, BeneficiaireInfo, ContactInfo } from "@/lib/pdf-generator";

/** Colonnes de la facture utiles au client imprimé (types.ts, table factures). */
export interface FacturePourClientPdf {
  statut: string;
  contact_id?: string | null;
  client_partner_id?: string | null;
  montant_total?: number | string | null;
  buyer_type?: string | null;
  buyer_name_snapshot?: string | null;
  /** jsonb { line1, postal_code, city, country } (snapshot_facture_on_emission) */
  buyer_address_snapshot?: unknown;
  buyer_email_facturation?: string | null;
  buyer_siret?: string | null;
  buyer_tva_intracom?: string | null;
}

/** Données client passées à generateFacturePDF. */
export interface ClientPdfFacture {
  contact: ContactInfo;
  payer: PayerInfo | undefined;
  beneficiaire: BeneficiaireInfo | undefined;
  montant_pris_en_charge: number | undefined;
  reste_a_charge: number | undefined;
}

const texte = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
};

/**
 * Client imprimé d'une facture (décision D2 du 11/09/2026).
 *
 * Une facture qui n'est plus un brouillon imprime l'acheteur tel qu'il a été
 * FIGÉ à l'émission (colonnes buyer_* posées par snapshot_facture_on_emission,
 * et reprises par merge_contacts) : nom, adresse, e-mail de facturation et,
 * pour une entreprise, SIRET et TVA intracommunautaire. La fiche contact ou
 * entreprise n'est qu'un REPLI, pour les factures anciennes émises avant les
 * coordonnées figées (buyer_name_snapshot vide). Un brouillon, lui, imprime
 * toujours la fiche : ses coordonnées ne sont pas encore figées.
 *
 * `repli` est le client tel que chaque écran le construisait jusqu'ici depuis
 * les fiches : il est rendu inchangé quand il n'y a rien de figé.
 *
 * Hors coordonnées figées, et donc toujours lus sur les fiches : le téléphone
 * (non figé, non obligatoire) et le tiers payeur de l'inscription (OPCO,
 * employeur) quand l'acheteur figé est l'apprenant.
 */
export function clientImprimeFacture(
  facture: FacturePourClientPdf,
  repli: ClientPdfFacture,
): ClientPdfFacture & { source: "coordonnees_figees" | "fiche" } {
  const nom = texte(facture.buyer_name_snapshot);
  if (facture.statut === "brouillon" || !nom) {
    return { ...repli, source: "fiche" };
  }

  const adresse = (facture.buyer_address_snapshot && typeof facture.buyer_address_snapshot === "object"
    ? facture.buyer_address_snapshot
    : {}) as Record<string, unknown>;
  const ligne1 = texte(adresse.line1) ?? texte(adresse.address);
  const codePostal = texte(adresse.postal_code) ?? texte(adresse.code_postal);
  const ville = texte(adresse.city) ?? texte(adresse.ville);
  const email = texte(facture.buyer_email_facturation);

  const typeAcheteur = texte(facture.buyer_type);
  const factureEntreprise = !!facture.client_partner_id && !facture.contact_id;
  const acheteurEntreprise = typeAcheteur ? typeAcheteur !== "b2c" : factureEntreprise;

  if (acheteurEntreprise) {
    const payer: PayerInfo = {
      company_name: nom,
      address: [ligne1, [codePostal, ville].filter(Boolean).join(" ")].filter(Boolean).join(" ") || undefined,
      email,
      siret: texte(facture.buyer_siret),
      tva_intracom: texte(facture.buyer_tva_intracom),
    };
    if (factureEntreprise) {
      return {
        contact: { ...repli.contact, nom, prenom: "", email, rue: undefined, code_postal: undefined, ville: undefined },
        payer,
        beneficiaire: undefined,
        montant_pris_en_charge: repli.montant_pris_en_charge ?? (facture.montant_total != null ? Number(facture.montant_total) : undefined),
        reste_a_charge: repli.reste_a_charge ?? 0,
        source: "coordonnees_figees",
      };
    }
    // Facture d'un apprenant dont l'acheteur figé est une entreprise.
    return {
      contact: repli.contact,
      payer,
      beneficiaire: repli.beneficiaire ?? {
        nom: repli.contact.nom,
        prenom: repli.contact.prenom,
        civilite: repli.contact.civilite,
      },
      montant_pris_en_charge: repli.montant_pris_en_charge ?? (facture.montant_total != null ? Number(facture.montant_total) : undefined),
      reste_a_charge: repli.reste_a_charge ?? 0,
      source: "coordonnees_figees",
    };
  }

  // Acheteur figé = particulier. Le nom figé est une chaîne unique « Prénom
  // Nom » : il est porté par `prenom` (le PDF compose « prénom nom » puis
  // retire les espaces de bord).
  return {
    contact: {
      ...repli.contact,
      civilite: undefined,
      prenom: nom,
      nom: "",
      email,
      rue: ligne1,
      code_postal: codePostal,
      ville,
    },
    payer: repli.payer,
    beneficiaire: repli.beneficiaire ? { nom: "", prenom: nom } : undefined,
    montant_pris_en_charge: repli.montant_pris_en_charge,
    reste_a_charge: repli.reste_a_charge,
    source: "coordonnees_figees",
  };
}

/**
 * Extract payer and beneficiary info from a facture's session_inscription data.
 * Returns null values when payer is the learner themselves.
 */
export function extractPayerInfo(inscription: {
  type_payeur: string | null;
  montant_pris_en_charge: number | null;
  reste_a_charge: number | null;
  payeur_partner: {
    company_name: string;
    email: string | null;
    address: string | null;
  } | null;
} | null, contact: {
  nom: string;
  prenom: string;
  civilite?: string | null;
} | null): {
  payer: PayerInfo | undefined;
  beneficiaire: BeneficiaireInfo | undefined;
  montant_pris_en_charge: number | undefined;
  reste_a_charge: number | undefined;
} {
  if (!inscription || !inscription.type_payeur || inscription.type_payeur === "apprenant") {
    return { payer: undefined, beneficiaire: undefined, montant_pris_en_charge: undefined, reste_a_charge: undefined };
  }

  const partner = inscription.payeur_partner;
  if (!partner) {
    return { payer: undefined, beneficiaire: undefined, montant_pris_en_charge: undefined, reste_a_charge: undefined };
  }

  const payer: PayerInfo = {
    company_name: partner.company_name,
    address: partner.address || undefined,
    email: partner.email || undefined,
  };

  const beneficiaire: BeneficiaireInfo | undefined = contact
    ? {
        nom: contact.nom,
        prenom: contact.prenom,
        civilite: contact.civilite || undefined,
      }
    : undefined;

  return {
    payer,
    beneficiaire,
    montant_pris_en_charge: inscription.montant_pris_en_charge ?? undefined,
    reste_a_charge: inscription.reste_a_charge ?? undefined,
  };
}
