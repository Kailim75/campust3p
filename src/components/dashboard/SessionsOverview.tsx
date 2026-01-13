import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpcomingSessions, type Session } from "@/hooks/useSessions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const formationLabels: Record<string, string> = {
  TAXI: "Taxi",
  VTC: "VTC",
  VMDTR: "VMDTR",
  "ACC VTC": "ACC VTC",
  "ACC VTC 75": "ACC VTC 75",
  "Formation continue Taxi": "Continue Taxi",
  "Formation continue VTC": "Continue VTC",
  "Mobilité Taxi": "Mobilité Taxi",
};

const statusLabels = {
  a_venir: { label: "À venir", class: "bg-info/10 text-info" },
  en_cours: { label: "En cours", class: "bg-success/10 text-success" },
  complet: { label: "Complet", class: "bg-warning/10 text-warning" },
  terminee: { label: "Terminée", class: "bg-muted text-muted-foreground" },
  annulee: { label: "Annulée", class: "bg-destructive/10 text-destructive" },
};

export function SessionsOverview() {
  const { data: sessions, isLoading } = useUpcomingSessions(4);

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">
          Sessions à venir
        </h3>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border/50 bg-muted/30">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))
        ) : sessions && sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Aucune session à venir
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: Session }) {
  return (
    <div className="p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-foreground">{session.nom}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {formationLabels[session.formation_type] || session.formation_type}
            </Badge>
            <Badge
              variant="secondary"
              className={cn("text-xs", statusLabels[session.statut]?.class)}
            >
              {statusLabels[session.statut]?.label || session.statut}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(session.date_debut), 'dd/MM/yyyy', { locale: fr })}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {session.places_totales} places
          </span>
        </div>
      </div>
    </div>
  );
}
