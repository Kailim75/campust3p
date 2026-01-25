import { AlertTriangle, UserX, Clock, TrendingDown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CentreAlert } from "@/hooks/useSuperAdminStats";

interface SuperAdminAlertsCardProps {
  alerts: CentreAlert[];
  isLoading: boolean;
}

const alertTypeConfig = {
  onboarding_blocked: {
    icon: Clock,
    label: "Onboarding bloqué",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  no_learners: {
    icon: UserX,
    label: "Sans apprenant",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  low_activity: {
    icon: Clock,
    label: "Inactif",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  low_success: {
    icon: TrendingDown,
    label: "Performance faible",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
};

const priorityConfig = {
  critical: {
    label: "Critique",
    className: "bg-destructive text-destructive-foreground",
  },
  attention: {
    label: "Attention",
    className: "bg-warning text-warning-foreground",
  },
  watch: {
    label: "À suivre",
    className: "bg-muted text-muted-foreground",
  },
};

export function SuperAdminAlertsCard({ alerts, isLoading }: SuperAdminAlertsCardProps) {
  const criticalCount = alerts.filter(a => a.priority === "critical").length;
  const attentionCount = alerts.filter(a => a.priority === "attention").length;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Centres nécessitant une action
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge className={priorityConfig.critical.className}>
                {criticalCount} critique{criticalCount > 1 ? "s" : ""}
              </Badge>
            )}
            {attentionCount > 0 && (
              <Badge className={priorityConfig.attention.className}>
                {attentionCount} attention
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">✓</div>
            <p className="text-sm">Tous les centres sont en bonne santé</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-3 pr-3">
              {alerts.slice(0, 10).map((alert) => {
                const typeConfig = alertTypeConfig[alert.type];
                const Icon = typeConfig.icon;
                
                return (
                  <div
                    key={`${alert.id}-${alert.type}`}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-l-4 transition-colors",
                      alert.priority === "critical" 
                        ? "border-l-destructive bg-destructive/5" 
                        : alert.priority === "attention"
                        ? "border-l-warning bg-warning/5"
                        : "border-l-muted bg-muted/30"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg flex-shrink-0", typeConfig.bgColor)}>
                      <Icon className={cn("h-4 w-4", typeConfig.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {alert.centreNom}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] px-1.5", priorityConfig[alert.priority].className)}
                        >
                          {priorityConfig[alert.priority].label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {alert.message}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {alerts.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  + {alerts.length - 10} autres alertes
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
