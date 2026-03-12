import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface DocumentEnvoiInsert {
  contact_id?: string | null;
  formateur_id?: string | null;
  session_id?: string | null;
  document_type: string;
  document_name: string;
  document_path?: string | null;
  envoi_type?: string;
  statut?: string;
  metadata?: Json | null;
  commentaires?: string | null;
}

export function useCreateDocumentEnvoi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (envoi: DocumentEnvoiInsert) => {
      const { data, error } = await supabase
        .from("document_envois")
        .insert(envoi)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_envois"] });
      queryClient.invalidateQueries({ queryKey: ["document-envoi-history"] });
    },
  });
}

export function useBulkCreateDocumentEnvois() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (envois: DocumentEnvoiInsert[]) => {
      const { data, error } = await supabase
        .from("document_envois")
        .insert(envois)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_envois"] });
      queryClient.invalidateQueries({ queryKey: ["document-envoi-history"] });
    },
  });
}

export function useUpdateDocumentEnvoi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DocumentEnvoiInsert> }) => {
      const { data, error } = await supabase
        .from("document_envois")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_envois"] });
      queryClient.invalidateQueries({ queryKey: ["document-envoi-history"] });
    },
  });
}
