import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTrackFromFormationType, type FormationTrack } from "@/lib/formation-track";

export interface ActiveEnrollment {
  id: string;
  session_id: string;
  track: FormationTrack;
  session: {
    id: string;
    nom: string;
    formation_type: string;
    date_debut: string;
    date_fin: string;
  } | null;
}

/**
 * Get the active enrollment for a contact:
 * 1. Future/current session inscription (by date_debut DESC)
 * 2. Fallback: most recent inscription
 */
export function useActiveEnrollment(contactId: string | undefined) {
  return useQuery({
    queryKey: ["active-enrollment", contactId],
    queryFn: async (): Promise<ActiveEnrollment | null> => {
      if (!contactId) return null;

      // Try future/current inscriptions first
      const today = new Date().toISOString().split("T")[0];
      const { data: futureInsc } = await supabase
        .from("session_inscriptions")
        .select("id, session_id, track, session:sessions(id, nom, formation_type, date_debut, date_fin)")
        .eq("contact_id", contactId)
        .gte("session.date_fin", today)
        .order("created_at", { ascending: false })
        .limit(1);

      if (futureInsc && futureInsc.length > 0) {
        const insc = futureInsc[0] as any;
        return {
          id: insc.id,
          session_id: insc.session_id,
          track: (insc.track as FormationTrack) || getTrackFromFormationType(insc.session?.formation_type),
          session: insc.session,
        };
      }

      // Fallback: most recent inscription
      const { data: recentInsc } = await supabase
        .from("session_inscriptions")
        .select("id, session_id, track, session:sessions(id, nom, formation_type, date_debut, date_fin)")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentInsc && recentInsc.length > 0) {
        const insc = recentInsc[0] as any;
        return {
          id: insc.id,
          session_id: insc.session_id,
          track: (insc.track as FormationTrack) || getTrackFromFormationType(insc.session?.formation_type),
          session: insc.session,
        };
      }

      return null;
    },
    enabled: !!contactId,
    staleTime: 30_000,
  });
}
