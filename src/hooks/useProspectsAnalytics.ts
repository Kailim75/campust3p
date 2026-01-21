import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export interface ProspectAnalytics {
  totalProspects: number;
  convertedCount: number;
  conversionRate: number;
  avgConversionDays: number | null;
  bySource: { source: string; count: number }[];
  byFormation: { formation: string; count: number }[];
  byStatus: { status: string; count: number }[];
  conversionTrend: { month: string; converted: number; total: number }[];
}

export function useProspectsAnalytics() {
  return useQuery({
    queryKey: ["prospects-analytics"],
    queryFn: async (): Promise<ProspectAnalytics> => {
      const { data: prospects, error } = await supabase
        .from("prospects")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      const totalProspects = prospects.length;
      const convertedProspects = prospects.filter((p) => p.statut === "converti");
      const convertedCount = convertedProspects.length;
      const conversionRate = totalProspects > 0 ? (convertedCount / totalProspects) * 100 : 0;

      // Calculate average conversion time
      let avgConversionDays: number | null = null;
      if (convertedCount > 0) {
        const conversionDays = convertedProspects
          .filter((p) => p.updated_at && p.created_at)
          .map((p) => differenceInDays(new Date(p.updated_at), new Date(p.created_at)));
        
        if (conversionDays.length > 0) {
          avgConversionDays = Math.round(
            conversionDays.reduce((a, b) => a + b, 0) / conversionDays.length
          );
        }
      }

      // Group by source
      const sourceMap = new Map<string, number>();
      prospects.forEach((p) => {
        const source = p.source || "Non défini";
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      });
      const bySource = Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      // Group by formation
      const formationMap = new Map<string, number>();
      prospects.forEach((p) => {
        const formation = p.formation_souhaitee || "Non défini";
        formationMap.set(formation, (formationMap.get(formation) || 0) + 1);
      });
      const byFormation = Array.from(formationMap.entries())
        .map(([formation, count]) => ({ formation, count }))
        .sort((a, b) => b.count - a.count);

      // Group by status
      const statusLabels: Record<string, string> = {
        nouveau: "Nouveau",
        contacte: "Contacté",
        relance: "À relancer",
        converti: "Converti",
        perdu: "Perdu",
      };
      const statusMap = new Map<string, number>();
      prospects.forEach((p) => {
        const status = statusLabels[p.statut] || p.statut;
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      const byStatus = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }));

      // Conversion trend by month (last 6 months)
      const monthMap = new Map<string, { converted: number; total: number }>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(key, { converted: 0, total: 0 });
      }
      
      prospects.forEach((p) => {
        const date = new Date(p.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthMap.has(key)) {
          const entry = monthMap.get(key)!;
          entry.total++;
          if (p.statut === "converti") {
            entry.converted++;
          }
        }
      });

      const conversionTrend = Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        ...data,
      }));

      return {
        totalProspects,
        convertedCount,
        conversionRate,
        avgConversionDays,
        bySource,
        byFormation,
        byStatus,
        conversionTrend,
      };
    },
  });
}
