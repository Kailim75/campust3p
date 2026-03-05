// ─── Formation Track: Initial vs Continuing ───

export type FormationTrack = "initial" | "continuing";

const CONTINUING_TYPES = new Set([
  "Formation continue Taxi",
  "Formation continue VTC",
  "Mobilité Taxi",
]);

/**
 * Derive the track from a formation_type string.
 */
export function getTrackFromFormationType(formationType: string | null | undefined): FormationTrack {
  if (!formationType) return "initial";
  return CONTINUING_TYPES.has(formationType) ? "continuing" : "initial";
}

export const TRACK_LABELS: Record<FormationTrack, string> = {
  initial: "Parcours Initial",
  continuing: "Formation Continue",
};

export const TRACK_BADGES: Record<FormationTrack, { label: string; sublabel: string; className: string }> = {
  initial: {
    label: "Parcours Initial",
    sublabel: "CMA",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  continuing: {
    label: "Formation Continue",
    sublabel: "Carte Pro",
    className: "bg-accent/10 text-accent border-accent/20",
  },
};
