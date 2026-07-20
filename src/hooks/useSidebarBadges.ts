import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Compteurs d'actionnabilité pour la sidebar.
 * Refresh toutes les 60s. Erreurs silencieuses (retournent 0).
 *
 * - aujourdhui : prospects avec next_action_at échue (à traiter)
 * (le compteur inbox a été retiré le 21/07/2026 avec la surface Inbox)
 * - finances   : factures non payées avec échéance dépassée
 * - signatures : demandes envoyées, non signées, non expirées
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

      const [aujourdhui, finances, signatures] = await Promise.all([
        safe(
          supabase
            .from("prospects")
            .select("id", { count: "exact", head: true })
            .lte("next_action_at", nowIso)
            .is("deleted_at", null) as any
        ),
        safe(
          supabase
            .from("factures")
            .select("id", { count: "exact", head: true })
            .in("statut", ["impayee", "partiel"])
            .lt("date_echeance", todayIso)
            .is("deleted_at", null) as any
        ),
        safe(
          supabase
            .from("signature_requests")
            .select("id", { count: "exact", head: true })
            .eq("statut", "envoye")
            .or(`date_expiration.is.null,date_expiration.gte.${todayIso}`) as unknown as PromiseLike<{ count: number | null }>
        ),
      ]);

      return { aujourdhui, finances, signatures };
    },
  });
}
