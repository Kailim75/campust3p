import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LmsQuiz {
  id: string;
  lesson_id: string | null;
  module_id: string | null;
  titre: string;
  description: string | null;
  nb_questions: number;
  temps_limite_min: number | null;
  seuil_reussite_pct: number;
  tentatives_max: number | null;
  afficher_correction: boolean;
  melanger_questions: boolean;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionAnswer {
  id: string;
  texte: string;
  is_correct: boolean;
  explication?: string;
}

export interface LmsQuestion {
  id: string;
  quiz_id: string | null;
  exam_id: string | null;
  competency_id: string | null;
  theme_id: string | null;
  type: string;
  enonce: string;
  reponses: QuestionAnswer[];
  explication: string | null;
  niveau: string;
  points: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttemptAnswer {
  question_id: string;
  selected_ids: string[];
  is_correct: boolean;
  points_earned: number;
}

export interface LmsQuizAttempt {
  id: string;
  quiz_id: string;
  contact_id: string;
  attempt_number: number | null;
  score_pct: number;
  reussi: boolean;
  nb_correct: number;
  nb_total: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useLmsQuizzes(moduleId?: string, lessonId?: string) {
  return useQuery({
    queryKey: ["lms-quizzes", moduleId, lessonId],
    queryFn: async () => {
      let query = supabase
        .from("lms_quizzes")
        .select("*")
        .eq("actif", true)
        .order("created_at", { ascending: false });

      if (moduleId) query = query.eq("module_id", moduleId);
      if (lessonId) query = query.eq("lesson_id", lessonId);

      const { data, error } = await query;
      if (error) throw error;
      return data as LmsQuiz[];
    },
  });
}

export function useLmsQuiz(quizId: string | undefined) {
  return useQuery({
    queryKey: ["lms-quiz", quizId],
    queryFn: async () => {
      if (!quizId) return null;
      const { data, error } = await supabase
        .from("lms_quizzes")
        .select("*")
        .eq("id", quizId)
        .single();
      if (error) throw error;
      return data as LmsQuiz;
    },
    enabled: !!quizId,
  });
}

export function useLmsQuizQuestions(quizId: string | undefined) {
  return useQuery({
    queryKey: ["lms-quiz-questions", quizId],
    queryFn: async () => {
      if (!quizId) return [];
      const { data, error } = await supabase
        .from("lms_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("actif", true)
        .order("created_at");
      if (error) throw error;
      // Parse reponses from JSON
      return (data || []).map((q) => ({
        ...q,
        reponses: (q.reponses as unknown) as QuestionAnswer[],
      })) as LmsQuestion[];
    },
    enabled: !!quizId,
  });
}

export function useAllLmsQuizzes() {
  return useQuery({
    queryKey: ["lms-quizzes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lms_quizzes")
        .select(`*, lms_modules(titre), lms_lessons(titre)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllLmsQuestions() {
  return useQuery({
    queryKey: ["lms-questions-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lms_questions")
        .select(`*, lms_quizzes(titre), lms_themes(libelle), lms_competencies(libelle)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useLmsQuizMutations() {
  const queryClient = useQueryClient();

  const createQuiz = useMutation({
    mutationFn: async (quiz: Record<string, unknown>) => {
      const { data, error } = await supabase.from("lms_quizzes").insert(quiz as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-quizzes"] });
      toast.success("Quiz créé avec succès");
    },
    onError: () => toast.error("Erreur lors de la création du quiz"),
  });

  const updateQuiz = useMutation({
    mutationFn: async ({ id, ...quiz }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase.from("lms_quizzes").update(quiz as never).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-quizzes"] });
      toast.success("Quiz mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lms_quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-quizzes"] });
      toast.success("Quiz supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  return { createQuiz, updateQuiz, deleteQuiz };
}

export function useLmsQuestionMutations() {
  const queryClient = useQueryClient();

  const createQuestion = useMutation({
    mutationFn: async (question: Record<string, unknown>) => {
      const { data, error } = await supabase.from("lms_questions").insert(question as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-questions"] });
      queryClient.invalidateQueries({ queryKey: ["lms-quiz-questions"] });
      toast.success("Question créée avec succès");
    },
    onError: () => toast.error("Erreur lors de la création de la question"),
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...question }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase.from("lms_questions").update(question as never).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-questions"] });
      queryClient.invalidateQueries({ queryKey: ["lms-quiz-questions"] });
      toast.success("Question mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lms_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-questions"] });
      queryClient.invalidateQueries({ queryKey: ["lms-quiz-questions"] });
      toast.success("Question supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  return { createQuestion, updateQuestion, deleteQuestion };
}

export function useLmsQuizAttempts(quizId?: string, contactId?: string) {
  return useQuery({
    queryKey: ["lms-quiz-attempts", quizId, contactId],
    queryFn: async () => {
      let query = supabase.from("lms_quiz_attempts").select("*").order("created_at", { ascending: false });
      if (quizId) query = query.eq("quiz_id", quizId);
      if (contactId) query = query.eq("contact_id", contactId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as LmsQuizAttempt[];
    },
    enabled: !!(quizId || contactId),
  });
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attempt: Record<string, unknown>) => {
      const { data, error } = await supabase.from("lms_quiz_attempts").insert(attempt as never).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lms-quiz-attempts"] }),
    onError: () => toast.error("Erreur lors de la soumission du quiz"),
  });
}
