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
      const { data, error } = await supabase.functions.invoke("ia-predictive-analysis", {
        body: context,
      });

      if (error) {
        const msg = error.message || "Erreur lors de l'analyse";
        if (msg.includes("429")) {
          toast.error("Limite de requêtes IA atteinte, réessayez plus tard");
          return null;
        }
        if (msg.includes("402")) {
          toast.error("Crédits IA insuffisants");
          return null;
        }
        throw new Error(msg);
      }

      setAnalysis(data);
      toast.success("Analyse prédictive terminée");
      return data;
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
