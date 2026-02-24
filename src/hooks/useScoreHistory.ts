import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScoreHistory {
  id: string;
  centre_id: string | null;
  score_global: number;
  score_sante: number;
  score_commercial: number;
  score_admin: number;
  score_financier: number;
  score_risque_ca: number;
  details: Record<string, any>;
  ponderations: Record<string, number>;
  date_snapshot: string;
  created_at: string;
}

export function useLatestScoreHistory() {
  return useQuery({
    queryKey: ["ia-score-history", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_score_history")
        .select("*")
        .order("date_snapshot", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ScoreHistory | null;
    },
  });
}

export function useScoreHistoryTrend(days = 30) {
  return useQuery({
    queryKey: ["ia-score-history", "trend", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("ia_score_history")
        .select("*")
        .gte("date_snapshot", since)
        .order("date_snapshot", { ascending: true });

      if (error) throw error;
      return data as ScoreHistory[];
    },
  });
}

export function useRunCentreScoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ponderations?: Record<string, number>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Non authentifié");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/centre-scoring`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ponderations }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur serveur" }));
        throw new Error(err.error || "Erreur lors du scoring centre");
      }

      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ia-score-history"] });
      toast.success("Scoring centre calculé avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
