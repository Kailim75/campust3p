import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Anomaly } from "@/components/ia-director/audit/types";
import { create } from "zustand";

interface DirectorAlertsState {
  criticalCount: number;
  highCount: number;
  lastCheckAt: string | null;
  setCounts: (critical: number, high: number) => void;
  reset: () => void;
}

export const useDirectorAlertsStore = create<DirectorAlertsState>((set) => ({
  criticalCount: 0,
  highCount: 0,
  lastCheckAt: null,
  setCounts: (critical, high) => set({ criticalCount: critical, highCount: high, lastCheckAt: new Date().toISOString() }),
  reset: () => set({ criticalCount: 0, highCount: 0, lastCheckAt: null }),
}));

/**
 * Hook to monitor anomalies and fire toasts for critical alerts.
 * Should be mounted once at the app level.
 */
export function useDirectorAlerts(anomalies: Anomaly[], enabled = true) {
  const previousCriticalRef = useRef<Set<string>>(new Set());
  const { setCounts } = useDirectorAlertsStore();

  useEffect(() => {
    if (!enabled || anomalies.length === 0) return;

    const critical = anomalies.filter(a => a.severity === "critical" && a.status === "open");
    const high = anomalies.filter(a => a.severity === "high" && a.status === "open");

    setCounts(critical.length, high.length);

    // Detect NEW critical anomalies (not seen before)
    const currentIds = new Set(critical.map(a => a.id));
    const newCriticals = critical.filter(a => !previousCriticalRef.current.has(a.id));

    if (newCriticals.length > 0) {
      for (const anomaly of newCriticals.slice(0, 3)) {
        toast.error(`🚨 ${anomaly.title}`, {
          description: anomaly.impact_estime_euros > 0
            ? `Impact estimé : ${anomaly.impact_estime_euros.toLocaleString("fr-FR")}€`
            : anomaly.description,
          duration: 10000,
          action: {
            label: "Voir",
            onClick: () => {
              window.location.hash = "#ia-director";
            },
          },
        });
      }

      if (newCriticals.length > 3) {
        toast.error(`+${newCriticals.length - 3} autres alertes critiques`, {
          duration: 8000,
        });
      }
    }

    previousCriticalRef.current = currentIds;
  }, [anomalies, enabled, setCounts]);
}

/**
 * Hook to periodically check for critical anomalies in the background.
 * Runs a lightweight check every 5 minutes.
 */
export function useBackgroundAnomalyCheck(intervalMs = 5 * 60 * 1000) {
  const checkRef = useRef<ReturnType<typeof setInterval>>();
  const { setCounts } = useDirectorAlertsStore();

  const check = useCallback(async () => {
    try {
      // Quick check: count prospects with critical scoring
      const { data: hotProspects } = await supabase
        .from("ia_prospect_scoring")
        .select("id", { count: "exact", head: true })
        .in("niveau_chaleur", ["brulant"])
        .lte("delai_optimal_relance", 1);

      const { data: overdueInvoices } = await supabase
        .from("factures")
        .select("id", { count: "exact", head: true })
        .eq("statut", "en_retard" as any);

      const criticalCount = (hotProspects as any)?.length || 0;
      const highCount = (overdueInvoices as any)?.length || 0;

      if (criticalCount > 0 || highCount > 0) {
        setCounts(criticalCount, highCount);
      }
    } catch (e) {
      console.error("Background anomaly check error:", e);
    }
  }, [setCounts]);

  useEffect(() => {
    check(); // Initial check
    checkRef.current = setInterval(check, intervalMs);
    return () => {
      if (checkRef.current) clearInterval(checkRef.current);
    };
  }, [check, intervalMs]);
}
