import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, differenceInDays, parseISO } from "date-fns";

export function useDashboardActionCounts() {
  return useQuery({
    queryKey: ["dashboard", "action-counts"],
    queryFn: async () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const sevenDaysAgo = subDays(today, 7).toISOString().split("T")[0];

      const [sessionsRes, inscriptionsRes, recentInscriptionsRes] = await Promise.all([
        // Sessions to promote: upcoming, low fill rate
        supabase.from("sessions")
          .select("id, places_totales, date_debut")
          .eq("archived", false)
          .in("statut", ["a_venir", "en_cours"])
          .gte("date_fin", todayStr),
        supabase.from("session_inscriptions").select("session_id").is("deleted_at", null),
        // New inscriptions in last 7 days
        supabase.from("session_inscriptions")
          .select("id")
          .is("deleted_at", null)
          .gte("created_at", sevenDaysAgo),
      ]);

      const sessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];
      const recentInscriptions = recentInscriptionsRes.data || [];

      // Count inscriptions per session
      const counts: Record<string, number> = {};
      inscriptions.forEach(i => { counts[i.session_id] = (counts[i.session_id] || 0) + 1; });

      // Sessions to promote: fill rate < 60% and starting within 30 days
      let sessionsToPromote = 0;
      sessions.forEach(s => {
        const filled = counts[s.id] || 0;
        const places = s.places_totales || 0;
        const rate = places > 0 ? filled / places : 0;
        const daysUntil = s.date_debut ? differenceInDays(parseISO(s.date_debut), today) : 999;
        if (rate < 0.6 && daysUntil <= 30 && daysUntil >= 0) {
          sessionsToPromote++;
        }
      });

      return {
        sessionsToPromote,
        newInscriptions: recentInscriptions.length,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
