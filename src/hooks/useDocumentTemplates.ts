import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DocumentTemplate {
  id: string;
  nom: string;
  type_document: string;
  categorie: string;
  contenu: string;
  variables: string[] | null;
  actif: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentTemplateInsert = Omit<DocumentTemplate, "id" | "created_at" | "updated_at">;

export const documentTypes = [
  { value: "convention", label: "Convention de formation" },
  { value: "contrat", label: "Contrat de formation" },
  { value: "attestation", label: "Attestation de formation" },
  { value: "convocation", label: "Convocation" },
  { value: "reglement", label: "Règlement intérieur" },
  { value: "facture", label: "Facture" },
  { value: "devis", label: "Devis" },
  { value: "autre", label: "Autre" },
] as const;

export const documentCategories = [
  { value: "formation", label: "Formation" },
  { value: "administratif", label: "Administratif" },
  { value: "communication", label: "Communication" },
  { value: "comptabilite", label: "Comptabilité" },
] as const;

// Variables disponibles pour la personnalisation
export const availableVariables = [
  // Contact
  { key: "civilite", label: "Civilité", category: "Contact" },
  { key: "nom", label: "Nom", category: "Contact" },
  { key: "prenom", label: "Prénom", category: "Contact" },
  { key: "email", label: "Email", category: "Contact" },
  { key: "telephone", label: "Téléphone", category: "Contact" },
  { key: "rue", label: "Adresse (rue)", category: "Contact" },
  { key: "code_postal", label: "Code postal", category: "Contact" },
  { key: "ville", label: "Ville", category: "Contact" },
  { key: "date_naissance", label: "Date de naissance", category: "Contact" },
  { key: "ville_naissance", label: "Ville de naissance", category: "Contact" },
  { key: "pays_naissance", label: "Pays de naissance", category: "Contact" },
  { key: "numero_permis", label: "N° Permis", category: "Contact" },
  { key: "prefecture_permis", label: "Préfecture permis", category: "Contact" },
  { key: "date_delivrance_permis", label: "Date délivrance permis", category: "Contact" },
  { key: "numero_carte_professionnelle", label: "N° Carte professionnelle", category: "Contact" },
  { key: "prefecture_carte", label: "Préfecture carte", category: "Contact" },
  { key: "date_expiration_carte", label: "Date expiration carte", category: "Contact" },
  { key: "formation", label: "Type de formation", category: "Contact" },
  // Session
  { key: "session_nom", label: "Nom de la session", category: "Session" },
  { key: "session_date_debut", label: "Date de début", category: "Session" },
  { key: "session_date_fin", label: "Date de fin", category: "Session" },
  { key: "session_lieu", label: "Lieu", category: "Session" },
  { key: "session_formateur", label: "Formateur", category: "Session" },
  { key: "session_prix", label: "Prix", category: "Session" },
  { key: "session_duree", label: "Durée (heures)", category: "Session" },
  { key: "session_places", label: "Places totales", category: "Session" },
  // Dates
  { key: "date_jour", label: "Date du jour", category: "Dates" },
  { key: "annee", label: "Année en cours", category: "Dates" },
] as const;

export function useDocumentTemplates() {
  return useQuery({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .order("categorie", { ascending: true })
        .order("nom", { ascending: true });

      if (error) throw error;
      return data as DocumentTemplate[];
    },
  });
}

export function useDocumentTemplate(id: string | null) {
  return useQuery({
    queryKey: ["document-template", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: DocumentTemplateInsert) => {
      const { data, error } = await supabase
        .from("document_templates")
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Modèle créé avec succès");
    },
    onError: (error) => {
      console.error("Create error:", error);
      toast.error("Erreur lors de la création du modèle");
    },
  });
}

export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DocumentTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("document_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Modèle mis à jour");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Modèle supprimé");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

// Fonction pour extraire les variables d'un texte
export function extractVariables(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

// Fonction pour remplacer les variables par les valeurs
export function replaceVariables(
  template: string,
  contact: Record<string, any>,
  session?: Record<string, any>
): string {
  let result = template;
  
  // Variables du contact
  Object.entries(contact).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value?.toString() || "");
  });
  
  // Variables de session
  if (session) {
    result = result.replace(/\{\{session_nom\}\}/g, session.nom || "");
    result = result.replace(/\{\{session_date_debut\}\}/g, session.date_debut || "");
    result = result.replace(/\{\{session_date_fin\}\}/g, session.date_fin || "");
    result = result.replace(/\{\{session_lieu\}\}/g, session.lieu || "");
    result = result.replace(/\{\{session_formateur\}\}/g, session.formateur || "");
    result = result.replace(/\{\{session_prix\}\}/g, session.prix?.toString() || "");
    result = result.replace(/\{\{session_duree\}\}/g, session.duree_heures?.toString() || "");
    result = result.replace(/\{\{session_places\}\}/g, session.places_totales?.toString() || "");
  }
  
  // Variables de date
  const now = new Date();
  result = result.replace(/\{\{date_jour\}\}/g, now.toLocaleDateString("fr-FR"));
  result = result.replace(/\{\{annee\}\}/g, now.getFullYear().toString());
  
  return result;
}
