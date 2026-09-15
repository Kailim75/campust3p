import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";
import { createErrorThrottle, buildClientErrorKey } from "@/lib/client-error-throttle";

// Supervision minimale (15/09/2026) — fondation de capture serveur des
// erreurs front, PAS un remplacement d'APM (Sentry nécessite un compte que
// seul le directeur peut créer). `report-client-error` journalise dans
// `client_error_logs`, lu par les admins/staff. Ne doit jamais faire planter
// l'app : throttlé, et les erreurs d'envoi sont avalées silencieusement.
const shouldReportClientError = createErrorThrottle();

function reportClientError(message: string, stack?: string | null): void {
  const key = buildClientErrorKey(message, stack);
  if (!shouldReportClientError(key)) return;

  supabase.functions
    .invoke("report-client-error", {
      body: { message, stack: stack ?? undefined, url: window.location.href },
    })
    .catch(() => {
      // Best-effort : un souci réseau ne doit jamais remonter à l'utilisateur.
    });
}

window.addEventListener("error", (event: ErrorEvent) => {
  reportClientError(event.message || "Erreur window inconnue", event.error?.stack);
});

window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  reportClientError(`Promise rejetée sans handler: ${message}`, stack);
});

createRoot(document.getElementById("root")!).render(<App />);
