import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DocumentTemplateFile {
  id: string;
  nom: string;
  description: string | null;
  type_fichier: "pdf" | "docx" | "xlsx";
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  variables: string[];
  categorie: string;
  type_document: string | null;
  formation_type: string | null;
  actif: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Types de formations disponibles
export const formationTypes = [
  { value: "TAXI", label: "TAXI" },
  { value: "VTC", label: "VTC" },
  { value: "VMDTR", label: "VMDTR" },
  { value: "ACC VTC", label: "ACC VTC" },
  { value: "ACC VTC 75", label: "ACC VTC 75" },
  { value: "Formation continue Taxi", label: "Formation continue Taxi" },
  { value: "Formation continue VTC", label: "Formation continue VTC" },
  { value: "Mobilité Taxi", label: "Mobilité Taxi" },
] as const;

// Types de documents
export const templateDocumentTypes = [
  { value: "attestation", label: "Attestation de formation" },
  { value: "emargement", label: "Feuille d'émargement" },
  { value: "convention", label: "Convention" },
  { value: "convocation", label: "Convocation" },
  { value: "autre", label: "Autre" },
] as const;

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
      type_document,
      formation_type,
      variables,
    }: {
      file: File;
      nom: string;
      description?: string;
      categorie: string;
      type_document?: string;
      formation_type?: string;
      variables: string[];
    }) => {
      // Déterminer le type de fichier
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !["pdf", "docx", "xlsx"].includes(extension)) {
        throw new Error("Format de fichier non supporté. Utilisez PDF, DOCX ou XLSX.");
      }

      const type_fichier = extension as "pdf" | "docx" | "xlsx";
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
          type_document: type_document || "autre",
          formation_type: formation_type || null,
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

// Set a template as default for its document type
export function useSetDefaultTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, isDefault }: { templateId: string; isDefault: boolean }) => {
      // Use type assertion since the types haven't regenerated yet
      const { error } = await supabase
        .from("document_template_files")
        .update({ is_default: isDefault } as Record<string, unknown>)
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-template-files"] });
      toast.success("Modèle par défaut mis à jour");
    },
    onError: (error) => {
      console.error("Set default error:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

// Get the default template for a specific document type and optionally formation type
// Priority: 1) Specific formation_type match 2) Global default (formation_type = null)
export async function getDefaultTemplate(typeDocument: string, formationType?: string): Promise<DocumentTemplateFile | null> {
  // First try to find a specific default for this formation type
  if (formationType) {
    const { data: specificDefault } = await supabase
      .from("document_template_files")
      .select("*")
      .eq("type_document", typeDocument)
      .eq("formation_type", formationType)
      .eq("actif", true);

    const filtered = (specificDefault || []).filter((t: Record<string, unknown>) => t.is_default === true);
    if (filtered.length > 0) {
      return filtered[0] as unknown as DocumentTemplateFile;
    }
  }

  // Fall back to global default (no formation_type)
  const { data: globalDefaults } = await supabase
    .from("document_template_files")
    .select("*")
    .eq("type_document", typeDocument)
    .is("formation_type", null)
    .eq("actif", true);

  const filtered = (globalDefaults || []).filter((t: Record<string, unknown>) => t.is_default === true);
  return filtered.length > 0 ? (filtered[0] as unknown as DocumentTemplateFile) : null;
}

// Hook version of getDefaultTemplate
export function useDefaultTemplate(typeDocument: string, formationType?: string) {
  return useQuery({
    queryKey: ["document-template-files", "default", typeDocument, formationType],
    queryFn: () => getDefaultTemplate(typeDocument, formationType),
    enabled: !!typeDocument,
  });
}

// Get all defaults for display purposes
export function useDefaultTemplates() {
  return useQuery({
    queryKey: ["document-template-files", "defaults"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_template_files")
        .select("*")
        .eq("actif", true)
        .order("type_document")
        .order("formation_type");

      if (error) throw error;
      // Filter is_default in JS since it's a new column
      return (data || []).filter((t: Record<string, unknown>) => t.is_default === true) as unknown as DocumentTemplateFile[];
    },
  });
}

export function useGeneratedDocuments(contactId: string | null) {
  return useQuery({
    queryKey: ["generated-documents", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("generated_documents_legacy")
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
      centreId,
      templateFileId,
      templateTextId,
      nom,
      fileBlob,
      sessionId,
      metadata,
      mimeType = "application/pdf",
      fileExtension = "pdf",
    }: {
      contactId: string;
      centreId: string;
      templateFileId?: string;
      templateTextId?: string;
      nom: string;
      fileBlob: Blob;
      sessionId?: string;
      metadata?: Record<string, unknown>;
      mimeType?: string;
      fileExtension?: string;
    }) => {
      // Upload du document généré — path must start with centreId for RLS
      const fileName = `${Date.now()}-${nom.replace(/[^a-zA-Z0-9.-]/g, "_")}.${fileExtension}`;
      const filePath = `${centreId}/${contactId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("generated-documents")
        .upload(filePath, fileBlob, {
          contentType: mimeType,
        });

      if (uploadError) throw uploadError;

      // Créer l'entrée dans la base de données
      const { data, error } = await supabase
        .from("generated_documents_legacy")
        .insert([{
          contact_id: contactId,
          template_file_id: templateFileId || null,
          template_text_id: templateTextId || null,
          nom,
          file_path: filePath,
          file_size: fileBlob.size,
          mime_type: mimeType,
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
        .from("generated_documents_legacy")
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
