/**
 * Factory pour générer les templates dynamiques avec les données du centre
 * 
 * Ce module permet de créer des templates (Règlement Intérieur, CGV)
 * personnalisés avec les données du centre de formation configuré.
 */

import type { CentreFormation } from "@/hooks/useCentreFormation";
import { getResponsableLegal, getVilleCentre } from "./centre-to-company";

export interface OrganismeData {
  nom: string;
  raisonSociale: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  siret: string;
  nda: string;
  responsablePedagogique: {
    nom: string;
    fonction: string;
  };
}

/**
 * Convertit les données du centre en format OrganismeData pour les templates
 */
export function centreToOrganismeData(centre: CentreFormation | null | undefined): OrganismeData {
  const responsable = getResponsableLegal(centre);
  const ville = getVilleCentre(centre);

  if (!centre) {
    return {
      nom: "[Centre non configuré]",
      raisonSociale: "[Raison sociale non configurée]",
      adresse: "[Adresse non configurée]",
      codePostal: "",
      ville: "[Ville non configurée]",
      telephone: "[Téléphone non configuré]",
      email: "[Email non configuré]",
      siret: "[SIRET non configuré]",
      nda: "[NDA non configuré]",
      responsablePedagogique: responsable,
    };
  }

  // Extraction du code postal depuis l'adresse
  const cpMatch = centre.adresse_complete.match(/(\d{5})/);
  const codePostal = cpMatch ? cpMatch[1] : "";

  return {
    nom: centre.nom_commercial || centre.nom_legal,
    raisonSociale: centre.nom_legal,
    adresse: centre.adresse_complete,
    codePostal,
    ville,
    telephone: centre.telephone,
    email: centre.email,
    siret: centre.siret,
    nda: centre.nda,
    responsablePedagogique: responsable,
  };
}

/**
 * Remplace les placeholders {{ORGANISME.*}} dans un texte
 */
export function replacePlaceholders(text: string, organisme: OrganismeData): string {
  return text
    .replace(/\{\{ORGANISME\.nom\}\}/g, organisme.nom)
    .replace(/\{\{ORGANISME\.raisonSociale\}\}/g, organisme.raisonSociale)
    .replace(/\{\{ORGANISME\.adresse\}\}/g, organisme.adresse)
    .replace(/\{\{ORGANISME\.codePostal\}\}/g, organisme.codePostal)
    .replace(/\{\{ORGANISME\.ville\}\}/g, organisme.ville)
    .replace(/\{\{ORGANISME\.telephone\}\}/g, organisme.telephone)
    .replace(/\{\{ORGANISME\.email\}\}/g, organisme.email)
    .replace(/\{\{ORGANISME\.siret\}\}/g, organisme.siret)
    .replace(/\{\{ORGANISME\.nda\}\}/g, organisme.nda)
    .replace(/\{\{ORGANISME\.responsable\.nom\}\}/g, organisme.responsablePedagogique.nom)
    .replace(/\{\{ORGANISME\.responsable\.fonction\}\}/g, organisme.responsablePedagogique.fonction);
}
