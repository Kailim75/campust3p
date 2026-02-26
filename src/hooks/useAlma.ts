import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AlmaEligibilityParams {
  amount: number; // in cents
  installments?: number[];
}

interface AlmaCreatePaymentParams {
  amount: number; // in cents
  installments?: number;
  return_url: string;
  cancel_url: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  custom_data?: Record<string, any>;
}

interface AlmaEligibilityResult {
  eligible: boolean;
  installments_count: number;
  payment_plan?: Array<{
    purchase_amount: number;
    customer_fee: number;
    due_date: number;
    total_amount: number;
  }>;
}

interface AlmaPaymentResult {
  id: string;
  url: string;
  state: string;
  payment_plan: Array<{
    purchase_amount: number;
    due_date: number;
    state: string;
  }>;
}

async function callAlma(action: string, params: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("alma-payment", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "Erreur Alma");
  if (!data?.success) throw new Error(data?.error || "Erreur Alma inconnue");
  return data.data;
}

// Check eligibility for installment payments
export function useAlmaEligibility(amount: number | null, enabled = true) {
  return useQuery({
    queryKey: ["alma", "eligibility", amount],
    queryFn: async () => {
      if (!amount || amount <= 0) return null;
      const result = await callAlma("eligibility", {
        amount: Math.round(amount * 100), // convert to cents
        installments: [1, 2, 3, 4],
      });
      // Parse eligibility response - Alma returns an array of eligibility results
      const plans = Array.isArray(result) ? result : [result];
      return plans.map((plan: any) => ({
        eligible: plan.eligible,
        installments_count: plan.installments_count,
        payment_plan: plan.payment_plan || [],
      })) as AlmaEligibilityResult[];
    },
    enabled: enabled && !!amount && amount > 0,
    staleTime: 60_000, // cache 1 min
    retry: 1,
  });
}

// Create an Alma payment
export function useAlmaCreatePayment() {
  return useMutation({
    mutationFn: async (params: AlmaCreatePaymentParams) => {
      const result = await callAlma("create_payment", {
        amount: params.amount,
        installments: params.installments || 3,
        return_url: params.return_url,
        cancel_url: params.cancel_url,
        customer: params.customer,
        custom_data: params.custom_data || {},
      });
      return result as AlmaPaymentResult;
    },
  });
}

// Get payment status
export function useAlmaPaymentStatus(paymentId: string | null) {
  return useQuery({
    queryKey: ["alma", "payment", paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      const result = await callAlma("get_payment", { payment_id: paymentId });
      return result as AlmaPaymentResult;
    },
    enabled: !!paymentId,
    refetchInterval: 30_000, // poll every 30s
  });
}
