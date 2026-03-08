import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailTemplate {
  id: string;
  nom: string;
  sujet: string;
  contenu: string;
  categorie: string;
  variables: string[];
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateInsert {
  nom: string;
  sujet: string;
  contenu: string;
  categorie?: string;
  variables?: string[];
  actif?: boolean;
}

export interface EmailTemplateUpdate {
  nom?: string;
  sujet?: string;
  contenu?: string;
  categorie?: string;
  variables?: string[];
  actif?: boolean;
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .is("deleted_at", null)
        .order("categorie", { ascending: true })
        .order("nom", { ascending: true });

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

export function useEmailTemplate(id: string | null) {
  return useQuery({
    queryKey: ["email-templates", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as EmailTemplate | null;
    },
    enabled: !!id,
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: EmailTemplateInsert) => {
      const { data, error } = await supabase
        .from("email_templates")
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Modèle créé avec succès");
    },
    onError: (error: any) => {
      console.error("Error creating template:", error);
      toast.error("Erreur lors de la création");
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EmailTemplateUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("email_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Modèle mis à jour");
    },
    onError: (error: any) => {
      console.error("Error updating template:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Modèle supprimé");
    },
    onError: (error: any) => {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

// Fonction pour remplacer les variables dans un template
export function replaceTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  });
  return result;
}
