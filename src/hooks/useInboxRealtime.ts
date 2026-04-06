import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on crm_email_threads for a given centre.
 * Silently invalidates the thread list query — no UI noise.
 */
export function useInboxRealtime(centreId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!centreId) return;

    const channel = supabase
      .channel(`inbox-rt-${centreId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_email_threads",
          filter: `centre_id=eq.${centreId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["crm-email-threads"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centreId, queryClient]);
}
