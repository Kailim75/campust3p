import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContactDocument {
  id: string;
  contact_id: string;
  nom: string;
  type_document: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  date_expiration: string | null;
  commentaires: string | null;
  created_at: string;
  updated_at: string;
}

export const documentTypes = [
  { value: "cni", label: "Carte d'identité" },
  { value: "permis", label: "Permis de conduire" },
  { value: "casier", label: "Casier judiciaire" },
  { value: "certificat_medical", label: "Certificat médical" },
  { value: "attestation", label: "Attestation de formation" },
  { value: "attestation_formation", label: "Attestation de formation continue" },
  { value: "contrat", label: "Contrat de formation" },
  { value: "contrat_formation", label: "Contrat de formation professionnelle" },
  { value: "convention", label: "Convention" },
  { value: "convention_stage", label: "Convention de stage" },
  { value: "reglement_interieur", label: "Règlement intérieur signé" },
  { value: "reglement", label: "Règlement intérieur" },
  { value: "programme", label: "Programme de formation" },
  { value: "convocation", label: "Convocation" },
  { value: "feuille_emargement", label: "Feuille d'émargement" },
  { value: "evaluation", label: "Évaluation" },
  { value: "autre", label: "Autre" },
] as const;

export function useContactDocuments(contactId: string | null) {
  return useQuery({
    queryKey: ["contact-documents", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("contact_documents")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContactDocument[];
    },
    enabled: !!contactId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      file,
      nom,
      typeDocument,
      dateExpiration,
      commentaires,
    }: {
      contactId: string;
      file: File;
      nom: string;
      typeDocument: string;
      dateExpiration?: string;
      commentaires?: string;
    }) => {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${contactId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("contact-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Insert metadata
      const { data, error } = await supabase
        .from("contact_documents")
        .insert({
          contact_id: contactId,
          nom,
          type_document: typeDocument,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          date_expiration: dateExpiration || null,
          commentaires: commentaires || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-documents", variables.contactId] });
      toast.success("Document ajouté avec succès");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'ajout du document");
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, contactId }: { id: string; filePath: string; contactId: string }) => {
      // Soft delete - keep the file in storage, just mark as deleted
      const { error } = await (supabase as any)
        .from("contact_documents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return { contactId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contact-documents", data.contactId] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      toast.success("Document envoyé à la corbeille");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function getDocumentUrl(filePath: string) {
  const { data } = supabase.storage
    .from("contact-documents")
    .getPublicUrl(filePath);
  return data.publicUrl;
}

export async function downloadDocument(filePath: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from("contact-documents")
    .download(filePath);

  if (error) {
    toast.error("Erreur lors du téléchargement");
    return;
  }

  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
