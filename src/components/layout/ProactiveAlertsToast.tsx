import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AlertCircle, CreditCard, Calendar, Award } from "lucide-react";
import { useAllAlerts } from "@/hooks/useAlerts";

/**
 * Component that shows proactive toast notifications on first load
 * when there are urgent alerts
 */
export function ProactiveAlertsToast() {
  const { data: alerts, isLoading, counts } = useAllAlerts();
  const hasShownRef = useRef(false);

  useEffect(() => {
    // Only show once per session and when data is loaded
    if (hasShownRef.current || isLoading || !counts) return;
    
    const highPriorityAlerts = alerts.filter(a => a.priority === "high");
    
    if (highPriorityAlerts.length === 0) return;

    hasShownRef.current = true;

    // Small delay to let the app load fully
    const timeout = setTimeout(() => {
      // Group alerts by type for summary
      const paymentAlerts = highPriorityAlerts.filter(a => a.type === "payment");
      const examAlerts = highPriorityAlerts.filter(a => a.type === "exam_t3p" || a.type === "exam_pratique");
      const sessionAlerts = highPriorityAlerts.filter(a => a.type === "session");
      const otherAlerts = highPriorityAlerts.filter(a => 
        !["payment", "exam_t3p", "exam_pratique", "session"].includes(a.type)
      );

      // Show summary toast
      if (highPriorityAlerts.length === 1) {
        // Single alert - show details
        const alert = highPriorityAlerts[0];
        toast.warning(alert.title, {
          description: alert.description,
          duration: 8000,
          icon: <AlertCircle className="h-5 w-5 text-warning" />,
        });
      } else {
        // Multiple alerts - show summary
        const parts: string[] = [];
        
        if (paymentAlerts.length > 0) {
          parts.push(`${paymentAlerts.length} paiement${paymentAlerts.length > 1 ? 's' : ''} en retard`);
        }
        if (examAlerts.length > 0) {
          parts.push(`${examAlerts.length} examen${examAlerts.length > 1 ? 's' : ''} à venir`);
        }
        if (sessionAlerts.length > 0) {
          parts.push(`${sessionAlerts.length} session${sessionAlerts.length > 1 ? 's' : ''} à traiter`);
        }
        if (otherAlerts.length > 0) {
          parts.push(`${otherAlerts.length} autre${otherAlerts.length > 1 ? 's' : ''} alerte${otherAlerts.length > 1 ? 's' : ''}`);
        }

        toast.warning(`${highPriorityAlerts.length} actions urgentes`, {
          description: parts.join(" • "),
          duration: 10000,
          icon: <AlertCircle className="h-5 w-5 text-warning" />,
          action: {
            label: "Voir les alertes",
            onClick: () => {
              // This will be handled by parent component
              window.dispatchEvent(new CustomEvent('navigate-to-alerts'));
            },
          },
        });
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [alerts, isLoading, counts]);

  // This component doesn't render anything
  return null;
}
