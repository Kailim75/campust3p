import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  RequalificationActionType,
  RequalificationCategory,
} from "@/lib/requalification/categories";
import type { RequalificationContact } from "./useRequalificationContacts";

export interface RequalificationActionPayload {
  contact: RequalificationContact;
  action: RequalificationActionType;
  comment: string;
  reason: string;
  recommendedCategory?: RequalificationCategory | null;
}

/**
 * Wrapper d'écriture : écrit toujours dans `contact_requalification_log`
 * AVANT de mettre à jour le contact, et n'agit que sur un seul contact à la fois.
 */
export function useRequalificationAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RequalificationActionPayload) => {
      const { contact, action, comment, reason, recommendedCategory } = payload;

      if (!comment.trim()) throw new Error("Commentaire obligatoire.");
      if (!reason.trim()) throw new Error("Raison obligatoire.");
      if (!contact.centre_id) throw new Error("Contact sans centre_id.");

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;

      // Compute target update
      let update: Record<string, any> | null = null;
      let newCategory: RequalificationCategory | null = contact.requalification_category;
      let newStatut: string | null = contact.statut_apprenant;

      switch (action) {
        case "mark_smartof":
          newCategory = "apprenant_historique_smartof";
          update = {
            is_historical_import: true,
            import_source: contact.import_source ?? "smartof",
            imported_at: contact.imported_at ?? new Date().toISOString(),
            requalification_category: newCategory,
            requalification_reviewed_at: new Date().toISOString(),
            requalification_reviewed_by: user?.id ?? null,
          };
          break;
        case "exclude_kpi":
          update = {
            is_historical_import: true,
            requalification_reviewed_at: new Date().toISOString(),
            requalification_reviewed_by: user?.id ?? null,
          };
          break;
        case "archive":
          newCategory = "ancien_apprenant_a_archiver";
          update = {
            archived: true,
            requalification_category: newCategory,
            requalification_reviewed_at: new Date().toISOString(),
            requalification_reviewed_by: user?.id ?? null,
          };
          break;
        case "mark_diplome":
          newCategory = "ancien_apprenant_diplome";
          newStatut = "diplome";
          update = {
            statut_apprenant: "diplome",
            requalification_category: newCategory,
            requalification_reviewed_at: new Date().toISOString(),
            requalification_reviewed_by: user?.id ?? null,
          };
          break;
        case "reset_category":
          newCategory = null;
          update = {
            is_historical_import: false,
            requalification_category: null,
            requalification_reviewed_at: new Date().toISOString(),
            requalification_reviewed_by: user?.id ?? null,
          };
          break;
        case "add_note":
        case "create_task":
        case "attach_session":
        case "create_inscription":
          // Log only — these actions are either out-of-scope V1 or handled
          // via dedicated flows (rappels, inscription flow). On enregistre
          // simplement la décision tracée.
          update = null;
          break;
      }

      // Write log FIRST
      const { error: logErr } = await supabase.from("contact_requalification_log").insert({
        contact_id: contact.id,
        centre_id: contact.centre_id,
        previous_category: contact.requalification_category,
        new_category: newCategory,
        previous_statut_apprenant: contact.statut_apprenant,
        new_statut_apprenant: newStatut,
        recommended_category: recommendedCategory ?? contact.suggestion.recommended,
        is_smartof_source: contact.is_historical_import || action === "mark_smartof",
        action_type: action,
        comment: comment.trim(),
        reason: reason.trim(),
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
      });
      if (logErr) throw logErr;

      if (update) {
        const { error: updErr } = await supabase
          .from("contacts")
          .update(update)
          .eq("id", contact.id);
        if (updErr) throw updErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requalification"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Action enregistrée");
    },
    onError: (e: Error) => {
      toast.error("Action refusée : " + e.message);
    },
  });
}
