import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, CheckCircle, Clock, User, Calendar, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reclamation {
  id: string;
  titre: string;
  description: string;
  statut: string;
  priorite?: string;
  categorie?: string;
  created_at: string;
  date_resolution?: string;
  resolution?: string;
  delai_traitement_jours?: number;
  contact?: { nom: string; prenom: string } | null;
  session?: { nom: string } | null;
}

interface ReclamationsListSectionProps {
  reclamations: Reclamation[];
  onUpdateStatus: (id: string, statut: string, resolution?: string) => void;
  isUpdating?: boolean;
}

const statutConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  nouvelle: { label: "Nouvelle", color: "bg-destructive/10 text-destructive", icon: AlertCircle },
  en_cours: { label: "En cours", color: "bg-warning/10 text-warning", icon: Clock },
  resolue: { label: "Résolue", color: "bg-success/10 text-success", icon: CheckCircle },
  cloturee: { label: "Clôturée", color: "bg-muted text-muted-foreground", icon: CheckCircle },
};

const prioriteConfig: Record<string, { label: string; color: string }> = {
  basse: { label: "Basse", color: "bg-muted text-muted-foreground" },
  normale: { label: "Normale", color: "bg-info/10 text-info" },
  haute: { label: "Haute", color: "bg-warning/10 text-warning" },
  urgente: { label: "Urgente", color: "bg-destructive/10 text-destructive" },
};

export const ReclamationsListSection = forwardRef<HTMLDivElement, ReclamationsListSectionProps>(
  function ReclamationsListSection({ reclamations, onUpdateStatus, isUpdating = false }, ref) {
    if (reclamations.length === 0) {
      return (
        <Card ref={ref}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Aucune réclamation</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              Aucune réclamation n'a été enregistrée. Les réclamations créées manuellement ou soumises par les stagiaires apparaîtront ici.
            </p>
          </CardContent>
        </Card>
    );
  }

  return (
    <Card ref={ref}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Réclamations ({reclamations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {reclamations.map((reclamation) => {
              const statut = statutConfig[reclamation.statut] || statutConfig.nouvelle;
              const priorite = prioriteConfig[reclamation.priorite || "normale"];
              const StatusIcon = statut.icon;

              return (
                <div
                  key={reclamation.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{reclamation.titre}</h4>
                        <Badge variant="outline" className={cn("text-xs", priorite.color)}>
                          {priorite.label}
                        </Badge>
                        {reclamation.categorie && (
                          <Badge variant="secondary" className="text-xs">
                            {reclamation.categorie}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {reclamation.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", statut.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statut.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {reclamation.contact && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {reclamation.contact.prenom} {reclamation.contact.nom}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(reclamation.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                    {reclamation.session && (
                      <span className="text-primary">{reclamation.session.nom}</span>
                    )}
                  </div>

                  {reclamation.statut !== "cloturee" && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Changer le statut :</span>
                      <Select
                        value={reclamation.statut}
                        onValueChange={(value) => onUpdateStatus(reclamation.id, value)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[150px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nouvelle">Nouvelle</SelectItem>
                          <SelectItem value="en_cours">En cours</SelectItem>
                          <SelectItem value="resolue">Résolue</SelectItem>
                          <SelectItem value="cloturee">Clôturée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {reclamation.resolution && (
                    <div className="p-2 bg-success/5 rounded text-sm">
                      <span className="font-medium text-success">Résolution : </span>
                      {reclamation.resolution}
                    </div>
                  )}

                  {reclamation.delai_traitement_jours !== null &&
                    reclamation.delai_traitement_jours !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        Traité en {reclamation.delai_traitement_jours} jour(s)
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});