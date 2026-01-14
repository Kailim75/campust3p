import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Car, 
  Clock, 
  Calendar, 
  GraduationCap,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContactFichesPratique, fichePratiqueStatutConfig, type FichePratique } from "@/hooks/useFichesPratique";
import { FichePratiqueFormDialog } from "./FichePratiqueFormDialog";
import { FichePratiqueDetail } from "./FichePratiqueDetail";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface ContactPratiqueTabProps {
  contactId: string;
}

export function ContactPratiqueTab({ contactId }: ContactPratiqueTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFiche, setSelectedFiche] = useState<string | null>(null);
  const { data: fiches = [], isLoading } = useContactFichesPratique(contactId);

  if (selectedFiche) {
    return (
      <FichePratiqueDetail 
        ficheId={selectedFiche} 
        contactId={contactId}
        onBack={() => setSelectedFiche(null)} 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Suivi Pratique
        </h3>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle fiche
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : fiches.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Car className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Aucune fiche pratique</p>
          <p className="text-sm mt-1">Créez une fiche pour suivre les heures de conduite</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-3">
            {fiches.map((fiche) => (
              <FichePratiqueCard 
                key={fiche.id} 
                fiche={fiche} 
                onClick={() => setSelectedFiche(fiche.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <FichePratiqueFormDialog
        contactId={contactId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}

interface FichePratiqueCardProps {
  fiche: FichePratique;
  onClick: () => void;
}

function FichePratiqueCard({ fiche, onClick }: FichePratiqueCardProps) {
  const heuresRestantes = fiche.heures_prevues - fiche.heures_realisees;
  const progressPercent = fiche.heures_prevues > 0 
    ? Math.min((fiche.heures_realisees / fiche.heures_prevues) * 100, 100) 
    : 0;

  const statusConfig = fichePratiqueStatutConfig[fiche.statut];
  const isOverdue = fiche.date_fin_prevue && differenceInDays(new Date(fiche.date_fin_prevue), new Date()) < 0;

  return (
    <div 
      className="p-4 border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{fiche.formation_type}</p>
            <Badge variant="outline" className={cn("text-xs mt-1", statusConfig.class)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Heures
          </span>
          <span className="font-medium">
            {fiche.heures_realisees}h / {fiche.heures_prevues}h
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {heuresRestantes > 0 && (
          <p className="text-xs text-muted-foreground">
            {heuresRestantes}h restantes
          </p>
        )}
      </div>

      {/* Dates */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        {fiche.date_debut && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Début: {format(new Date(fiche.date_debut), "dd/MM/yyyy")}
          </span>
        )}
        {fiche.date_fin_prevue && (
          <span className={cn("flex items-center gap-1", isOverdue && "text-destructive")}>
            {isOverdue && <AlertCircle className="h-3 w-3" />}
            Fin prévue: {format(new Date(fiche.date_fin_prevue), "dd/MM/yyyy")}
          </span>
        )}
      </div>
    </div>
  );
}
