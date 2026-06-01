import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  RequalificationActionType,
  RequalificationCategory,
} from "@/lib/requalification/categories";
import type { RequalificationContact } from "./useRequalificationContacts";
import {
  BULK_MAX,
  filterEligibleForSmartOF,
  type BulkRowResult,
} from "@/lib/requalification/bulkSelection";

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

export interface BulkMarkSmartOFPayload {
  contacts: RequalificationContact[];
  comment: string;
  reason: string;
}

export interface BulkMarkSmartOFResult {
  processed: number;
  skipped: number;
  failed: number;
  rows: BulkRowResult[];
}

/**
 * Action groupée : marquer N contacts comme historique SmartOF.
 * - Boucle séquentielle (max BULK_MAX), une ligne de log par contact AVANT update.
 * - statut_apprenant n'est JAMAIS modifié.
 * - Aucun écrit sur sessions / factures / paiements / documents / examens.
 * - Les contacts déjà SmartOF ou supprimés sont ignorés silencieusement.
 */
export function useBulkMarkAsSmartOFHistory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkMarkSmartOFPayload): Promise<BulkMarkSmartOFResult> => {
      const { contacts, comment, reason } = payload;
      if (!comment.trim() || comment.trim().length < 10) {
        throw new Error("Commentaire obligatoire (10 caractères minimum).");
      }
      if (!reason.trim()) throw new Error("Raison obligatoire.");
      if (!contacts.length) throw new Error("Aucun contact sélectionné.");
      if (contacts.length > BULK_MAX) {
        throw new Error(`Trop de contacts (max ${BULK_MAX} par action).`);
      }

      const { eligible, skipped } = filterEligibleForSmartOF(contacts);

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;

      const rows: BulkRowResult[] = [];

      // Skipped (déjà SmartOF / déjà import historique)
      for (const c of skipped) {
        rows.push({
          contactId: c.id,
          nom: `${c.prenom ?? ""} ${c.nom ?? ""}`.trim(),
          email: c.email,
          status: "skipped",
          message: "Déjà marqué historique / SmartOF",
        });
      }

      let processed = 0;
      let failed = 0;

      for (const contact of eligible) {
        try {
          if (!contact.centre_id) throw new Error("Contact sans centre_id.");

          const newCategory: RequalificationCategory = "apprenant_historique_smartof";
          const nowIso = new Date().toISOString();

          // Log d'abord
          const { error: logErr } = await supabase
            .from("contact_requalification_log")
            .insert({
              contact_id: contact.id,
              centre_id: contact.centre_id,
              previous_category: contact.requalification_category,
              new_category: newCategory,
              previous_statut_apprenant: contact.statut_apprenant,
              new_statut_apprenant: contact.statut_apprenant, // inchangé
              recommended_category: contact.suggestion.recommended,
              is_smartof_source: true,
              action_type: "mark_smartof" as RequalificationActionType,
              comment: comment.trim(),
              reason: reason.trim(),
              user_id: user?.id ?? null,
              user_email: user?.email ?? null,
            });
          if (logErr) throw logErr;

          // Update : statut_apprenant ABSENT du payload
          const { error: updErr } = await supabase
            .from("contacts")
            .update({
              is_historical_import: true,
              import_source: contact.import_source ?? "smartof",
              imported_at: contact.imported_at ?? nowIso,
              requalification_category: newCategory,
              requalification_reviewed_at: nowIso,
              requalification_reviewed_by: user?.id ?? null,
            })
            .eq("id", contact.id);
          if (updErr) throw updErr;

          processed += 1;
          rows.push({
            contactId: contact.id,
            nom: `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim(),
            email: contact.email,
            status: "success",
          });
        } catch (e: any) {
          failed += 1;
          rows.push({
            contactId: contact.id,
            nom: `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim(),
            email: contact.email,
            status: "error",
            message: e?.message ?? "Erreur inconnue",
          });
        }
      }

      return { processed, skipped: skipped.length, failed, rows };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["requalification"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["enriched-contacts"] });
      if (res.failed > 0) {
        toast.warning(
          `${res.processed} traités, ${res.skipped} ignorés, ${res.failed} échecs`,
        );
      } else {
        toast.success(
          `${res.processed} contact(s) marqué(s) historique SmartOF${res.skipped ? ` (${res.skipped} ignorés)` : ""}`,
        );
      }
    },
    onError: (e: Error) => {
      toast.error("Action groupée refusée : " + e.message);
    },
  });
}
  });
}
