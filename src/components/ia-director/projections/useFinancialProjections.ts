import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, endOfMonth, format, addDays } from "date-fns";
import type { ProspectScoring } from "@/hooks/useProspectScoring";

export interface ProjectionPoint {
  label: string;
  days: number;
  ca_pipeline: number;       // Revenue from pipeline (scoring × probability)
  ca_historique: number;     // Projected from historical trend
  ca_combine: number;        // Weighted blend
  nb_prospects: number;
}

export interface ProjectionData {
  projections: ProjectionPoint[];
  ca_mensuel_moyen: number;
  ca_mois_courant: number;
  taux_conversion_historique: number;
  total_pipeline: number;
}

/**
 * Compute financial projections at 30/60/90 days
 * combining pipeline scoring data with historical revenue trend.
 */
export function useFinancialProjections(scorings: ProspectScoring[]) {
  return useQuery({
    queryKey: ["ia-financial-projections", scorings.length],
    queryFn: async (): Promise<ProjectionData> => {
      const now = new Date();

      // ── 1. Fetch last 6 months of versements for historical average ──
      const months: { start: string; end: string }[] = [];
      for (let i = 1; i <= 6; i++) {
        const m = subMonths(now, i);
        months.push({
          start: format(startOfMonth(m), "yyyy-MM-dd"),
          end: format(endOfMonth(m), "yyyy-MM-dd"),
        });
      }

      const monthlyTotals: number[] = [];
      for (const m of months) {
        const { data } = await supabase
          .from("versements")
          .select("montant")
          .gte("date_encaissement", m.start)
          .lte("date_encaissement", m.end);
        const total = (data || []).reduce((s, v) => s + Number(v.montant), 0);
        monthlyTotals.push(total);
      }

      // Current month so far
      const currentStart = format(startOfMonth(now), "yyyy-MM-dd");
      const currentEnd = format(now, "yyyy-MM-dd");
      const { data: currentData } = await supabase
        .from("versements")
        .select("montant")
        .gte("date_encaissement", currentStart)
        .lte("date_encaissement", currentEnd);
      const caMoisCourant = (currentData || []).reduce((s, v) => s + Number(v.montant), 0);

      const caMensuelMoyen = monthlyTotals.length > 0
        ? monthlyTotals.reduce((s, v) => s + v, 0) / monthlyTotals.length
        : 0;

      // ── 2. Historical conversion rate ──
      // Count prospects that became clients in last 6 months
      const { count: convertedCount } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("statut", "client" as any)
        .gte("updated_at", format(subMonths(now, 6), "yyyy-MM-dd"));

      const totalProspects = scorings.length || 1;
      const tauxConversion = Math.min(
        ((convertedCount || 0) / totalProspects) * 100,
        100
      );

      // ── 3. Build projections at 30/60/90 days ──
      const horizons = [
        { label: "30 jours", days: 30 },
        { label: "60 jours", days: 60 },
        { label: "90 jours", days: 90 },
      ];

      const totalPipeline = scorings.reduce(
        (s, p) => s + Number(p.valeur_potentielle_euros),
        0
      );

      const projections: ProjectionPoint[] = horizons.map(({ label, days }) => {
        // Pipeline-based: prospects likely to convert within this window
        const eligibleProspects = scorings.filter((s) => {
          const relance = s.delai_optimal_relance ?? 999;
          // Hot prospects within window + some buffer for conversion time
          if (s.niveau_chaleur === "brulant") return relance <= days;
          if (s.niveau_chaleur === "chaud") return relance <= days * 0.8;
          if (s.niveau_chaleur === "tiede") return days >= 60 && relance <= days * 0.5;
          return false; // cold prospects excluded from short-term projections
        });

        const caPipeline = eligibleProspects.reduce(
          (sum, s) => sum + Number(s.valeur_potentielle_euros) * (s.probabilite_conversion / 100),
          0
        );

        // Historical-based: extrapolate monthly average
        const caHistorique = (caMensuelMoyen / 30) * days;

        // Weighted blend: 60% pipeline (data-driven), 40% historical (safety net)
        const caCombine = caPipeline * 0.6 + caHistorique * 0.4;

        return {
          label,
          days,
          ca_pipeline: Math.round(caPipeline),
          ca_historique: Math.round(caHistorique),
          ca_combine: Math.round(caCombine),
          nb_prospects: eligibleProspects.length,
        };
      });

      return {
        projections,
        ca_mensuel_moyen: Math.round(caMensuelMoyen),
        ca_mois_courant: Math.round(caMoisCourant),
        taux_conversion_historique: Math.round(tauxConversion * 10) / 10,
        total_pipeline: Math.round(totalPipeline),
      };
    },
    enabled: scorings.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
