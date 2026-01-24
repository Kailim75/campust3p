import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Json } from "@/integrations/supabase/types";

export type BimProgressionStatut = Database["public"]["Enums"]["bim_progression_statut"];

export interface BimProgression {
  id: string;
  contact_id: string;
  projet_id: string;
  session_id: string | null;
  statut: BimProgressionStatut;
  progression_pct: number | null;
  scenes_completees: number | null;
  scenes_total: number | null;
  temps_total_sec: number | null;
  score_moyen_pct: number | null;
  meilleur_score_pct: number | null;
  started_at: string | null;
  completed_at: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BimInteraction {
  id: string;
  contact_id: string;
  projet_id: string;
  scene_id: string;
  session_id: string | null;
  statut: BimProgressionStatut;
  temps_passe_sec: number | null;
  poi_consultes: string[] | null;
  actions_log: Json | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BimEvaluation {
  id: string;
  contact_id: string;
  projet_id: string;
  scene_id: string;
  interaction_id: string;
  type_evaluation: Database["public"]["Enums"]["bim_evaluation_type"];
  tentative_numero: number;
  score_pct: number;
  reussi: boolean;
  seuil_applique: number;
  points_obtenus: number | null;
  points_max: number | null;
  nb_correct: number | null;
  nb_total: number | null;
  temps_passe_sec: number | null;
  reponses_detail: Json | null;
  annotations: Json | null;
  started_at: string | null;
  completed_at: string;
  created_at: string;
}

// Hooks pour les progressions
export function useBimProgressions(projetId?: string, contactId?: string) {
  return useQuery({
    queryKey: ["bim-progressions", projetId, contactId],
    queryFn: async () => {
      let query = supabase
        .from("bim_progressions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (projetId) {
        query = query.eq("projet_id", projetId);
      }
      if (contactId) {
        query = query.eq("contact_id", contactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BimProgression[];
    },
  });
}

export function useBimContactProgression(contactId: string | null, projetId: string | null) {
  return useQuery({
    queryKey: ["bim-progression", contactId, projetId],
    queryFn: async () => {
      if (!contactId || !projetId) return null;
      
      const { data, error } = await supabase
        .from("bim_progressions")
        .select("*")
        .eq("contact_id", contactId)
        .eq("projet_id", projetId)
        .maybeSingle();

      if (error) throw error;
      return data as BimProgression | null;
    },
    enabled: !!contactId && !!projetId,
  });
}

// Hooks pour les interactions
export function useBimInteractions(projetId?: string, contactId?: string) {
  return useQuery({
    queryKey: ["bim-interactions", projetId, contactId],
    queryFn: async () => {
      let query = supabase
        .from("bim_interactions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (projetId) {
        query = query.eq("projet_id", projetId);
      }
      if (contactId) {
        query = query.eq("contact_id", contactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BimInteraction[];
    },
  });
}

export function useCreateBimInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interaction: Omit<BimInteraction, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("bim_interactions")
        .insert(interaction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bim-interactions"] });
      queryClient.invalidateQueries({ queryKey: ["bim-progressions"] });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'enregistrement: " + error.message);
    },
  });
}

export function useUpdateBimInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BimInteraction> & { id: string }) => {
      const { data, error } = await supabase
        .from("bim_interactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bim-interactions"] });
      queryClient.invalidateQueries({ queryKey: ["bim-progressions"] });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });
}

// Hooks pour les évaluations
export function useBimEvaluations(projetId?: string, contactId?: string) {
  return useQuery({
    queryKey: ["bim-evaluations", projetId, contactId],
    queryFn: async () => {
      let query = supabase
        .from("bim_evaluations")
        .select("*")
        .order("completed_at", { ascending: false });

      if (projetId) {
        query = query.eq("projet_id", projetId);
      }
      if (contactId) {
        query = query.eq("contact_id", contactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BimEvaluation[];
    },
  });
}

export function useCreateBimEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evaluation: Omit<BimEvaluation, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("bim_evaluations")
        .insert(evaluation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bim-evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["bim-progressions"] });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'enregistrement: " + error.message);
    },
  });
}
