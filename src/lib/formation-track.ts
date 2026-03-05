// ─── Formation Track: Initial vs Continuing ───
// Track is now a DB-level enum on catalogue_formations, sessions, and session_inscriptions.
// This file provides TS types, labels, and a fallback derivation for legacy code paths.

export type FormationTrack = "initial" | "continuing";

/**
 * Fallback derivation from formation_type string.
 * Prefer using the DB `track` column directly when available.
 */
export function getTrackFromFormationType(formationType: string | null | undefined): FormationTrack {
  if (!formationType) return "initial";
  const lower = formationType.toLowerCase();
  if (/continue|passerelle|recyclage|mobilit/i.test(lower)) return "continuing";
  return "initial";
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
