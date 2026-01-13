import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  CreditCard,
  Clock, 
  Calendar,
  CheckCircle,
  Bell,
  Car,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllAlerts, type Alert } from "@/hooks/useAlerts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const typeConfig = {
  carte_pro: { icon: CreditCard, label: "Carte Pro", color: "text-warning" },
  permis: { icon: Car, label: "Permis", color: "text-info" },
  session: { icon: Calendar, label: "Session", color: "text-primary" },
};

const priorityConfig = {
  high: { label: "Haute", class: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Moyenne", class: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Basse", class: "bg-info/10 text-info border-info/20" },
};

export function AlertesPage() {
  const { data: alerts, isLoading } = useAllAlerts();

  const stats = {
    total: alerts.length,
    high: alerts.filter((a) => a.priority === "high").length,
    medium: alerts.filter((a) => a.priority === "medium").length,
    low: alerts.filter((a) => a.priority === "low").length,
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Centre d'alertes" 
        subtitle="Suivez les tâches urgentes et rappels"
      />

      <main className="p-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total alertes</p>
                <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Priorité haute</p>
                <p className="text-2xl font-display font-bold text-destructive">{stats.high}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Priorité moyenne</p>
                <p className="text-2xl font-display font-bold text-warning">{stats.medium}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-info" />
              <div>
                <p className="text-sm text-muted-foreground">Priorité basse</p>
                <p className="text-2xl font-display font-bold text-info">{stats.low}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-elevated p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              </div>
            ))
          ) : alerts.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                Aucune alerte
              </h3>
              <p className="text-muted-foreground">
                Toutes les cartes pro et permis sont à jour !
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const TypeIcon = typeConfig[alert.type]?.icon || Bell;
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "card-elevated p-4 border-l-4 transition-all hover:shadow-lg",
                    alert.priority === "high" && "border-l-destructive",
                    alert.priority === "medium" && "border-l-warning",
                    alert.priority === "low" && "border-l-info"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("mt-0.5", typeConfig[alert.type]?.color || "text-muted-foreground")}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium text-foreground">
                          {alert.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", priorityConfig[alert.priority].class)}
                        >
                          {priorityConfig[alert.priority].label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {typeConfig[alert.type]?.label || "Alerte"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                      {alert.expiryDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expire le {format(new Date(alert.expiryDate), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      )}
                      {alert.contactName && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {alert.contactName}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {alert.contactId && (
                        <Button size="sm" variant="secondary">
                          Voir contact
                        </Button>
                      )}
                      {alert.sessionId && (
                        <Button size="sm" variant="secondary">
                          Voir session
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
