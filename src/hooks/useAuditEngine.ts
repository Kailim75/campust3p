// ═══════════════════════════════════════════════════════════════
// Hook: useAuditEngine — Runs quick/deep audit on CRM data
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { runQuickAudit, runDeepAudit } from "@/components/ia-director/audit/auditRules";
import type { Anomaly, AuditContext, AuditResult, ActionLog } from "@/components/ia-director/audit/types";
import { buildAuditSummary } from "@/components/ia-director/audit/priorityEngine";
import { toast } from "sonner";

async function fetchAuditContext(): Promise<AuditContext> {
  // Use individual queries to avoid TS2589 deep type instantiation
  const q = (table: string, opts?: { filter?: Record<string, any>; order?: string; limit?: number }) => {
    let query = (supabase as any).from(table).select("*");
    if (opts?.filter) {
      Object.entries(opts.filter).forEach(([k, v]) => { query = query.eq(k, v); });
    }
    if (opts?.order) query = query.order(opts.order, { ascending: false });
    if (opts?.limit) query = query.limit(opts.limit);
    return query;
  };

  const [contactsRes, prospectsRes, sessionsRes, inscriptionsRes, facturesRes, paiementsRes, historiqueRes, scoringsRes] = await Promise.all([
    q("contacts", { filter: { archived: false }, limit: 500 }),
    q("prospects", { filter: { archived: false }, limit: 500 }),
    q("sessions", { filter: { archived: false }, order: "date_debut", limit: 100 }),
    q("session_inscriptions", { order: "created_at", limit: 500 }),
    q("factures", { limit: 200 }),
    q("paiements", { limit: 200 }),
    q("contact_historique", { order: "date_echange", limit: 500 }),
    q("ia_prospect_scoring", { limit: 500 }),
  ]);

  return {
    contacts: contactsRes.data || [],
    prospects: prospectsRes.data || [],
    sessions: sessionsRes.data || [],
    inscriptions: inscriptionsRes.data || [],
    factures: facturesRes.data || [],
    paiements: paiementsRes.data || [],
    historique: historiqueRes.data || [],
    scorings: scoringsRes.data || [],
    centreConfig: {
      prix_formation_moyen: 1500,
      taux_remplissage_historique: 0.6,
    },
  };
}

export function useQuickAudit() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async () => {
    setIsRunning(true);
    try {
      const ctx = await fetchAuditContext();
      const anomalies = runQuickAudit(ctx);
      const summary = buildAuditSummary(anomalies);
      const auditResult: AuditResult = {
        mode: "quick",
        timestamp: new Date().toISOString(),
        anomalies,
        total_impact_euros: summary.totalImpact,
        scores_summary: summary,
      };
      setResult(auditResult);
      return auditResult;
    } catch (e) {
      console.error("Quick audit error:", e);
      toast.error("Erreur lors de l'analyse rapide");
      return null;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { result, isRunning, run };
}

export function useDeepAudit() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async () => {
    setIsRunning(true);
    try {
      const ctx = await fetchAuditContext();
      const anomalies = runDeepAudit(ctx);
      const summary = buildAuditSummary(anomalies);
      const auditResult: AuditResult = {
        mode: "deep",
        timestamp: new Date().toISOString(),
        anomalies,
        total_impact_euros: summary.totalImpact,
        scores_summary: summary,
      };
      setResult(auditResult);
      toast.success(`Audit approfondi terminé : ${anomalies.length} anomalie(s) détectée(s)`);
      return auditResult;
    } catch (e) {
      console.error("Deep audit error:", e);
      toast.error("Erreur lors de l'audit approfondi");
      return null;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { result, isRunning, run };
}

// ═══════════════ ACTION LOGS ═══════════════

export function useActionLogs() {
  return useQuery({
    queryKey: ["ia-action-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as ActionLog[];
    },
  });
}

export function useExecuteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      anomalyId,
      actionType,
      payload,
      centreId,
    }: {
      anomalyId: string;
      actionType: string;
      payload: Record<string, unknown>;
      centreId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const insertData: any = {
        centre_id: centreId || null,
        anomaly_id: anomalyId,
        action_type: actionType,
        payload,
        status: "executed",
        created_by: user.id,
      };
      const { data, error } = await supabase
        .from("ia_action_logs")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ia-action-logs"] });
      toast.success("Action exécutée et loggée");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
