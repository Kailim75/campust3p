import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertCircle,
  ShieldAlert,
  ClipboardCheck
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

  const totalHoursPlanned = fiches.reduce((sum, fiche) => sum + fiche.heures_prevues, 0);
  const totalHoursDone = fiches.reduce((sum, fiche) => sum + fiche.heures_realisees, 0);
  const readyForExamCount = fiches.filter((fiche) => fiche.statut === "pret_examen" || fiche.statut === "examen_planifie").length;
  const overdueCount = fiches.filter((fiche) => fiche.date_fin_prevue && differenceInDays(new Date(fiche.date_fin_prevue), new Date()) < 0).length;

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
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <p className="font-medium">Suivi pratique</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Suis ici les heures réalisées, les fiches en cours et les passages vers l’examen pratique.
              </p>
            </div>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle fiche
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Fiches</p>
              <p className="mt-1 text-lg font-semibold">{fiches.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Heures réalisées</p>
              <p className="mt-1 text-lg font-semibold">{totalHoursDone}h</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Heures prévues</p>
              <p className="mt-1 text-lg font-semibold">{totalHoursPlanned}h</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Prêtes / planifiées</p>
              <p className="mt-1 text-lg font-semibold">{readyForExamCount}</p>
            </div>
          </div>

          {overdueCount > 0 && (
            <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <ShieldAlert className="h-4 w-4 text-warning" />
                Vigilance pratique
              </div>
              <p className="mt-1 text-muted-foreground">
                {overdueCount} fiche(s) ont dépassé leur date de fin prévue.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : fiches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Car className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucune fiche pratique</p>
            <p className="text-sm mt-1">Crée une fiche pour suivre les heures de conduite, les séances et l’examen pratique.</p>
          </CardContent>
        </Card>
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
      className="p-4 border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group bg-card"
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
        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
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
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
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

      <div className="mt-3 flex flex-wrap gap-2">
        {fiche.statut === "pret_examen" || fiche.statut === "examen_planifie" ? (
          <Badge variant="outline" className="text-xs">
            <ClipboardCheck className="mr-1 h-3 w-3" />
            Examen proche
          </Badge>
        ) : null}
        {isOverdue ? (
          <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
            <AlertCircle className="mr-1 h-3 w-3" />
            À replanifier
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
