import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Euro, Users, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Formation {
  id: string;
  intitule: string;
  type: "initiale" | "continue" | "mobilite";
  categorie: "Taxi" | "VTC" | "VMDTR" | "Accompagnement";
  duree: string;
  prix: number;
  places: number;
  prochaineSessions: number;
  totalSessions?: number;
  totalInscriptions?: number;
}

interface FormationCardProps {
  formation: Formation;
}

const typeLabels = {
  initiale: { label: "Initiale", class: "bg-primary/10 text-primary border-primary/20" },
  continue: { label: "Continue", class: "bg-warning/10 text-warning border-warning/20" },
  mobilite: { label: "Mobilité", class: "bg-info/10 text-info border-info/20" },
};

const categoryColors: Record<string, string> = {
  Taxi: "from-primary/20 to-primary/5 border-primary/30",
  VTC: "from-success/20 to-success/5 border-success/30",
  VMDTR: "from-info/20 to-info/5 border-info/30",
  Accompagnement: "from-warning/20 to-warning/5 border-warning/30",
};

export function FormationCard({ formation }: FormationCardProps) {
  const formatPrix = (prix: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(prix);
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:shadow-lg bg-gradient-to-br",
      categoryColors[formation.categorie] || categoryColors.Taxi
    )}>
      {/* Category badge */}
      <div className="absolute top-4 right-4">
        <Badge variant="secondary" className="font-semibold">
          {formation.categorie}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Title & Type */}
        <div>
          <Badge
            variant="outline"
            className={cn("mb-2 text-xs", typeLabels[formation.type].class)}
          >
            {typeLabels[formation.type].label}
          </Badge>
          <h3 className="text-lg font-display font-semibold text-foreground pr-16">
            {formation.intitule}
          </h3>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formation.duree}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{formation.places} places/session</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Euro className="h-4 w-4" />
            <span className="font-semibold text-foreground">{formatPrix(formation.prix)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className={cn(
              formation.prochaineSessions > 0 ? "text-success font-medium" : ""
            )}>
              {formation.prochaineSessions} à venir
            </span>
          </div>
        </div>

        {/* Stats supplémentaires */}
        {(formation.totalSessions || formation.totalInscriptions) && (
          <div className="flex items-center gap-4 pt-2 border-t border-current/10">
            {formation.totalSessions !== undefined && formation.totalSessions > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>{formation.totalSessions} session(s) total</span>
              </div>
            )}
            {formation.totalInscriptions !== undefined && formation.totalInscriptions > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{formation.totalInscriptions} inscrit(s)</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            onClick={() => {
              // Naviguer vers les sessions filtrées par ce type
              const event = new CustomEvent("navigate-section", { 
                detail: { section: "sessions", filter: formation.id } 
              });
              window.dispatchEvent(event);
            }}
          >
            Voir sessions
          </Button>
          <Button 
            size="sm" 
            className="flex-1 btn-gradient"
            onClick={() => {
              // Ouvrir le formulaire de création de session avec ce type pré-sélectionné
              const event = new CustomEvent("create-session", { 
                detail: { formationType: formation.id } 
              });
              window.dispatchEvent(event);
            }}
          >
            Planifier
          </Button>
        </div>
      </div>
    </div>
  );
}
