import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface FinancialMonth {
  id: string;
  month: string;
  created_at: string;
}

export interface FinancialCost {
  id: string;
  financial_month_id: string;
  type: "fixed" | "variable";
  label: string;
  amount: number;
  created_at: string;
}

export interface FinancialCashManual {
  id: string;
  financial_month_id: string;
  type: "encaissement" | "decaissement";
  label: string;
  amount: number;
  created_at: string;
}

export interface FinancialSynthesis {
  studentsCount: number;
  totalCA: number;
  totalFixed: number;
  totalVariable: number;
  resultat: number;
  margePct: number;
  variableParEleve: number;
  fixeParEleve: number;
  coutReelParEleve: number;
  prixMoyen: number;
  margeContributive: number;
  seuilRentabilite: number;
  cashflow: number;
  encaissementsManuels: number;
  decaissementsManuels: number;
}

// Ensure financial_month exists, return its id
export function useEnsureFinancialMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (month: Date) => {
      const monthStr = format(startOfMonth(month), "yyyy-MM-dd");

      // Check if exists
      const { data: existing } = await supabase
        .from("financial_months")
        .select("id")
        .eq("month", monthStr)
        .maybeSingle();

      if (existing) return existing.id;

      const { data, error } = await supabase
        .from("financial_months")
        .insert({ month: monthStr })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-months"] });
    },
  });
}

// Get all financial months
export function useFinancialMonths() {
  return useQuery({
    queryKey: ["financial-months"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_months")
        .select("*")
        .order("month", { ascending: false });
      if (error) throw error;
      return data as FinancialMonth[];
    },
  });
}

// Get costs for a month
export function useFinancialCosts(monthId: string | null) {
  return useQuery({
    queryKey: ["financial-costs", monthId],
    queryFn: async () => {
      if (!monthId) return [];
      const { data, error } = await supabase
        .from("financial_costs")
        .select("*")
        .eq("financial_month_id", monthId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as FinancialCost[];
    },
    enabled: !!monthId,
  });
}

// Get manual cash for a month
export function useFinancialCashManual(monthId: string | null) {
  return useQuery({
    queryKey: ["financial-cash-manual", monthId],
    queryFn: async () => {
      if (!monthId) return [];
      const { data, error } = await supabase
        .from("financial_cash_manual")
        .select("*")
        .eq("financial_month_id", monthId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as FinancialCashManual[];
    },
    enabled: !!monthId,
  });
}

// Sync data from CRM (contacts + paiements) for a given month
export function useSyncFinancialData(month: Date) {
  const monthStart = format(startOfMonth(month), "yyyy-MM-dd'T'00:00:00");
  const monthEnd = format(endOfMonth(month), "yyyy-MM-dd'T'23:59:59");

  return useQuery({
    queryKey: ["financial-sync", format(month, "yyyy-MM")],
    queryFn: async () => {
      // Count students created this month
      const { count: studentsCount, error: e1 } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)
        .eq("archived", false);

      if (e1) throw e1;

      // Sum payments for this month
      const { data: paiements, error: e2 } = await supabase
        .from("paiements")
        .select("montant")
        .gte("date_paiement", monthStart.split("T")[0])
        .lte("date_paiement", monthEnd.split("T")[0]);

      if (e2) throw e2;

      const totalCA = paiements?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;

      return { studentsCount: studentsCount || 0, totalCA };
    },
  });
}

// Compute full synthesis
export function computeSynthesis(
  studentsCount: number,
  totalCA: number,
  costs: FinancialCost[],
  cashManual: FinancialCashManual[]
): FinancialSynthesis {
  const totalFixed = costs.filter(c => c.type === "fixed").reduce((s, c) => s + c.amount, 0);
  const totalVariable = costs.filter(c => c.type === "variable").reduce((s, c) => s + c.amount, 0);
  const resultat = totalCA - (totalFixed + totalVariable);
  const margePct = totalCA > 0 ? (resultat / totalCA) * 100 : 0;
  const variableParEleve = studentsCount > 0 ? totalVariable / studentsCount : 0;
  const fixeParEleve = studentsCount > 0 ? totalFixed / studentsCount : 0;
  const coutReelParEleve = fixeParEleve + variableParEleve;
  const prixMoyen = studentsCount > 0 ? totalCA / studentsCount : 0;
  const margeContributive = prixMoyen - variableParEleve;
  const seuilRentabilite = margeContributive > 0 ? totalFixed / margeContributive : 0;

  const encaissementsManuels = cashManual.filter(c => c.type === "encaissement").reduce((s, c) => s + c.amount, 0);
  const decaissementsManuels = cashManual.filter(c => c.type === "decaissement").reduce((s, c) => s + c.amount, 0);
  const cashflow = (totalCA + encaissementsManuels) - (totalFixed + totalVariable + decaissementsManuels);

  return {
    studentsCount,
    totalCA,
    totalFixed,
    totalVariable,
    resultat,
    margePct,
    variableParEleve,
    fixeParEleve,
    coutReelParEleve,
    prixMoyen,
    margeContributive,
    seuilRentabilite,
    cashflow,
    encaissementsManuels,
    decaissementsManuels,
  };
}

// CRUD mutations
export function useCreateFinancialCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cost: Omit<FinancialCost, "id" | "created_at">) => {
      const { data, error } = await supabase.from("financial_costs").insert(cost).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["financial-costs", v.financial_month_id] });
    },
  });
}

export function useDeleteFinancialCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, monthId }: { id: string; monthId: string }) => {
      const { error } = await supabase.from("financial_costs").delete().eq("id", id);
      if (error) throw error;
      return monthId;
    },
    onSuccess: (monthId) => {
      qc.invalidateQueries({ queryKey: ["financial-costs", monthId] });
    },
  });
}

export function useCreateFinancialCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cash: Omit<FinancialCashManual, "id" | "created_at">) => {
      const { data, error } = await supabase.from("financial_cash_manual").insert(cash).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["financial-cash-manual", v.financial_month_id] });
    },
  });
}

export function useDeleteFinancialCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, monthId }: { id: string; monthId: string }) => {
      const { error } = await supabase.from("financial_cash_manual").delete().eq("id", id);
      if (error) throw error;
      return monthId;
    },
    onSuccess: (monthId) => {
      qc.invalidateQueries({ queryKey: ["financial-cash-manual", monthId] });
    },
  });
}

// Get 12 months history for chart
export function useFinancial12MonthsHistory() {
  return useQuery({
    queryKey: ["financial-12months"],
    queryFn: async () => {
      const months: { month: string; totalCA: number; studentsCount: number }[] = [];
      const now = new Date();

      for (let i = 11; i >= 0; i--) {
        const m = subMonths(now, i);
        const monthStart = format(startOfMonth(m), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(m), "yyyy-MM-dd");

        const { count } = await supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .gte("created_at", monthStart + "T00:00:00")
          .lte("created_at", monthEnd + "T23:59:59")
          .eq("archived", false);

        const { data: paiements } = await supabase
          .from("paiements")
          .select("montant")
          .gte("date_paiement", monthStart)
          .lte("date_paiement", monthEnd);

        const totalCA = paiements?.reduce((s, p) => s + (p.montant || 0), 0) || 0;

        months.push({
          month: format(m, "MMM yy"),
          totalCA,
          studentsCount: count || 0,
        });
      }

      return months;
    },
    staleTime: 5 * 60 * 1000,
  });
}
