import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Session = Tables<"sessions">;
export type SessionInsert = TablesInsert<"sessions">;
export type SessionUpdate = TablesUpdate<"sessions">;

export type SessionInscription = Tables<"session_inscriptions">;

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("date_debut", { ascending: true });

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
        .gte("date_fin", today)
        .order("date_debut", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Session[];
    },
  });
}

export function useSession(id: string | null) {
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

export function useSessionInscriptions(sessionId: string | null) {
  return useQuery({
    queryKey: ["session_inscriptions", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from("session_inscriptions")
        .select(`
          *,
          contacts:contact_id (
            id, nom, prenom, email, telephone, formation
          )
        `)
        .eq("session_id", sessionId)
        .order("date_inscription", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useSessionInscriptionsCount(sessionId: string) {
  return useQuery({
    queryKey: ["session_inscriptions", "count", sessionId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("session_inscriptions")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: SessionInsert) => {
      const { data, error } = await supabase
        .from("sessions")
        .insert(session)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SessionUpdate }) => {
      const { data, error } = await supabase
        .from("sessions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useAddInscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      contactId,
    }: {
      sessionId: string;
      contactId: string;
    }) => {
      const { data, error } = await supabase
        .from("session_inscriptions")
        .insert({ session_id: sessionId, contact_id: contactId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "count", sessionId] });
    },
  });
}

export function useRemoveInscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      contactId,
    }: {
      sessionId: string;
      contactId: string;
    }) => {
      const { error } = await supabase
        .from("session_inscriptions")
        .delete()
        .eq("session_id", sessionId)
        .eq("contact_id", contactId);

      if (error) throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "count", sessionId] });
    },
  });
}
