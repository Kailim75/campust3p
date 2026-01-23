import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useDismissedAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dismissed-alerts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("dismissed_alerts")
        .select("alert_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((d) => d.alert_id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ alertId, reason }: { alertId: string; reason?: string }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("dismissed_alerts")
        .upsert({
          alert_id: alertId,
          user_id: user.id,
          reason,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dismissed-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alerte marquée comme traitée");
    },
    onError: () => {
      toast.error("Erreur lors du traitement de l'alerte");
    },
  });
}

export function useRestoreAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("dismissed_alerts")
        .delete()
        .eq("alert_id", alertId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dismissed-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alerte restaurée");
    },
    onError: () => {
      toast.error("Erreur lors de la restauration");
    },
  });
}
