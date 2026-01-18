import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Inscription {
  id: string;
  statut: string;
  sessions?: {
    id: string;
    nom: string;
    date_debut: string;
    date_fin: string;
    formation_type: string;
    lieu?: string;
  } | null;
}

interface ContactSessionsTabProps {
  inscriptions: Inscription[];
  isLoading: boolean;
}

const inscriptionStatusConfig: Record<string, { label: string; class: string }> = {
  inscrit: { label: "Inscrit", class: "bg-success/10 text-success border-success/20" },
  en_attente: { label: "En attente", class: "bg-warning/10 text-warning border-warning/20" },
  annule: { label: "Annulé", class: "bg-destructive/10 text-destructive border-destructive/20" },
  complete: { label: "Complété", class: "bg-info/10 text-info border-info/20" },
};

export function ContactSessionsTab({ inscriptions, isLoading }: ContactSessionsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (inscriptions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucune inscription</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inscriptions.map((inscription) => (
        <div key={inscription.id} className="p-3 border rounded-lg space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">
                {inscription.sessions?.nom || "Session inconnue"}
              </p>
              <p className="text-xs text-muted-foreground">
                {inscription.sessions?.formation_type}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                inscriptionStatusConfig[inscription.statut]?.class ?? "bg-muted"
              )}
            >
              {inscriptionStatusConfig[inscription.statut]?.label ?? inscription.statut}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {inscription.sessions?.date_debut
                ? format(new Date(inscription.sessions.date_debut), "dd/MM/yyyy", { locale: fr })
                : "N/A"}
            </span>
            {inscription.sessions?.lieu && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {inscription.sessions.lieu}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}