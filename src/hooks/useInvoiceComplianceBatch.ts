import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ComplianceResult } from "./useInvoiceCompliance";

/**
 * Sprint 5 — compute compliance for a batch of invoices in parallel.
 * Used by the pre-emission dialog to block draft emission when score < 70.
 */
export function useInvoiceComplianceBatch(factureIds: string[], enabled = true) {
  return useQuery<Record<string, ComplianceResult>>({
    queryKey: ["invoice-compliance-batch", factureIds.slice().sort().join(",")],
    enabled: enabled && factureIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const results = await Promise.all(
        factureIds.map(async (id) => {
          const { data, error } = await supabase.rpc("compute_invoice_compliance" as any, {
            p_facture_id: id,
          });
          if (error) return [id, { score: 0, issues: [], max: 0, got: 0 }] as const;
          return [id, (data as unknown as ComplianceResult) ?? { score: 0, issues: [], max: 0, got: 0 }] as const;
        }),
      );
      return Object.fromEntries(results);
    },
  });
}
