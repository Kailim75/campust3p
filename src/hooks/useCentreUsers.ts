import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CentreUser {
  id: string;
  user_id: string;
  centre_id: string;
  is_primary: boolean;
  created_at: string;
  email?: string;
  role?: string;
}

// Hook pour récupérer les utilisateurs d'un centre
export function useCentreUsers(centreId: string | null) {
  return useQuery({
    queryKey: ["centre-users", centreId],
    queryFn: async () => {
      if (!centreId) return [];

      const { data, error } = await supabase
        .from("user_centres")
        .select("*")
        .eq("centre_id", centreId);

      if (error) throw error;
      return data as CentreUser[];
    },
    enabled: !!centreId,
  });
}

// Hook pour associer un utilisateur à un centre
export function useAssignUserToCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, centreId, isPrimary = false }: { userId: string; centreId: string; isPrimary?: boolean }) => {
      const { data, error } = await supabase
        .from("user_centres")
        .insert({
          user_id: userId,
          centre_id: centreId,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["centre-users", variables.centreId] });
      queryClient.invalidateQueries({ queryKey: ["centres-stats"] });
      toast.success("Utilisateur associé au centre");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Cet utilisateur est déjà associé à ce centre");
      } else {
        toast.error("Erreur: " + error.message);
      }
    },
  });
}

// Hook pour retirer un utilisateur d'un centre
export function useRemoveUserFromCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, centreId }: { userId: string; centreId: string }) => {
      const { error } = await supabase
        .from("user_centres")
        .delete()
        .eq("user_id", userId)
        .eq("centre_id", centreId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["centre-users", variables.centreId] });
      queryClient.invalidateQueries({ queryKey: ["centres-stats"] });
      toast.success("Utilisateur retiré du centre");
    },
    onError: (error: Error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}
