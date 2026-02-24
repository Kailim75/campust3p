import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProspectScoring {
  id: string;
  centre_id: string | null;
  prospect_id: string;
  score_conversion: number;
  probabilite_conversion: number;
  valeur_potentielle_euros: number;
  niveau_chaleur: "froid" | "tiede" | "chaud" | "brulant";
  delai_optimal_relance: number | null;
  facteurs_positifs: string[];
  facteurs_negatifs: string[];
  date_derniere_analyse: string;
  created_at: string;
  updated_at: string;
}

export function useProspectScorings() {
  return useQuery({
    queryKey: ["ia-prospect-scoring"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_prospect_scoring")
        .select("*")
        .order("score_conversion", { ascending: false });

      if (error) throw error;
      return data as ProspectScoring[];
    },
  });
}

export function useRunProspectScoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Non authentifié");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/prospect-scoring`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur serveur" }));
        throw new Error(err.error || "Erreur lors du scoring");
      }

      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ia-prospect-scoring"] });
      toast.success(`Scoring terminé : ${data.prospects_scored} prospects analysés`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
