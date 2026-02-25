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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Non authentifié");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ia-action-plan`,
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
        throw new Error(err.error || "Erreur lors de la génération");
      }

      const result = await resp.json();
      setPlan(result);
      toast.success("Plan d'action généré avec succès");
      return result;
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
