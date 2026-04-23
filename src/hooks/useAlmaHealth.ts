import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AlmaHealthStatus = "ok" | "unauthorized" | "unavailable" | "unknown";

interface AlmaHealthResult {
  status: AlmaHealthStatus;
  message?: string;
  httpStatus?: number;
}

/**
 * Pings the alma-payment edge function with a lightweight action
 * to verify it is reachable and the user is authenticated.
 * Returns a clear status used to gate the UI.
 */
export function useAlmaHealth(enabled = true) {
  return useQuery<AlmaHealthResult>({
    queryKey: ["alma", "health"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("alma-payment", {
          body: { action: "check_mode" },
        });

        if (error) {
          // FunctionsHttpError carries an HTTP context
          const ctxStatus =
            (error as any)?.context?.status ??
            (error as any)?.status ??
            undefined;
          const rawMsg = String(error.message || "");
          const is401 =
            ctxStatus === 401 ||
            /401|unauthorized|jwt|token/i.test(rawMsg);

          if (is401) {
            return {
              status: "unauthorized",
              httpStatus: 401,
              message:
                "Session expirée ou non autorisée. Reconnectez-vous pour générer un lien Alma.",
            };
          }
          return {
            status: "unavailable",
            httpStatus: ctxStatus,
            message: rawMsg || "Service Alma indisponible.",
          };
        }

        if (!data) {
          return { status: "unavailable", message: "Réponse Alma vide." };
        }

        return { status: "ok" };
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (/401|unauthorized/i.test(msg)) {
          return {
            status: "unauthorized",
            httpStatus: 401,
            message:
              "Session expirée ou non autorisée. Reconnectez-vous pour générer un lien Alma.",
          };
        }
        return {
          status: "unavailable",
          message: msg || "Impossible de joindre le service Alma.",
        };
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}
