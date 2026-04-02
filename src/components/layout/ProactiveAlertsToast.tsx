import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { useAllAlerts } from "@/hooks/useAlerts";

const SESSION_KEY = "proactive-alerts-shown";

/**
 * Component that shows proactive toast notifications on first load
 * when there are urgent alerts. Auto-dismisses after 8s.
 * Only shows once per browser session unless new alerts appear.
 */
export function ProactiveAlertsToast() {
  const { data: alerts, isLoading, counts } = useAllAlerts();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (hasShownRef.current || isLoading || !counts) return;

    const highPriorityAlerts = alerts.filter(a => a.priority === "high");
    if (highPriorityAlerts.length === 0) return;

    // Check session storage to avoid re-showing same alerts
    const previousCount = sessionStorage.getItem(SESSION_KEY);
    if (previousCount === String(highPriorityAlerts.length)) return;

    hasShownRef.current = true;
    sessionStorage.setItem(SESSION_KEY, String(highPriorityAlerts.length));

    const timeout = setTimeout(() => {
      const paymentAlerts = highPriorityAlerts.filter(a => a.type === "payment");
      const examAlerts = highPriorityAlerts.filter(a => a.type === "exam_t3p" || a.type === "exam_pratique");
      const sessionAlerts = highPriorityAlerts.filter(a => a.type === "session");
      const otherAlerts = highPriorityAlerts.filter(a =>
        !["payment", "exam_t3p", "exam_pratique", "session"].includes(a.type)
      );

      if (highPriorityAlerts.length === 1) {
        const alert = highPriorityAlerts[0];
        toast.warning(alert.title, {
          description: alert.description,
          duration: 8000,
          icon: <AlertCircle className="h-5 w-5 text-warning" />,
        });
      } else {
        const parts: string[] = [];
        if (paymentAlerts.length > 0) parts.push(`${paymentAlerts.length} paiement${paymentAlerts.length > 1 ? 's' : ''} en retard`);
        if (examAlerts.length > 0) parts.push(`${examAlerts.length} examen${examAlerts.length > 1 ? 's' : ''} à venir`);
        if (sessionAlerts.length > 0) parts.push(`${sessionAlerts.length} session${sessionAlerts.length > 1 ? 's' : ''} à traiter`);
        if (otherAlerts.length > 0) parts.push(`${otherAlerts.length} autre${otherAlerts.length > 1 ? 's' : ''} alerte${otherAlerts.length > 1 ? 's' : ''}`);

        toast.warning(`${highPriorityAlerts.length} actions urgentes`, {
          description: parts.join(" • "),
          duration: 8000,
          icon: <AlertCircle className="h-5 w-5 text-warning" />,
        });
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [alerts, isLoading, counts]);

  return null;
}
