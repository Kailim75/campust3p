import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InboxStats {
  total: number;
  unread: number;
  unassigned: number;
  nouveau: number;
  en_cours: number;
  traite: number;
  archive: number;
}

/**
 * Computes lightweight inbox KPIs from the thread list.
 * Ready but NOT exposed in the UI — reserved for future cockpit.
 */
export function useInboxStats(centreId: string | undefined) {
  return useQuery<InboxStats>({
    queryKey: ["inbox-stats", centreId],
    queryFn: async () => {
      if (!centreId) throw new Error("No centre");

      const { data, error } = await supabase
        .from("crm_email_threads")
        .select("id, is_unread, status, assigned_to")
        .eq("centre_id", centreId);

      if (error) throw error;
      const threads = data || [];

      return {
        total: threads.length,
        unread: threads.filter((t) => t.is_unread).length,
        unassigned: threads.filter((t) => !t.assigned_to).length,
        nouveau: threads.filter((t) => t.status === "nouveau").length,
        en_cours: threads.filter((t) => t.status === "en_cours").length,
        traite: threads.filter((t) => t.status === "traite").length,
        archive: threads.filter((t) => t.status === "archive").length,
      };
    },
    enabled: !!centreId,
    staleTime: 30_000,
  });
}
