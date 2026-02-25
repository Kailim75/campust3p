import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PredictiveProspect {
  prospect_id: string;
  probabilite_conversion: number;
  canal_optimal: "email" | "telephone" | "sms" | "whatsapp" | "rdv_physique";
  moment_optimal: string;
  message_suggere?: string;
  facteurs_cles?: string[];
}

export interface PredictiveTendance {
  tendance: string;
  impact: "positif" | "negatif" | "neutre";
  recommandation: string;
}

export interface PredictiveSegment {
  nom: string;
  count: number;
  conversion_rate: number;
  strategie: string;
}

export interface PredictiveAnalysis {
  resume: string;
  taux_conversion_predit: number;
  ca_predit_30j: number;
  prospects_prioritaires: PredictiveProspect[];
  tendances: PredictiveTendance[];
  segments?: PredictiveSegment[];
}

export function usePredictiveAnalysis() {
  const [analysis, setAnalysis] = useState<PredictiveAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = useCallback(async (context: {
    scorings: any[];
    prospects: any[];
    historique: any[];
  }) => {
    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Non authentifié");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ia-predictive-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(context),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur serveur" }));
        if (resp.status === 429) {
          toast.error("Limite de requêtes IA atteinte, réessayez plus tard");
          return null;
        }
        if (resp.status === 402) {
          toast.error("Crédits IA insuffisants");
          return null;
        }
        throw new Error(err.error || "Erreur lors de l'analyse");
      }

      const result = await resp.json();
      setAnalysis(result);
      toast.success("Analyse prédictive terminée");
      return result;
    } catch (e) {
      console.error("Predictive analysis error:", e);
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analysis, isAnalyzing, analyze };
}
