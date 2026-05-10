// ─── Formation Track: Initial vs Continuing ───
// Track is now a DB-level enum on catalogue_formations, sessions, and session_inscriptions.
// This file provides TS types, labels, and a fallback derivation for legacy code paths.

export type FormationTrack = "initial" | "continuing";

function normalizeFormationLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Fallback derivation from formation_type string.
 * Prefer using the DB `track` column directly when available.
 */
export function getTrackFromFormationType(formationType: string | null | undefined): FormationTrack {
  if (!formationType) return "initial";
  const lower = normalizeFormationLabel(formationType);
  if (/continue|recyclage|renouvel/.test(lower)) return "continuing";
  return "initial";
}

/**
 * Resolve a track while correcting legacy false positives.
 * Older data may have marked passerelle/mobilite as `continuing`; those are
 * not renewal-only formation continue records and must keep the initial-style
 * dossier flow.
 */
export function resolveFormationTrack(
  track: FormationTrack | string | null | undefined,
  formationType: string | null | undefined,
): FormationTrack {
  if (formationType) {
    const lower = normalizeFormationLabel(formationType);
    if (/passerelle|mobilit/.test(lower)) return "initial";
    if (/continue|recyclage|renouvel/.test(lower)) return "continuing";
  }
  return track === "continuing" ? "continuing" : "initial";
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
