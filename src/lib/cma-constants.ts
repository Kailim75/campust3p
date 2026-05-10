// ─── Single source of truth for CMA required documents ───
import type { FormationTrack } from "./formation-track";

export const CMA_INITIAL_PIECES = [
  { type: "cni", label: "Pièce d'identité (recto/verso)" },
  { type: "permis_b", label: "Permis de conduire (recto/verso)" },
  { type: "attestation_domicile", label: "Justificatif de domicile < 3 mois" },
  { type: "photo", label: "Photo d'identité" },
  { type: "signature", label: "Signature" },
] as const;

export const CMA_CONTINUING_PIECES = [
  { type: "cni", label: "Pièce d'identité" },
  { type: "permis_b", label: "Permis de conduire" },
  { type: "carte_professionnelle", label: "Carte professionnelle à renouveler" },
] as const;

export const CMA_PIECES = CMA_INITIAL_PIECES;

export const CMA_REQUIRED_DOCS = CMA_INITIAL_PIECES.map(p => p.type);
export const CMA_CONTINUING_REQUIRED_DOCS = CMA_CONTINUING_PIECES.map(p => p.type);

export function getCmaPiecesForTrack(track: FormationTrack | string | null | undefined) {
  return track === "continuing" ? CMA_CONTINUING_PIECES : CMA_INITIAL_PIECES;
}

export function getCmaRequiredDocsForTrack(track: FormationTrack | string | null | undefined): string[] {
  return getCmaPiecesForTrack(track).map(p => p.type);
}

export function getCmaDossierLabelForTrack(track: FormationTrack | string | null | undefined) {
  return track === "continuing" ? "Dossier renouvellement carte pro" : "Dossier CMA";
}

export function getCmaDossierShortLabelForTrack(track: FormationTrack | string | null | undefined) {
  return track === "continuing" ? "Carte Pro" : "CMA";
}

const CMA_DOC_ALIASES: Record<string, string[]> = {
  cni: ["cni", "piece_identite", "carte_identite", "passeport"],
  permis_b: ["permis_b", "permis", "permis_conduire", "permis_de_conduire"],
  attestation_domicile: ["attestation_domicile", "justificatif_domicile"],
  photo: ["photo", "photo_identite"],
  signature: ["signature"],
  carte_professionnelle: ["carte_professionnelle", "carte_pro", "scan_carte_pro"],
};

function normalizeDocType(type: string): string {
  return type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function hasCmaDocument(docTypes: Set<string> | string[], requiredType: string): boolean {
  const normalizedDocs = new Set(
    Array.from(docTypes).map((docType) => normalizeDocType(docType)),
  );
  const acceptedTypes = CMA_DOC_ALIASES[requiredType] || [requiredType];
  return acceptedTypes.some((type) => normalizedDocs.has(normalizeDocType(type)));
}

export function getMissingCmaDocs(
  docTypes: Set<string> | string[],
  track: FormationTrack | string | null | undefined,
): string[] {
  return getCmaRequiredDocsForTrack(track).filter((type) => !hasCmaDocument(docTypes, type));
}

export function countReceivedCmaDocs(
  docTypes: Set<string> | string[],
  track: FormationTrack | string | null | undefined,
): number {
  return getCmaRequiredDocsForTrack(track).filter((type) => hasCmaDocument(docTypes, type)).length;
}

export const CMA_DOC_LABELS: Record<string, string> = {
  cni: "Pièce d'identité",
  photo: "Photo d'identité",
  attestation_domicile: "Justificatif domicile",
  permis_b: "Permis",
  signature: "Signature",
  carte_professionnelle: "Carte professionnelle",
  carte_pro_numero: "N° carte professionnelle",
  carte_pro_prefecture: "Préfecture / département",
  carte_pro_date_expiration: "Date d'expiration carte pro",
};
