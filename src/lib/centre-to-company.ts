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
      nda: "[NDA requis]",
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
