/**
 * Utilitaire de conversion : données centre_formation → CompanyInfo pour les PDFs
 * 
 * Ce module garantit que tous les documents générés utilisent
 * exclusivement les données configurées dans Paramètres > Centre,
 * sans aucune référence à des données externes ou codées en dur.
 */

import type { CentreFormation } from "@/hooks/useCentreFormation";
import type { CompanyInfo } from "./pdf-generator";

/**
 * Le NDA (numéro de déclaration d'activité) est FACULTATIF.
 *
 * Décision du directeur (10/09/2026) : tant que le centre n'a pas de numéro,
 * AUCUNE mention de déclaration d'activité ne doit apparaître sur les documents
 * officiels — ni libellé, ni ligne vide, ni disclaimer orphelin. Un 2ᵉ centre
 * aura, lui, un NDA : le comportement avec numéro reste strictement inchangé.
 *
 * Cette fonction est le juge UNIQUE de « ce NDA est-il imprimable ? ». Elle
 * traite comme absents : null/undefined, la chaîne vide ou blanche, et les
 * marqueurs de configuration entre crochets ("[NDA requis]",
 * "[NDA non configuré]") produits par les replis ci-dessous.
 *
 * Elle vit dans ce module volontairement : il n'a aucune dépendance runtime
 * (son seul import est un `import type`, effacé au build), donc les pages qui
 * l'importent — dont le rapport d'audit Qualiopi — n'embarquent pas pour
 * autant tout le graphe de `pdf-generator.ts` (jspdf & co).
 */
export function hasNda(nda: string | null | undefined): boolean {
  return valeurImprimable(nda);
}

/**
 * Le SIRET est-il réellement imprimable ?
 *
 * Même règle que `hasNda`, pour une raison différente : le SIRET est
 * OBLIGATOIRE, mais tant que le centre n'est pas configuré les mappeurs
 * fabriquent un marqueur (« [SIRET requis] », « [SIRET non configuré] »). Ce
 * marqueur est un repère d'écran, jamais une mention légale : l'imprimer sur
 * une facture ou une attestation reviendrait à publier un identifiant faux.
 * Sans valeur exploitable, le SIRET disparaît du rendu — et lui seul : le nom
 * de l'organisme et la clause qui l'accompagnent restent.
 */
export function hasSiret(siret: string | null | undefined): boolean {
  return valeurImprimable(siret);
}

/**
 * Règle commune : une valeur est imprimable si elle n'est ni vide, ni blanche,
 * ni un marqueur de configuration manquante entre crochets.
 */
function valeurImprimable(valeur: string | null | undefined): boolean {
  if (!valeur) return false;
  const nettoyee = valeur.trim();
  return nettoyee !== "" && !nettoyee.includes("[");
}

/**
 * Convertit les données du centre de formation (DB) en format CompanyInfo (PDF)
 *
 * @param centre - Données du centre depuis useCentreFormation()
 * @returns CompanyInfo formaté pour les générateurs PDF
 */
export function centreToCompanyInfo(centre: CentreFormation | null | undefined): CompanyInfo {
  if (!centre) {
    // Fallback avec indication claire que la configuration est requise
    return {
      name: "[Centre non configuré - Paramètres > Centre]",
      address: "[Adresse requise]",
      phone: "[Téléphone requis]",
      email: "[Email requis]",
      siret: "[SIRET requis]",
      // Pas de marqueur ici : un NDA absent doit faire DISPARAÎTRE la mention
      // des documents, pas y imprimer « [NDA requis] » (cf. hasNda ci-dessus).
      nda: "",
    };
  }

  return {
    // Identité
    name: centre.nom_commercial || centre.nom_legal,
    address: centre.adresse_complete,
    phone: centre.telephone,
    email: centre.email,
    
    // Numéros légaux
    siret: centre.siret,
    nda: centre.nda,
    
    // Identité juridique étendue
    nom_legal: centre.nom_legal || undefined,
    forme_juridique: centre.forme_juridique || undefined,
    region_declaration: centre.region_declaration || undefined,
    responsable_legal_nom: centre.responsable_legal_nom || undefined,
    responsable_legal_fonction: centre.responsable_legal_fonction || undefined,
    iban: centre.iban || undefined,
    bic: centre.bic || undefined,
    
    // Visuels
    logo_url: centre.logo_url || undefined,
    signature_cachet_url: centre.signature_cachet_url || undefined,
    
    // Certifications Qualiopi
    qualiopi_numero: centre.qualiopi_numero || undefined,
    qualiopi_date_obtention: centre.qualiopi_date_obtention || undefined,
    qualiopi_date_expiration: centre.qualiopi_date_expiration || undefined,
    
    // Agréments
    agrement_prefecture: centre.agrement_prefecture || undefined,
    agrement_prefecture_date: centre.agrement_prefecture_date || undefined,
    code_rncp: centre.code_rncp || undefined,
    code_rs: centre.code_rs || undefined,
    
    // Agréments supplémentaires
    agrements_autres: centre.agrements_autres?.map(a => ({
      nom: a.nom || "",
      numero: a.numero || "",
      date_obtention: a.date_obtention,
      date_expiration: a.date_expiration,
    })),
  };
}

/**
 * Extrait les informations du responsable légal depuis le centre
 */
export function getResponsableLegal(centre: CentreFormation | null | undefined): {
  nom: string;
  fonction: string;
} {
  if (!centre) {
    return {
      nom: "[Responsable non configuré]",
      fonction: "[Fonction non configurée]",
    };
  }

  return {
    nom: centre.responsable_legal_nom || "[À configurer]",
    fonction: centre.responsable_legal_fonction || "Directeur",
  };
}

/**
 * Génère la ville du centre depuis l'adresse complète
 * (extrait le dernier mot après le code postal)
 */
export function getVilleCentre(centre: CentreFormation | null | undefined): string {
  if (!centre?.adresse_complete) return "[Ville non configurée]";
  
  // Essaie d'extraire la ville (après le code postal 5 chiffres)
  const match = centre.adresse_complete.match(/\d{5}\s+(.+?)(?:\s*,\s*France)?$/i);
  if (match) return match[1].trim();
  
  // Fallback : prend les derniers mots
  const parts = centre.adresse_complete.split(/[,\s]+/);
  return parts[parts.length - 1] || "[Ville]";
}

/**
 * Génère les informations bancaires du centre
 */
export function getInfosBancaires(centre: CentreFormation | null | undefined): {
  iban: string;
  bic: string;
} {
  if (!centre) {
    return {
      iban: "[IBAN non configuré]",
      bic: "[BIC non configuré]",
    };
  }

  return {
    iban: centre.iban || "[IBAN à configurer]",
    bic: centre.bic || "[BIC à configurer]",
  };
}
