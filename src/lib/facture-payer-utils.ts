import type { PayerInfo, BeneficiaireInfo } from "@/lib/pdf-generator";

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
