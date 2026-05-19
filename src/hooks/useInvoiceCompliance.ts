import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ComplianceIssue {
  code: string;
  label: string;
  severity: "bloquant" | "avertissement";
}

export interface ComplianceResult {
  score: number;
  issues: ComplianceIssue[];
  max: number;
  got: number;
}

/**
 * Sprint 3/4 — e-invoicing 2026/2027 compliance scoring.
 * Computes the conformity score (0-100) and missing fields for a single invoice
 * by calling the DB function `compute_invoice_compliance`.
 */
export function useInvoiceCompliance(factureId: string | null | undefined) {
  return useQuery<ComplianceResult>({
    queryKey: ["invoice-compliance", factureId],
    enabled: !!factureId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("compute_invoice_compliance" as any, {
        p_facture_id: factureId,
      });
      if (error) throw error;
      return (data as unknown as ComplianceResult) ?? { score: 0, issues: [], max: 0, got: 0 };
    },
  });
}

export function complianceTone(score: number | undefined | null) {
  if (score == null) return "muted" as const;
  if (score >= 90) return "success" as const;
  if (score >= 60) return "warning" as const;
  return "destructive" as const;
}
