import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import type { Tables } from "@/integrations/supabase/types";

export type ArchivedSession = Tables<"sessions">;

export function useArchivedSessions() {
  return useQuery({
    queryKey: ["sessions", "archived"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("archived", true)
        .order("archived_at", { ascending: false });

      if (error) throw error;
      return data as ArchivedSession[];
    },
  });
}

export function useArchiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc("archive_session", {
        p_session_id: sessionId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session archivée avec succès");
    },
    onError: (error: Error) => {
      if (error.message.includes("date de fin")) {
        toast.error("Impossible d'archiver : la session n'est pas encore terminée");
      } else {
        toast.error("Erreur lors de l'archivage");
      }
    },
  });
}

export function useUnarchiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc("unarchive_session", {
        p_session_id: sessionId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session désarchivée avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la désarchivage");
    },
  });
}

export function useCanArchiveSession(dateFinStr: string | undefined): boolean {
  if (!dateFinStr) return false;
  const dateFin = new Date(dateFinStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateFin < today;
}
