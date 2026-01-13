import { cn } from "@/lib/utils";
import { AlertTriangle, FileWarning, Clock, CreditCard, IdCard, Loader2 } from "lucide-react";
import { useAllAlerts, Alert } from "@/hooks/useAlerts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const alertIcons: Record<Alert["type"], React.ElementType> = {
  document: FileWarning,
  payment: CreditCard,
  session: Clock,
  carte_pro: IdCard,
  permis: IdCard,
};

const alertStyles: Record<Alert["type"], string> = {
  document: "border-l-warning bg-warning/5",
  payment: "border-l-destructive bg-destructive/5",
  session: "border-l-info bg-info/5",
  carte_pro: "border-l-warning bg-warning/5",
  permis: "border-l-warning bg-warning/5",
};

const priorityBadge: Record<Alert["priority"], { label: string; class: string }> = {
  high: { label: "Urgent", class: "bg-destructive text-destructive-foreground" },
  medium: { label: "Attention", class: "bg-warning text-warning-foreground" },
  low: { label: "Info", class: "bg-muted text-muted-foreground" },
};

export function AlertCard() {
  const { data: alerts, isLoading, counts } = useAllAlerts();

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">
          Alertes
        </h3>
        {counts && counts.high > 0 && (
          <Badge variant="destructive" className="text-xs">
            {counts.high} urgent{counts.high > 1 ? "es" : "e"}
          </Badge>
        )}
      </div>

      {/* Quick stats */}
      {counts && (counts.payments > 0 || counts.documents > 0) && (
        <div className="flex gap-2 mb-4">
          {counts.payments > 0 && (
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
              <CreditCard className="h-3 w-3 mr-1" />
              {counts.payments} paiement{counts.payments > 1 ? "s" : ""}
            </Badge>
          )}
          {counts.documents > 0 && (
            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
              <FileWarning className="h-3 w-3 mr-1" />
              {counts.documents} document{counts.documents > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 pr-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                ✓ Aucune alerte en cours
              </p>
            ) : (
              alerts.slice(0, 10).map((alert) => {
                const Icon = alertIcons[alert.type] || AlertTriangle;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-l-4 transition-colors cursor-pointer hover:opacity-80",
                      alertStyles[alert.type] || "border-l-muted bg-muted/5"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {alert.title}
                        </p>
                        {alert.priority === "high" && (
                          <Badge className={cn("text-[10px] px-1 py-0", priorityBadge[alert.priority].class)}>
                            !
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            {alerts.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                + {alerts.length - 10} autres alertes
              </p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
