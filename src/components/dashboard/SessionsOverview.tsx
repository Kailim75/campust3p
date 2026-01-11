import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  formation: string;
  type: "Taxi" | "VTC" | "VMDTR" | "Continue" | "Mobilité";
  dateDebut: string;
  dateFin: string;
  inscrits: number;
  places: number;
  status: "en_cours" | "a_venir" | "complet" | "termine";
}

interface SessionsOverviewProps {
  sessions: Session[];
}

const typeColors = {
  Taxi: "bg-primary/10 text-primary border-primary/20",
  VTC: "bg-success/10 text-success border-success/20",
  VMDTR: "bg-info/10 text-info border-info/20",
  Continue: "bg-warning/10 text-warning border-warning/20",
  Mobilité: "bg-accent/10 text-accent-foreground border-accent/20",
};

const statusLabels = {
  en_cours: { label: "En cours", class: "bg-success/10 text-success" },
  a_venir: { label: "À venir", class: "bg-info/10 text-info" },
  complet: { label: "Complet", class: "bg-warning/10 text-warning" },
  termine: { label: "Terminé", class: "bg-muted text-muted-foreground" },
};

export function SessionsOverview({ sessions }: SessionsOverviewProps) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">
          Sessions à venir
        </h3>
        <button className="text-sm text-primary hover:underline">
          Voir tout
        </button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const fillRate = (session.inscrits / session.places) * 100;
          
          return (
            <div
              key={session.id}
              className="p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-foreground">
                    {session.formation}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", typeColors[session.type])}
                    >
                      {session.type}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", statusLabels[session.status].class)}
                    >
                      {statusLabels[session.status].label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {session.dateDebut}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {session.inscrits}/{session.places}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      fillRate >= 100 ? "bg-warning" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(fillRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
