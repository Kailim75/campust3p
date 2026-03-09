import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SoftDeleteTable =
  | "sessions"
  | "contacts"
  | "session_inscriptions"
  | "factures"
  | "paiements"
  | "contact_documents"
  | "prospects"
  | "devis"
  | "emargements"
  | "document_templates"
  | "catalogue_formations"
  | "email_templates"
  | "generated_documents_v2";

const tableLabels: Record<SoftDeleteTable, string> = {
  sessions: "Session",
  contacts: "Apprenant",
  session_inscriptions: "Inscription",
  factures: "Facture",
  paiements: "Paiement",
  contact_documents: "Document",
  prospects: "Prospect",
  devis: "Devis",
  emargements: "Émargement",
  document_templates: "Modèle de document",
  catalogue_formations: "Formation catalogue",
  email_templates: "Modèle email",
  generated_documents_v2: "Document généré",
};

const tableQueryKeys: Record<SoftDeleteTable, string[][]> = {
  sessions: [["sessions"]],
  contacts: [["contacts"]],
  session_inscriptions: [["session_inscriptions"]],
  factures: [["factures"]],
  paiements: [["paiements"], ["factures"]],
  contact_documents: [["contact-documents"]],
  prospects: [["prospects"]],
  devis: [["devis"]],
  emargements: [["emargements"]],
  document_templates: [["document_templates"]],
  catalogue_formations: [["catalogue_formations"]],
  email_templates: [["email_templates"]],
  generated_documents_v2: [["generated-docs-v2"]],
};

export function useSoftDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      table,
      id,
      reason,
    }: {
      table: SoftDeleteTable;
      id: string;
      reason?: string;
    }) => {
      // Use specific cascade function for sessions
      if (table === "sessions") {
        const { data, error } = await supabase.rpc("soft_delete_session", {
          p_session_id: id,
          p_reason: reason || null,
        });
        if (error) throw error;
        return data;
      }

      // Generic soft delete for other tables
      const { data, error } = await supabase.rpc("soft_delete_record", {
        p_table_name: table,
        p_record_id: id,
        p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { table }) => {
      const keys = tableQueryKeys[table] || [[table]];
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      // Also invalidate trash
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      toast.success(`${tableLabels[table]} envoyé(e) à la corbeille`);
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}

export function useRestoreRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      table,
      id,
    }: {
      table: SoftDeleteTable;
      id: string;
    }) => {
      // Use specific restore for sessions
      if (table === "sessions") {
        const { data, error } = await supabase.rpc("restore_session", {
          p_session_id: id,
        });
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase.rpc("restore_record", {
        p_table_name: table,
        p_record_id: id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { table }) => {
      const keys = tableQueryKeys[table] || [[table]];
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      toast.success(`${tableLabels[table]} restauré(e) avec succès`);
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la restauration : ${error.message}`);
    },
  });
}

export function useDeleteImpact() {
  return useMutation({
    mutationFn: async ({
      table,
      id,
    }: {
      table: string;
      id: string;
    }) => {
      const { data, error } = await supabase.rpc("get_delete_impact", {
        p_table_name: table,
        p_record_id: id,
      });
      if (error) throw error;
      return data as Record<string, number>;
    },
  });
}

export { tableLabels };
