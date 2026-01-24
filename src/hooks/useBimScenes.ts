import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface BimScene {
  id: string;
  projet_id: string;
  titre: string;
  description: string | null;
  ordre: number;
  fichier_3d_url: string | null;
  fichier_3d_format: string | null;
  thumbnail_url: string | null;
  camera_config: Json | null;
  points_interet: Json | null;
  questions_contextuelles: Json | null;
  consignes: string | null;
  duree_estimee_min: number | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface PointInteret {
  id: string;
  label: string;
  description?: string;
  position: { x: number; y: number; z: number };
  competence_cible?: string;
}

export interface QuestionContextuelle {
  id: string;
  question: string;
  options: string[];
  reponse_correcte: number;
  explication?: string;
  points?: number;
  theme_t3p?: string;
}

export interface BimSceneInsert {
  projet_id: string;
  titre: string;
  description?: string | null;
  ordre?: number;
  fichier_3d_url?: string | null;
  fichier_3d_format?: string | null;
  thumbnail_url?: string | null;
  camera_config?: Json | null;
  points_interet?: Json | null;
  questions_contextuelles?: Json | null;
  consignes?: string | null;
  duree_estimee_min?: number | null;
  actif?: boolean;
}

export function useBimScenes(projetId?: string | null) {
  return useQuery({
    queryKey: ["bim-scenes", projetId],
    queryFn: async () => {
      let query = supabase
        .from("bim_scenes")
        .select("*")
        .order("ordre", { ascending: true });

      if (projetId) {
        query = query.eq("projet_id", projetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BimScene[];
    },
  });
}

export function useBimScene(id: string | null) {
  return useQuery({
    queryKey: ["bim-scene", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("bim_scenes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as BimScene;
    },
    enabled: !!id,
  });
}

export function useCreateBimScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scene: BimSceneInsert) => {
      const { data, error } = await supabase
        .from("bim_scenes")
        .insert(scene)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bim-scenes"] });
      queryClient.invalidateQueries({ queryKey: ["bim-scenes", variables.projet_id] });
      toast.success("Scène BIM créée avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });
}

export function useUpdateBimScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BimScene> & { id: string }) => {
      const { data, error } = await supabase
        .from("bim_scenes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bim-scenes"] });
      queryClient.invalidateQueries({ queryKey: ["bim-scenes", data.projet_id] });
      queryClient.invalidateQueries({ queryKey: ["bim-scene", data.id] });
      toast.success("Scène BIM mise à jour");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });
}

export function useDeleteBimScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bim_scenes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bim-scenes"] });
      toast.success("Scène BIM supprimée");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });
}
