// ─── Single source of truth for CMA required documents ───

export const CMA_PIECES = [
  { type: "cni", label: "Pièce d'identité (recto/verso)" },
  { type: "permis_b", label: "Permis de conduire (recto/verso)" },
  { type: "attestation_domicile", label: "Justificatif de domicile < 3 mois" },
  { type: "photo", label: "Photo d'identité" },
  { type: "signature", label: "Signature" },
] as const;

export const CMA_REQUIRED_DOCS = CMA_PIECES.map(p => p.type);

export const CMA_DOC_LABELS: Record<string, string> = {
  cni: "Pièce d'identité",
  photo: "Photo d'identité",
  attestation_domicile: "Justificatif domicile",
  permis_b: "Permis",
  signature: "Signature",
};
