import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface DocumentEnvoi {
  id: string;
  contact_id: string | null;
  formateur_id: string | null;
  session_id: string | null;
  document_type: string;
  document_name: string;
  document_path: string | null;
  envoi_type: string;
  statut: string;
  date_envoi: string;
  date_reception: string | null;
  envoyé_par: string | null;
  metadata: Json | null;
  commentaires: string | null;
  created_at: string;
}

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

export function useDocumentEnvois(contactId?: string | null) {
  return useQuery({
    queryKey: ["document_envois", contactId],
    queryFn: async () => {
      let query = supabase
        .from("document_envois")
        .select("*")
        .order("date_envoi", { ascending: false });

      if (contactId) {
        query = query.eq("contact_id", contactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DocumentEnvoi[];
    },
    enabled: contactId ? true : false,
  });
}

export function useAllDocumentEnvois() {
  return useQuery({
    queryKey: ["document_envois", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_envois")
        .select("*")
        .order("date_envoi", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as DocumentEnvoi[];
    },
  });
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
    },
  });
}
