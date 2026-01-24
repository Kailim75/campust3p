import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LmsLesson {
  id: string;
  module_id: string;
  titre: string;
  description: string | null;
  contenu_html: string | null;
  ordre: number;
  duree_estimee_min: number;
  niveau: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface LmsLessonInsert {
  module_id: string;
  titre: string;
  description?: string | null;
  contenu_html?: string | null;
  ordre?: number;
  duree_estimee_min?: number;
  niveau?: string;
  actif?: boolean;
}

export function useLmsLessons(moduleId?: string | null) {
  return useQuery({
    queryKey: ["lms-lessons", moduleId],
    queryFn: async () => {
      let query = supabase
        .from("lms_lessons")
        .select("*")
        .order("ordre", { ascending: true });

      if (moduleId) {
        query = query.eq("module_id", moduleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LmsLesson[];
    },
  });
}

export function useLmsLesson(id: string | null) {
  return useQuery({
    queryKey: ["lms-lesson", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("lms_lessons")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as LmsLesson;
    },
    enabled: !!id,
  });
}

export function useCreateLmsLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lesson: LmsLessonInsert) => {
      const { data, error } = await supabase
        .from("lms_lessons")
        .insert(lesson)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lms-lessons", variables.module_id] });
      toast.success("Leçon créée avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });
}

export function useUpdateLmsLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LmsLesson> & { id: string }) => {
      const { data, error } = await supabase
        .from("lms_lessons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-lessons"] });
      toast.success("Leçon mise à jour");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });
}

export function useDeleteLmsLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lms_lessons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-lessons"] });
      toast.success("Leçon supprimée");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });
}
