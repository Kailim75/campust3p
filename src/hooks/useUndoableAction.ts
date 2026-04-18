import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUndoStore } from "@/hooks/useUndoAction";
import { UndoToast } from "@/components/ui/undo-toast";
import React from "react";

export interface UndoableActionOptions {
  /** Short label shown in the toast (e.g. "Session « X » supprimée") */
  successMessage: string;
  /** Action that should run immediately (soft delete, archive, etc.) */
  action: () => Promise<void>;
  /** Action that reverts the change if user clicks "Annuler" or hits Esc */
  undo: () => Promise<void>;
  /** Optional finalizer after duration elapses (for hard deletes/cleanup) */
  commit?: () => Promise<void>;
  /** Optimistic UI updater (e.g. removeQueries) — runs before the action */
  optimistic?: () => void;
  /** Rollback for optimistic UI if the action itself fails */
  rollback?: () => void;
  /** Toast duration in ms (default 5000) */
  duration?: number;
}

/**
 * Hook that exposes runUndoable — runs an action immediately, shows a custom
 * undo toast for `duration` ms, and reverts on click/Esc. Supports a max-3 queue.
 */
export function useUndoableAction() {
  const enqueue = useUndoStore((s) => s.enqueue);
  const remove = useUndoStore((s) => s.remove);

  const runUndoable = async (opts: UndoableActionOptions) => {
    const duration = opts.duration ?? 5000;

    // 1. Optimistic UI
    opts.optimistic?.();

    // 2. Run the action (soft delete, etc.)
    try {
      await opts.action();
    } catch (err: any) {
      console.error("Undoable action failed:", err);
      opts.rollback?.();
      toast.error(`Erreur : ${err?.message || "action impossible"}`);
      return;
    }

    // 3. Show the custom undo toast
    const id = crypto.randomUUID();
    let undone = false;

    const toastId = toast.custom(
      (t) =>
        React.createElement(UndoToast, {
          message: opts.successMessage,
          durationMs: duration,
          onUndo: async () => {
            if (undone) return;
            undone = true;
            try {
              await opts.undo();
              remove(id);
              toast.dismiss(t);
              toast.success("Action annulée");
            } catch (err: any) {
              console.error("Undo failed:", err);
              toast.error(`Annulation impossible : ${err?.message || ""}`);
            }
          },
          onDismiss: () => {
            toast.dismiss(t);
            remove(id);
            opts.commit?.().catch(() => {});
          },
        }),
      { duration, position: "bottom-center" }
    );

    enqueue({
      id,
      description: opts.successMessage,
      undo: async () => {
        if (undone) return;
        undone = true;
        await opts.undo();
        toast.dismiss(toastId);
      },
      commit: opts.commit,
      timestamp: Date.now(),
      toastId,
    });

    // 4. Auto-cleanup after duration
    setTimeout(() => {
      if (!undone) {
        remove(id);
        opts.commit?.().catch(() => {});
      }
    }, duration);
  };

  return { runUndoable };
}

// ─────────────────────────────────────────────────────────────
// Soft delete helper
// ─────────────────────────────────────────────────────────────

const tableLabels: Record<string, string> = {
  sessions: "Session",
  contacts: "Apprenant",
  factures: "Facture",
  catalogue_formations: "Formation",
  email_templates: "Modèle email",
  contact_documents: "Document",
  generated_documents_v2: "Document généré",
  paiements: "Paiement",
  devis: "Devis",
};

const tableQueryKeys: Record<string, string[][]> = {
  sessions: [["sessions"]],
  contacts: [["contacts"]],
  factures: [["factures"]],
  catalogue_formations: [["catalogue-formations"]],
  email_templates: [["email-templates"]],
  contact_documents: [["contact-documents"]],
  generated_documents_v2: [["generated-docs-v2"]],
  paiements: [["paiements"], ["factures"]],
  devis: [["devis"]],
};

/**
 * Convenience helper — soft-deletes a row with undo toast, reusing the existing
 * `soft_delete_record` / `restore_record` RPCs.
 */
export function useSoftDeleteWithUndo() {
  const queryClient = useQueryClient();
  const { runUndoable } = useUndoableAction();

  return async (params: {
    table: keyof typeof tableLabels;
    id: string;
    label?: string;
    /** Override the toast message entirely */
    message?: string;
  }) => {
    const label = params.label || tableLabels[params.table] || "Élément";
    const message = params.message || `${label} supprimé(e)`;
    const keys = tableQueryKeys[params.table] || [[params.table]];

    await runUndoable({
      successMessage: message,
      action: async () => {
        if (params.table === "sessions") {
          const { error } = await supabase.rpc("soft_delete_session", {
            p_session_id: params.id,
            p_reason: null,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.rpc("soft_delete_record", {
            p_table_name: params.table,
            p_record_id: params.id,
            p_reason: null,
          });
          if (error) throw error;
        }
        keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
        queryClient.invalidateQueries({ queryKey: ["trash"] });
      },
      undo: async () => {
        if (params.table === "sessions") {
          const { error } = await supabase.rpc("restore_session", {
            p_session_id: params.id,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.rpc("restore_record", {
            p_table_name: params.table,
            p_record_id: params.id,
          });
          if (error) throw error;
        }
        keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
        queryClient.invalidateQueries({ queryKey: ["trash"] });
      },
    });
  };
}
