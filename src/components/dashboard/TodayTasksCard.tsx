import { 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  CreditCard,
  FileText,
  Calendar,
  Award,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAllAlerts, Alert } from "@/hooks/useAlerts";
import { Skeleton } from "@/components/ui/skeleton";

interface TodayTasksCardProps {
  onNavigate: (section: string) => void;
  onNavigateWithContact?: (section: string, contactId?: string) => void;
  maxItems?: number;
}

const taskTypeConfig: Record<Alert["type"], { icon: React.ElementType; color: string }> = {
  payment: { icon: CreditCard, color: "text-destructive" },
  document: { icon: FileText, color: "text-warning" },
  session: { icon: Calendar, color: "text-info" },
  carte_pro: { icon: AlertCircle, color: "text-warning" },
  permis: { icon: AlertCircle, color: "text-warning" },
  exam_t3p: { icon: Award, color: "text-success" },
  exam_pratique: { icon: Award, color: "text-info" },
  rappel: { icon: AlertCircle, color: "text-primary" },
};

export function TodayTasksCard({ onNavigate, onNavigateWithContact, maxItems = 5 }: TodayTasksCardProps) {
  const { data: alerts, isLoading, counts } = useAllAlerts();
  
  // Filter to show only high and medium priority tasks
  const tasks = alerts.filter(a => a.priority === "high" || a.priority === "medium").slice(0, maxItems);

  const handleTaskClick = (task: Alert) => {
    // Navigate to contact detail if contactId exists
    if (task.contactId && onNavigateWithContact) {
      onNavigateWithContact("contacts", task.contactId);
    } else if (task.actionType === "view_facture") {
      onNavigate("paiements");
    } else if (task.actionType === "view_session") {
      onNavigate("sessions");
    } else if (task.actionType === "view_contact" || task.actionType === "view_exam") {
      onNavigate("contacts");
    } else {
      onNavigate("alertes");
    }
  };

  if (isLoading) {
    return (
      <div className="card-elevated p-5">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          À traiter aujourd'hui
          {counts && counts.high > 0 && (
            <Badge variant="destructive" className="text-xs">
              {counts.high}
            </Badge>
          )}
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs gap-1"
          onClick={() => onNavigate("alertes")}
        >
          Voir tout
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-success/10 mb-3">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <p className="text-sm font-medium text-foreground">Tout est à jour !</p>
          <p className="text-xs text-muted-foreground mt-1">
            Aucune tâche urgente pour aujourd'hui
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[200px]">
          <div className="space-y-2 pr-3">
            {tasks.map((task) => {
              const config = taskTypeConfig[task.type];
              const Icon = config?.icon || Circle;
              
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                    "hover:bg-muted/50 hover:shadow-sm",
                    task.priority === "high" 
                      ? "border-destructive/20 bg-destructive/5" 
                      : "border-border bg-card"
                  )}
                  onClick={() => handleTaskClick(task)}
                >
                  <div className={cn(
                    "p-1.5 rounded-full shrink-0",
                    task.priority === "high" ? "bg-destructive/10" : "bg-muted"
                  )}>
                    <Icon className={cn("h-4 w-4", config?.color || "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.description}
                    </p>
                  </div>
                  {task.priority === "high" && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 shrink-0">
                      Urgent
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
