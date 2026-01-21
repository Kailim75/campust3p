import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PedagogicalDocumentType = "inscription" | "entree_sortie" | "test_positionnement" | "attestation" | "autre";
export type DocumentStatus = "actif" | "archive";

export interface PedagogicalDocument {
  id: string;
  contact_id: string;
  session_id: string | null;
  document_type: PedagogicalDocumentType;
  file_path: string;
  file_name: string;
  version: number;
  status: DocumentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PedagogicalDocumentInsert {
  contact_id: string;
  session_id?: string | null;
  document_type: PedagogicalDocumentType;
  file_path: string;
  file_name: string;
  notes?: string | null;
}

export function usePedagogicalDocuments(contactId: string) {
  return useQuery({
    queryKey: ["pedagogical-documents", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedagogical_documents")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PedagogicalDocument[];
    },
    enabled: !!contactId,
  });
}

export function usePedagogicalDocumentsBySession(sessionId: string) {
  return useQuery({
    queryKey: ["pedagogical-documents", "session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedagogical_documents")
        .select(`
          *,
          contact:contacts(id, nom, prenom)
        `)
        .eq("session_id", sessionId)
        .eq("status", "actif")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useUploadPedagogicalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      sessionId,
      documentType,
      file,
      notes,
    }: {
      contactId: string;
      sessionId?: string;
      documentType: PedagogicalDocumentType;
      file: File;
      notes?: string;
    }) => {
      // Upload file to storage
      const filePath = `${contactId}/${documentType}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("pedagogie")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from("pedagogical_documents")
        .insert({
          contact_id: contactId,
          session_id: sessionId || null,
          document_type: documentType,
          file_path: filePath,
          file_name: file.name,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pedagogical-documents", variables.contactId] });
      if (variables.sessionId) {
        queryClient.invalidateQueries({ queryKey: ["pedagogical-documents", "session", variables.sessionId] });
      }
      toast.success("Document pédagogique uploadé");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'upload du document");
      console.error(error);
    },
  });
}

export function useDeletePedagogicalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId, filePath }: { id: string; contactId: string; filePath: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("pedagogie")
        .remove([filePath]);

      if (storageError) console.error("Storage delete error:", storageError);

      // Delete record
      const { error } = await supabase
        .from("pedagogical_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ["pedagogical-documents", contactId] });
      toast.success("Document supprimé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}

export function useDownloadPedagogicalDocument() {
  return useMutation({
    mutationFn: async ({ filePath, fileName }: { filePath: string; fileName: string }) => {
      const { data, error } = await supabase.storage
        .from("pedagogie")
        .download(filePath);

      if (error) throw error;

      // Trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      toast.error("Erreur lors du téléchargement");
      console.error(error);
    },
  });
}

export const DOCUMENT_TYPE_LABELS: Record<PedagogicalDocumentType, string> = {
  inscription: "Fiche d'inscription",
  entree_sortie: "Fiche entrée/sortie",
  test_positionnement: "Test de positionnement",
  attestation: "Attestation",
  autre: "Autre document",
};
