import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Json } from "@/integrations/supabase/types";

export type BimProjetStatut = Database["public"]["Enums"]["bim_projet_statut"];
export type BimFormationType = Database["public"]["Enums"]["bim_formation_type"];

export interface BimProjet {
  id: string;
  code: string;
  titre: string;
  description: string | null;
  type_formation: BimFormationType;
  module_id: string | null;
  lesson_id: string | null;
  objectifs_pedagogiques: string | null;
  competences_cibles: string[];
  seuil_validation_pct: number | null;
  duree_estimee_min: number | null;
  statut: BimProjetStatut;
  viewer_config: Json | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BimProjetInsert {
  code: string;
  titre: string;
  description?: string | null;
  type_formation?: BimFormationType;
  module_id?: string | null;
  lesson_id?: string | null;
  objectifs_pedagogiques?: string | null;
  competences_cibles?: string[];
  seuil_validation_pct?: number | null;
  duree_estimee_min?: number | null;
  statut?: BimProjetStatut;
  viewer_config?: Json | null;
}

export function useBimProjets() {
  return useQuery({
    queryKey: ["bim-projets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bim_projets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BimProjet[];
    },
  });
}

export function useBimProjet(id: string | null) {
  return useQuery({
    queryKey: ["bim-projet", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("bim_projets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as BimProjet;
    },
    enabled: !!id,
  });
}

export function useCreateBimProjet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projet: BimProjetInsert) => {
      const { data, error } = await supabase
        .from("bim_projets")
        .insert(projet)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bim-projets"] });
      toast.success("Projet BIM créé avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });
}

export function useUpdateBimProjet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BimProjet> & { id: string }) => {
      const { data, error } = await supabase
        .from("bim_projets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bim-projets"] });
      queryClient.invalidateQueries({ queryKey: ["bim-projet", variables.id] });
      toast.success("Projet BIM mis à jour");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });
}

export function useDeleteBimProjet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bim_projets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bim-projets"] });
      toast.success("Projet BIM supprimé");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });
}
