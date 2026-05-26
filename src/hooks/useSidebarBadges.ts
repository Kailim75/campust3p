import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Compteurs d'actionnabilité pour la sidebar.
 * Refresh toutes les 60s. Erreurs silencieuses (retournent 0).
 *
 * - aujourdhui : prospects avec next_action_at échue (à traiter)
 * - inbox      : threads email non lus
 * - finances   : factures non payées avec échéance dépassée
 */
export function useSidebarBadges() {
  return useQuery({
    queryKey: ["sidebar-badges"],
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const todayIso = new Date().toISOString().slice(0, 10);

      const safe = async (p: PromiseLike<{ count: number | null }>) => {
        try {
          const { count } = await p;
          return count ?? 0;
        } catch {
          return 0;
        }
      };

      const [aujourdhui, inbox, finances] = await Promise.all([
        safe(
          supabase
            .from("prospects")
            .select("id", { count: "exact", head: true })
            .lte("next_action_at", nowIso)
            .is("deleted_at", null) as any
        ),
        safe(
          supabase
            .from("crm_email_threads")
            .select("id", { count: "exact", head: true })
            .eq("is_unread", true) as any
        ),
        safe(
          supabase
            .from("factures")
            .select("id", { count: "exact", head: true })
            .in("statut", ["non_paye", "partiel"])
            .lt("date_echeance", todayIso)
            .is("deleted_at", null) as any
        ),
      ]);

      return { aujourdhui, inbox, finances };
    },
  });
}
