import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ActionType = "call" | "whatsapp" | "email";

interface LogActionParams {
  prospectId: string;
  actionType: ActionType;
  note?: string;
}

interface ReplanifyParams {
  prospectId: string;
  nextActionAt: string;
  nextActionType: ActionType;
  note?: string;
}

export function useLogProspectAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, actionType, note }: LogActionParams) => {
      // Log action
      await supabase.from("action_logs").insert({
        entity_type: "Prospect",
        entity_id: prospectId,
        action_type: actionType,
        label: `[AUTO] ${actionType === "call" ? "Appel" : actionType === "whatsapp" ? "WhatsApp" : "Email"}`,
        note: note || null,
      });

      // Update last_contacted_at
      const { error } = await supabase
        .from("prospects")
        .update({ last_contacted_at: new Date().toISOString() } as any)
        .eq("id", prospectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Action enregistrée");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement");
    },
  });
}

export function useReplanifyProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, nextActionAt, nextActionType, note }: ReplanifyParams) => {
      // Update prospect
      const { error } = await supabase
        .from("prospects")
        .update({
          next_action_at: nextActionAt,
          next_action_type: nextActionType,
        } as any)
        .eq("id", prospectId);

      if (error) throw error;

      // Log replanification
      await supabase.from("action_logs").insert({
        entity_type: "Prospect",
        entity_id: prospectId,
        action_type: "replanification",
        label: `[AUTO] Replanifié au ${new Date(nextActionAt).toLocaleDateString("fr-FR")}`,
        note: note || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Relance replanifiée");
    },
    onError: () => {
      toast.error("Erreur lors de la replanification");
    },
  });
}

export function useMarkProspectDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospectId: string) => {
      const { error } = await supabase
        .from("prospects")
        .update({
          next_action_at: null,
          last_contacted_at: new Date().toISOString(),
        } as any)
        .eq("id", prospectId);

      if (error) throw error;

      await supabase.from("action_logs").insert({
        entity_type: "Prospect",
        entity_id: prospectId,
        action_type: "done",
        label: "[AUTO] Marqué fait",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Marqué comme fait");
    },
    onError: () => {
      toast.error("Erreur");
    },
  });
}
