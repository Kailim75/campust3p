import { cn } from "@/lib/utils";
import { AlertTriangle, FileWarning, Clock, CreditCard } from "lucide-react";

interface Alert {
  id: string;
  type: "document" | "payment" | "session" | "urgent";
  title: string;
  description: string;
  date: string;
}

interface AlertCardProps {
  alerts: Alert[];
}

const alertIcons = {
  document: FileWarning,
  payment: CreditCard,
  session: Clock,
  urgent: AlertTriangle,
};

const alertStyles = {
  document: "border-l-warning bg-warning/5",
  payment: "border-l-destructive bg-destructive/5",
  session: "border-l-info bg-info/5",
  urgent: "border-l-destructive bg-destructive/5",
};

export function AlertCard({ alerts }: AlertCardProps) {
  return (
    <div className="card-elevated p-5">
      <h3 className="font-display font-semibold text-foreground mb-4">
        Alertes urgentes
      </h3>
      
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune alerte en cours
          </p>
        ) : (
          alerts.map((alert) => {
            const Icon = alertIcons[alert.type];
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border-l-4 transition-colors cursor-pointer hover:opacity-80",
                  alertStyles[alert.type]
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {alert.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {alert.date}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
