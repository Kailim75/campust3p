import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Detects whether Alma is in sandbox/test mode by calling the edge function
 * with a lightweight "check_mode" action.
 * Returns { mode: "live" | "test" | "unknown", isLoading }
 */
export function useAlmaMode() {
  const query = useQuery({
    queryKey: ["alma", "mode"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("alma-payment", {
          body: { action: "check_mode" },
        });
        // Edge function may not support check_mode yet — handle gracefully
        if (error || !data) return { mode: "unknown" as const };
        // If the function returns mode info
        if (data.mode) return { mode: data.mode as "live" | "test" };
        // Fallback: if response includes sandbox URL indicator
        if (data.api_url?.includes("sandbox")) return { mode: "test" as const };
        if (data.api_url?.includes("api.getalma.eu")) return { mode: "live" as const };
        return { mode: "unknown" as const };
      } catch {
        return { mode: "unknown" as const };
      }
    },
    staleTime: 10 * 60 * 1000, // Cache 10 min
    retry: 1,
  });

  return {
    mode: query.data?.mode ?? "unknown",
    isSandbox: query.data?.mode === "test",
    isLoading: query.isLoading,
  };
}
