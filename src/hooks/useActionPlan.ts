import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ActionPlanItem {
  priorite: number;
  titre: string;
  description: string;
  categorie: "commercial" | "administratif" | "financier" | "qualite" | "strategie";
  impact_estime_euros?: number;
  responsable: "admin" | "commercial" | "formateur" | "direction";
  duree_estimee_minutes?: number;
  anomaly_ids?: string[];
}

export interface ActionPlan {
  plan_date: string;
  resume_executif: string;
  actions: ActionPlanItem[];
  score_urgence_global: number;
}

export function useActionPlan() {
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(async (context: {
    anomalies: any[];
    scorings: any[];
    latestScore: any;
    projections: any;
  }) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ia-action-plan", {
        body: context,
      });

      if (error) {
        const msg = error.message || "Erreur lors de la génération";
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

      setPlan(data);
      toast.success("Plan d'action généré avec succès");
      return data;
    } catch (e) {
      console.error("Action plan error:", e);
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { plan, isGenerating, generate };
}
