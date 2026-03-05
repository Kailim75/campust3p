// ─── Centralized track-specific requirements ───
import type { FormationTrack } from "./formation-track";

export interface TrackRequirement {
  type: string;
  label: string;
  required: boolean;
}

// Initial track: CMA documents required
export const INITIAL_REQUIREMENTS: TrackRequirement[] = [
  { type: "cni", label: "Pièce d'identité (recto/verso)", required: true },
  { type: "permis_b", label: "Permis de conduire (recto/verso)", required: true },
  { type: "attestation_domicile", label: "Justificatif de domicile < 3 mois", required: true },
  { type: "photo", label: "Photo d'identité", required: true },
  { type: "signature", label: "Signature", required: true },
];

// Continuing track: Carte Pro fields required
export const CONTINUING_REQUIREMENTS: TrackRequirement[] = [
  { type: "carte_pro_numero", label: "N° Carte professionnelle", required: true },
  { type: "carte_pro_prefecture", label: "Préfecture / Département", required: true },
  { type: "carte_pro_date_obtention", label: "Date de délivrance", required: true },
  { type: "carte_pro_date_expiration", label: "Date d'expiration", required: true },
  { type: "carte_pro_scan", label: "Scan de la carte (optionnel)", required: false },
];

export function getRequirementsForTrack(track: FormationTrack): TrackRequirement[] {
  return track === "initial" ? INITIAL_REQUIREMENTS : CONTINUING_REQUIREMENTS;
}

export function getRequiredDocTypes(track: FormationTrack): string[] {
  return getRequirementsForTrack(track)
    .filter(r => r.required)
    .map(r => r.type);
}

export function getRequirementLabels(track: FormationTrack): Record<string, string> {
  const reqs = getRequirementsForTrack(track);
  return Object.fromEntries(reqs.map(r => [r.type, r.label]));
}

/**
 * Compute completion for a contact based on track.
 * For initial: check CMA docs uploaded.
 * For continuing: check carte pro fields filled.
 */
export function computeTrackCompletion(
  track: FormationTrack,
  opts: {
    uploadedDocTypes?: Set<string>;
    carteProData?: {
      numero_carte?: string | null;
      prefecture?: string | null;
      date_obtention?: string | null;
      date_expiration?: string | null;
    } | null;
  }
): { received: number; total: number; missing: string[]; pct: number } {
  if (track === "initial") {
    const requiredTypes = INITIAL_REQUIREMENTS.filter(r => r.required).map(r => r.type);
    const docs = opts.uploadedDocTypes || new Set<string>();
    const received = requiredTypes.filter(t => docs.has(t)).length;
    const missing = requiredTypes.filter(t => !docs.has(t));
    return {
      received,
      total: requiredTypes.length,
      missing,
      pct: requiredTypes.length > 0 ? Math.round((received / requiredTypes.length) * 100) : 100,
    };
  } else {
    // Continuing: check carte pro fields
    const cp = opts.carteProData;
    const fields = [
      { key: "numero_carte", type: "carte_pro_numero" },
      { key: "prefecture", type: "carte_pro_prefecture" },
      { key: "date_obtention", type: "carte_pro_date_obtention" },
      { key: "date_expiration", type: "carte_pro_date_expiration" },
    ];
    const filled = fields.filter(f => {
      const val = cp?.[f.key as keyof typeof cp];
      return val !== null && val !== undefined && val !== "";
    });
    const missing = fields.filter(f => {
      const val = cp?.[f.key as keyof typeof cp];
      return !val;
    }).map(f => f.type);
    return {
      received: filled.length,
      total: fields.length,
      missing,
      pct: fields.length > 0 ? Math.round((filled.length / fields.length) * 100) : 100,
    };
  }
}
