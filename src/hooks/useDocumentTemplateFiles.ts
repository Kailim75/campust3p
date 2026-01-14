import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DocumentTemplateFile {
  id: string;
  nom: string;
  description: string | null;
  type_fichier: "pdf" | "docx";
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  variables: string[];
  categorie: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface GeneratedDocument {
  id: string;
  contact_id: string;
  template_file_id: string | null;
  template_text_id: string | null;
  nom: string;
  file_path: string;
  file_size: number | null;
  mime_type: string;
  session_id: string | null;
  metadata: Record<string, unknown>;
  version: number;
  created_at: string;
  created_by: string | null;
}

export function useDocumentTemplateFiles() {
  return useQuery({
    queryKey: ["document-template-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_template_files")
        .select("*")
        .order("categorie", { ascending: true })
        .order("nom", { ascending: true });

      if (error) throw error;
      return data as DocumentTemplateFile[];
    },
  });
}

export function useUploadTemplateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      nom,
      description,
      categorie,
      variables,
    }: {
      file: File;
      nom: string;
      description?: string;
      categorie: string;
      variables: string[];
    }) => {
      // Déterminer le type de fichier
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !["pdf", "docx"].includes(extension)) {
        throw new Error("Format de fichier non supporté. Utilisez PDF ou DOCX.");
      }

      const type_fichier = extension as "pdf" | "docx";
      const mimeType = file.type;

      // Upload du fichier vers Supabase Storage
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("document-templates")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Créer l'entrée dans la base de données
      const { data, error } = await supabase
        .from("document_template_files")
        .insert({
          nom,
          description,
          type_fichier,
          file_path: filePath,
          file_size: file.size,
          mime_type: mimeType,
          variables,
          categorie,
          actif: true,
        })
        .select()
        .single();

      if (error) {
        // Nettoyer le fichier uploadé en cas d'erreur
        await supabase.storage.from("document-templates").remove([filePath]);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-template-files"] });
      toast.success("Modèle uploadé avec succès");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload du modèle");
    },
  });
}

export function useDeleteTemplateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: DocumentTemplateFile) => {
      // Supprimer le fichier du storage
      const { error: storageError } = await supabase.storage
        .from("document-templates")
        .remove([template.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Supprimer l'entrée de la base de données
      const { error } = await supabase
        .from("document_template_files")
        .delete()
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-template-files"] });
      toast.success("Modèle supprimé");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function useGeneratedDocuments(contactId: string | null) {
  return useQuery({
    queryKey: ["generated-documents", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("generated_documents")
        .select(`
          *,
          document_template_files (nom, type_fichier),
          document_templates (nom, type_document)
        `)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
}

export function useSaveGeneratedDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      templateFileId,
      templateTextId,
      nom,
      pdfBlob,
      sessionId,
      metadata,
    }: {
      contactId: string;
      templateFileId?: string;
      templateTextId?: string;
      nom: string;
      pdfBlob: Blob;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      // Upload le PDF généré
      const fileName = `${Date.now()}-${nom.replace(/[^a-zA-Z0-9.-]/g, "_")}.pdf`;
      const filePath = `${contactId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("generated-documents")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
        });

      if (uploadError) throw uploadError;

      // Créer l'entrée dans la base de données
      const { data, error } = await supabase
        .from("generated_documents")
        .insert([{
          contact_id: contactId,
          template_file_id: templateFileId || null,
          template_text_id: templateTextId || null,
          nom,
          file_path: filePath,
          file_size: pdfBlob.size,
          mime_type: "application/pdf",
          session_id: sessionId || null,
          metadata: (metadata || {}) as Record<string, never>,
        }])
        .select()
        .single();

      if (error) {
        await supabase.storage.from("generated-documents").remove([filePath]);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated-documents", variables.contactId] });
      toast.success("Document généré et sauvegardé");
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Erreur lors de la sauvegarde du document");
    },
  });
}

export function useDeleteGeneratedDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, contactId }: { id: string; filePath: string; contactId: string }) => {
      // Supprimer le fichier du storage
      await supabase.storage.from("generated-documents").remove([filePath]);

      // Supprimer l'entrée
      const { error } = await supabase
        .from("generated_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ["generated-documents", contactId] });
      toast.success("Document supprimé");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

export async function downloadGeneratedDocument(filePath: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from("generated-documents")
    .download(filePath);

  if (error) {
    toast.error("Erreur lors du téléchargement");
    throw error;
  }

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadTemplateFile(filePath: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from("document-templates")
    .download(filePath);

  if (error) {
    toast.error("Erreur lors du téléchargement");
    throw error;
  }

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Extraire les variables {{...}} d'un texte
export function extractVariablesFromText(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}
