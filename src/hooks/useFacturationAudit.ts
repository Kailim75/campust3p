import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FactureAuditStatus =
  | "brouillon"
  | "emise"
  | "payee"
  | "partiel"
  | "impayee"
  | "annulee";

export interface FacturationAuditItem {
  facture_id: string;
  numero_facture: string;
  contact_id: string | null;
  contact_name: string | null;
  centre_id: string | null;
  current_status: FactureAuditStatus;
  expected_status: FactureAuditStatus;
  invoice_total: number;
  active_paid_total: number;
  remaining_due: number;
  overpaid_amount: number;
  active_payment_count: number;
  deleted_payment_count: number;
  deleted_paid_total: number;
  line_count: number;
  date_emission: string | null;
  date_echeance: string | null;
  status_mismatch: boolean;
  missing_lines: boolean;
  missing_due_date: boolean;
  soft_deleted_payments: boolean;
  overpaid: boolean;
  anomaly_reasons: string[] | null;
  severity_score: number;
}

export interface FacturationAuditSummary {
  totalAnomalies: number;
  statusMismatchCount: number;
  missingLinesCount: number;
  missingDueDateCount: number;
  softDeletedPaymentsCount: number;
  overpaidCount: number;
}

function buildSummary(items: FacturationAuditItem[]): FacturationAuditSummary {
  return items.reduce<FacturationAuditSummary>(
    (acc, item) => {
      acc.totalAnomalies += 1;
      if (item.status_mismatch) acc.statusMismatchCount += 1;
      if (item.missing_lines) acc.missingLinesCount += 1;
      if (item.missing_due_date) acc.missingDueDateCount += 1;
      if (item.soft_deleted_payments) acc.softDeletedPaymentsCount += 1;
      if (item.overpaid) acc.overpaidCount += 1;
      return acc;
    },
    {
      totalAnomalies: 0,
      statusMismatchCount: 0,
      missingLinesCount: 0,
      missingDueDateCount: 0,
      softDeletedPaymentsCount: 0,
      overpaidCount: 0,
    },
  );
}

export function useFacturationAudit(limit = 12) {
  return useQuery({
    queryKey: ["facturation-audit-v2", limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("audit_facturation_v2", {
        p_limit: limit,
        p_only_anomalies: true,
      });

      if (error) throw error;

      const items = ((data || []) as FacturationAuditItem[]).map((item) => ({
        ...item,
        invoice_total: Number(item.invoice_total || 0),
        active_paid_total: Number(item.active_paid_total || 0),
        remaining_due: Number(item.remaining_due || 0),
        overpaid_amount: Number(item.overpaid_amount || 0),
        deleted_paid_total: Number(item.deleted_paid_total || 0),
      }));

      return {
        items,
        summary: buildSummary(items),
      };
    },
    staleTime: 60_000,
    retry: false,
  });
}
