/**
 * Helpers pour compter les inscriptions actives par session.
 * Utilisés par les hooks dashboard pour éviter la duplication et les
 * compteurs gonflés par les lignes soft-deleted.
 *
 * Convention : on suppose que `inscriptions` a déjà été filtré côté
 * Supabase avec `.is("deleted_at", null)`. Ce helper fait juste
 * l'agrégation par `session_id`.
 */
export type EnrollmentLike = { session_id: string; deleted_at?: string | null };

export function countActiveEnrollmentsBySession(
  inscriptions: ReadonlyArray<EnrollmentLike>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const i of inscriptions) {
    if (!i || !i.session_id) continue;
    if (i.deleted_at != null) continue; // garde-fou si non filtré côté DB
    counts[i.session_id] = (counts[i.session_id] || 0) + 1;
  }
  return counts;
}
