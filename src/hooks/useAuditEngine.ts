// ═══════════════════════════════════════════════════════════════
// Hook: useAuditEngine — Runs quick/deep audit on CRM data
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { runQuickAudit, runDeepAudit } from "@/components/ia-director/audit/auditRules";
import type { Anomaly, AnomalyStatus, AuditContext, AuditResult, ActionLog } from "@/components/ia-director/audit/types";
import { buildAuditSummary } from "@/components/ia-director/audit/priorityEngine";
import { computePriorityScore } from "@/components/ia-director/audit/priorityEngine";
import { toast } from "sonner";

async function fetchAuditContext(): Promise<AuditContext> {
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

/**
 * Enriches anomalies with status derived from action logs.
 * If an action was executed for an anomaly → in_progress
 * If all affected records were resolved → resolved
 */
function enrichAnomaliesWithStatus(anomalies: Anomaly[], logs: ActionLog[]): Anomaly[] {
  const logsByAnomaly = new Map<string, ActionLog[]>();
  logs.forEach((log) => {
    const list = logsByAnomaly.get(log.anomaly_id) || [];
    list.push(log);
    logsByAnomaly.set(log.anomaly_id, list);
  });

  return anomalies.map((a) => {
    const anomalyLogs = logsByAnomaly.get(a.id) || [];
    if (anomalyLogs.length === 0) return a;

    // Check for explicit status changes
    const statusLog = anomalyLogs.find((l) => l.action_type === "change_status");
    if (statusLog) {
      const newStatus = (statusLog.payload as any)?.new_status as AnomalyStatus;
      if (newStatus) return { ...a, status: newStatus };
    }

    // If actions were executed, mark as in_progress
    const executedActions = anomalyLogs.filter((l) => l.status === "executed" && l.action_type !== "change_status");
    if (executedActions.length > 0) {
      return { ...a, status: "in_progress" as AnomalyStatus };
    }

    return a;
  });
}

export function useQuickAudit() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async (logs?: ActionLog[]) => {
    setIsRunning(true);
    try {
      const ctx = await fetchAuditContext();
      let anomalies = runQuickAudit(ctx);
      if (logs) anomalies = enrichAnomaliesWithStatus(anomalies, logs);
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

  return { result, setResult, isRunning, run };
}

export function useDeepAudit() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async (logs?: ActionLog[]) => {
    setIsRunning(true);
    try {
      const ctx = await fetchAuditContext();
      let anomalies = runDeepAudit(ctx);
      if (logs) anomalies = enrichAnomaliesWithStatus(anomalies, logs);
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

  return { result, setResult, isRunning, run };
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
      return (data || []).map((d: any) => ({
        ...d,
        entity_ids: d.entity_ids || [],
        anomaly_title: d.anomaly_title || null,
      })) as ActionLog[];
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
      entityIds,
      anomalyTitle,
    }: {
      anomalyId: string;
      actionType: string;
      payload: Record<string, unknown>;
      centreId?: string;
      entityIds?: string[];
      anomalyTitle?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const insertData: any = {
        centre_id: centreId || null,
        anomaly_id: anomalyId,
        anomaly_title: anomalyTitle || null,
        action_type: actionType,
        entity_ids: entityIds || [],
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

// ═══════════════ CHANGE STATUS ═══════════════

export function useChangeAnomalyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      anomalyId,
      newStatus,
      anomalyTitle,
      centreId,
    }: {
      anomalyId: string;
      newStatus: AnomalyStatus;
      anomalyTitle?: string;
      centreId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const insertData: any = {
        centre_id: centreId || null,
        anomaly_id: anomalyId,
        anomaly_title: anomalyTitle || null,
        action_type: "change_status",
        entity_ids: [],
        payload: { new_status: newStatus },
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
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["ia-action-logs"] });
      const labels: Record<string, string> = {
        open: "Anomalie rouverte",
        in_progress: "Anomalie marquée en cours",
        resolved: "Anomalie marquée résolue",
        ignored: "Anomalie ignorée",
      };
      toast.success(labels[newStatus] || "Statut mis à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
