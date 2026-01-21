import { 
  AlertCircle, 
  CreditCard, 
  FileWarning, 
  Calendar, 
  ChevronRight,
  Zap,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAllAlerts } from "@/hooks/useAlerts";
import { Skeleton } from "@/components/ui/skeleton";

interface PriorityActionCardProps {
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

const actionConfig = {
  payment: {
    icon: CreditCard,
    label: "Paiement",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    section: "paiements",
  },
  document: {
    icon: FileWarning,
    label: "Document",
    color: "text-warning",
    bgColor: "bg-warning/10",
    section: "contacts",
  },
  session: {
    icon: Calendar,
    label: "Session",
    color: "text-info",
    bgColor: "bg-info/10",
    section: "sessions",
  },
  carte_pro: {
    icon: AlertCircle,
    label: "Carte pro",
    color: "text-warning",
    bgColor: "bg-warning/10",
    section: "contacts",
  },
  permis: {
    icon: AlertCircle,
    label: "Permis",
    color: "text-warning",
    bgColor: "bg-warning/10",
    section: "contacts",
  },
  exam_t3p: {
    icon: Award,
    label: "Examen T3P",
    color: "text-success",
    bgColor: "bg-success/10",
    section: "contacts",
  },
  exam_pratique: {
    icon: Award,
    label: "Examen pratique",
    color: "text-info",
    bgColor: "bg-info/10",
    section: "contacts",
  },
};

export function PriorityActionCard({ onNavigate }: PriorityActionCardProps) {
  const { data: alerts, isLoading, counts } = useAllAlerts();
  
  // Get the most urgent action (first high priority alert)
  const priorityAction = alerts.find(a => a.priority === "high") || alerts[0];
  
  const config = priorityAction ? actionConfig[priorityAction.type] : null;
  const Icon = config?.icon || Zap;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-4 w-72 mb-2" />
        <Skeleton className="h-10 w-32 mt-4" />
      </div>
    );
  }

  // No alerts - show success state
  if (!priorityAction) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-success/30 bg-gradient-to-br from-success/10 via-card to-card p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Zap className="h-5 w-5 text-success" />
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              Tout est en ordre
            </Badge>
          </div>
          
          <h3 className="text-xl font-display font-bold text-foreground mb-1">
            Aucune action urgente
          </h3>
          <p className="text-sm text-muted-foreground">
            Tous vos dossiers sont à jour. Continuez ainsi !
          </p>
        </div>
      </div>
    );
  }

  // Show priority action
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:shadow-lg cursor-pointer group",
      priorityAction.priority === "high" 
        ? "border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card" 
        : "border-warning/30 bg-gradient-to-br from-warning/10 via-card to-card"
    )}
    onClick={() => {
      const section = config?.section || "alertes";
      onNavigate(section);
    }}
    >
      {/* Decorative blob */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl",
        priorityAction.priority === "high" ? "bg-destructive/20" : "bg-warning/20"
      )} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", config?.bgColor)}>
              <Icon className={cn("h-5 w-5", config?.color)} />
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                priorityAction.priority === "high" 
                  ? "bg-destructive/10 text-destructive border-destructive/20" 
                  : "bg-warning/10 text-warning border-warning/20"
              )}
            >
              <Clock className="h-3 w-3 mr-1" />
              Action prioritaire
            </Badge>
          </div>
          
          {counts && counts.high > 1 && (
            <Badge variant="secondary" className="text-xs">
              +{counts.high - 1} urgente{counts.high > 2 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-display font-bold text-foreground mb-1">
          {priorityAction.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {priorityAction.description}
        </p>
        
        {/* CTA */}
        <Button 
          className="btn-gradient gap-2 group-hover:shadow-md transition-all"
          onClick={(e) => {
            e.stopPropagation();
            const section = config?.section || "alertes";
            onNavigate(section);
          }}
        >
          Traiter maintenant
          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
