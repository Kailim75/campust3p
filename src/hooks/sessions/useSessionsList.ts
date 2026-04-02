import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Session = Tables<"sessions">;

export function useSessionsList(includeArchived = false) {
  return useQuery({
    queryKey: ["sessions", { includeArchived }],
    queryFn: async () => {
      let query = supabase
        .from("sessions")
        .select("*")
        .is("deleted_at", null)
        .order("date_debut", { ascending: true });

      if (!includeArchived) {
        query = query.eq("archived", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Session[];
    },
  });
}

export function useUpcomingSessions(limit = 5) {
  return useQuery({
    queryKey: ["sessions", "upcoming", limit],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .is("deleted_at", null)
        .eq("archived", false)
        .gte("date_fin", today)
        .order("date_debut", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Session[];
    },
  });
}

export function useSessionDetails(id: string | null) {
  return useQuery({
    queryKey: ["sessions", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Session;
    },
    enabled: !!id,
  });
}
