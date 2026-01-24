import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LmsFormation {
  id: string;
  catalogue_formation_id: string | null;
  code: string;
  nom: string;
  description: string | null;
  type_formation: string;
  categorie: string;
  duree_heures: number;
  seuil_reussite_pct: number;
  image_url: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
  updated_at: string;
}

export interface LmsFormationInsert {
  code: string;
  nom: string;
  categorie: string;
  type_formation: string;
  description?: string | null;
  duree_heures?: number;
  seuil_reussite_pct?: number;
  image_url?: string | null;
  actif?: boolean;
  ordre?: number;
  catalogue_formation_id?: string | null;
}

export function useLmsFormations() {
  return useQuery({
    queryKey: ["lms-formations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lms_formations")
        .select("*")
        .order("ordre", { ascending: true });

      if (error) throw error;
      return data as LmsFormation[];
    },
  });
}

export function useLmsFormation(id: string | null) {
  return useQuery({
    queryKey: ["lms-formation", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("lms_formations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as LmsFormation;
    },
    enabled: !!id,
  });
}

export function useCreateLmsFormation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formation: LmsFormationInsert) => {
      const { data, error } = await supabase
        .from("lms_formations")
        .insert(formation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-formations"] });
      toast.success("Formation créée avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });
}

export function useUpdateLmsFormation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LmsFormation> & { id: string }) => {
      const { data, error } = await supabase
        .from("lms_formations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-formations"] });
      queryClient.invalidateQueries({ queryKey: ["lms-formation", variables.id] });
      toast.success("Formation mise à jour");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });
}

export function useDeleteLmsFormation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lms_formations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-formations"] });
      toast.success("Formation supprimée");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });
}
