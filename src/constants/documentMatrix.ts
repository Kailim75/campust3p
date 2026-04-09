/**
 * RM-6: Matrice des documents obligatoires par type de formation
 */

export interface DocumentRequirement {
  type_document: string;
  label: string;
  obligatoire: boolean;
  description?: string;
}

export const DOCUMENT_MATRIX: Record<string, DocumentRequirement[]> = {
  TAXI: [
    { type_document: "piece_identite", label: "Pièce d'identité", obligatoire: true },
    { type_document: "permis_conduire", label: "Permis de conduire", obligatoire: true },
    { type_document: "photo_identite", label: "Photo d'identité", obligatoire: true },
    { type_document: "justificatif_domicile", label: "Justificatif de domicile", obligatoire: true },
    { type_document: "casier_judiciaire", label: "Extrait de casier judiciaire (B2)", obligatoire: true },
    { type_document: "certificat_medical", label: "Certificat médical", obligatoire: true },
    { type_document: "attestation_psc1", label: "Attestation PSC1", obligatoire: true },
  ],
  VTC: [
    { type_document: "piece_identite", label: "Pièce d'identité", obligatoire: true },
    { type_document: "permis_conduire", label: "Permis de conduire", obligatoire: true },
    { type_document: "photo_identite", label: "Photo d'identité", obligatoire: true },
    { type_document: "justificatif_domicile", label: "Justificatif de domicile", obligatoire: true },
    { type_document: "casier_judiciaire", label: "Extrait de casier judiciaire (B2)", obligatoire: true },
    { type_document: "certificat_medical", label: "Certificat médical", obligatoire: true },
    { type_document: "attestation_psc1", label: "Attestation PSC1", obligatoire: true },
  ],
  VMDTR: [
    { type_document: "piece_identite", label: "Pièce d'identité", obligatoire: true },
    { type_document: "permis_conduire", label: "Permis de conduire (A/A2)", obligatoire: true },
    { type_document: "photo_identite", label: "Photo d'identité", obligatoire: true },
    { type_document: "justificatif_domicile", label: "Justificatif de domicile", obligatoire: true },
    { type_document: "casier_judiciaire", label: "Extrait de casier judiciaire (B2)", obligatoire: true },
    { type_document: "certificat_medical", label: "Certificat médical", obligatoire: true },
  ],
  "Formation continue Taxi": [
    { type_document: "piece_identite", label: "Pièce d'identité", obligatoire: true },
    { type_document: "carte_professionnelle", label: "Carte professionnelle en cours", obligatoire: true },
    { type_document: "permis_conduire", label: "Permis de conduire", obligatoire: true },
  ],
  "Formation continue VTC": [
    { type_document: "piece_identite", label: "Pièce d'identité", obligatoire: true },
    { type_document: "carte_professionnelle", label: "Carte professionnelle en cours", obligatoire: true },
    { type_document: "permis_conduire", label: "Permis de conduire", obligatoire: true },
  ],
  "Mobilité Taxi": [
    { type_document: "piece_identite", label: "Pièce d'identité", obligatoire: true },
    { type_document: "carte_professionnelle", label: "Carte professionnelle VTC en cours", obligatoire: true },
    { type_document: "permis_conduire", label: "Permis de conduire", obligatoire: true },
    { type_document: "certificat_medical", label: "Certificat médical", obligatoire: true },
  ],
  "ACC VTC": [
    { type_document: "piece_identite", label: "Pièce d'identité", obligatoire: true },
    { type_document: "permis_conduire", label: "Permis de conduire", obligatoire: true },
  ],
  "ACC VTC 75": [
    { type_document: "piece_identite", label: "Pièce d'identité", obligatoire: true },
    { type_document: "permis_conduire", label: "Permis de conduire", obligatoire: true },
  ],
};

/** Default fallback for unknown formation types */
const DEFAULT_REQUIREMENTS: DocumentRequirement[] = [
  { type_document: "piece_identite", label: "Pièce d'identité", obligatoire: true },
  { type_document: "permis_conduire", label: "Permis de conduire", obligatoire: true },
];

export function getRequiredDocuments(formationType: string): DocumentRequirement[] {
  return DOCUMENT_MATRIX[formationType] || DEFAULT_REQUIREMENTS;
}

export interface DossierStatus {
  total_requis: number;
  total_fournis: number;
  documents_manquants: DocumentRequirement[];
  complet: boolean;
  taux_completion: number;
}

export function checkDossierCompleteness(
  formationType: string,
  existingDocumentTypes: string[],
): DossierStatus {
  const required = getRequiredDocuments(formationType);
  const normalizedExisting = existingDocumentTypes.map((t) => t.toLowerCase().trim());

  const manquants = required.filter(
    (req) => req.obligatoire && !normalizedExisting.some((e) => e.includes(req.type_document) || req.type_document.includes(e)),
  );

  return {
    total_requis: required.filter((r) => r.obligatoire).length,
    total_fournis: required.filter((r) => r.obligatoire).length - manquants.length,
    documents_manquants: manquants,
    complet: manquants.length === 0,
    taux_completion: required.filter((r) => r.obligatoire).length > 0
      ? Math.round(((required.filter((r) => r.obligatoire).length - manquants.length) / required.filter((r) => r.obligatoire).length) * 100)
      : 100,
  };
}
