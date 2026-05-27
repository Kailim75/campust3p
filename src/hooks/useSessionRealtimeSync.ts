import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes for tables affecting a session detail view.
 * Invalidates session, inscriptions, factures, paiements, and session_financials
 * caches so the "fiche session" always reflects the latest billing state.
 */
export function useSessionRealtimeSync(sessionId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId || !enabled) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "count", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "all_counts"] });
      queryClient.invalidateQueries({ queryKey: ["session-inscrits-detail", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_financials"] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    };

    const channel = supabase
      .channel(`session-detail-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_inscriptions", filter: `session_id=eq.${sessionId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "factures" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, invalidate)
      .subscribe();

    // Also refresh immediately when the sheet (re)opens
    invalidate();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, enabled, queryClient]);
}
