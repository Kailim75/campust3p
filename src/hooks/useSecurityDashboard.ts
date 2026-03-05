import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SecurityTestResult {
  test: string;
  status: "PASS" | "FAIL" | "WARN" | "SKIP";
  details: string;
}

export interface SecurityRunResult {
  status: "pass" | "fail" | "warn";
  total_pass: number;
  total_fail: number;
  total_warn: number;
  results: SecurityTestResult[];
}

export interface SecurityRun {
  id: string;
  created_at: string;
  status: string;
  summary_json: SecurityTestResult[];
  total_pass: number;
  total_fail: number;
  total_warn: number;
}

export function useSecurityRuns(limit = 5) {
  return useQuery({
    queryKey: ["security-runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as SecurityRun[];
    },
  });
}

export function useRunSmokeTests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("run_security_smoke_tests");
      if (error) throw error;
      return data as unknown as SecurityRunResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["security-runs"] });
      if (data.status === "pass") {
        toast.success(`Smoke tests OK : ${data.total_pass} PASS`);
      } else if (data.status === "warn") {
        toast.warning(`${data.total_warn} warning(s) détecté(s)`);
      } else {
        toast.error(`${data.total_fail} FAIL détecté(s) !`);
      }
    },
    onError: (error: any) => {
      console.error("Smoke test error:", error);
      toast.error("Erreur lors de l'exécution des smoke tests");
    },
  });
}

export function useRlsViolations(days = 7) {
  return useQuery({
    queryKey: ["rls-violations", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("action", "RLS_VIOLATION")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });
}
