import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Edit,
  Trash2,
  Car,
  ClipboardList,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  useContactExamens,
  useDeleteExamenPratique,
  examenStatutConfig,
  examenResultatConfig,
  type ExamenPratique,
} from "@/hooks/useExamensPratique";
import { useContactFichesPratique } from "@/hooks/useFichesPratique";
import { useContactExamensT3P } from "@/hooks/useExamensT3P";
import { ExamenPratiqueEnhancedFormDialog } from "./ExamenPratiqueEnhancedFormDialog";
import { GrilleEvaluationDialog } from "./GrilleEvaluationDialog";

interface ExamensPratiqueSectionProps {
  contactId: string;
  formationType?: string;
}

export function ExamensPratiqueSection({ contactId, formationType }: ExamensPratiqueSectionProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingExamen, setEditingExamen] = useState<ExamenPratique | null>(null);
  const [grilleExamen, setGrilleExamen] = useState<ExamenPratique | null>(null);

  const { data: examens = [], isLoading } = useContactExamens(contactId);
  const { data: fiches = [] } = useContactFichesPratique(contactId);
  const { data: examensT3P = [], isLoading: isLoadingT3P } = useContactExamensT3P(contactId);
  const deleteMutation = useDeleteExamenPratique();

  // Check théorie status — latest result
  const lastTheorieResult = examensT3P.length > 0 ? examensT3P[0]?.resultat : null;
  const theorieReussie = lastTheorieResult === "admis";

  const handleDelete = async (examen: ExamenPratique) => {
    await deleteMutation.mutateAsync({
      id: examen.id,
      fichePratiqueId: examen.fiche_pratique_id,
      contactId,
    });
  };

  const activeFiche = fiches.find((f) => f.statut !== "reussi") || fiches[0];
  const attempts = examens.length;

  if (isLoading || isLoadingT3P) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Locked state: théorie not passed
  if (!theorieReussie) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Examens Pratiques
            </h3>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-sm text-foreground">
              Pratique verrouillée
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              La pratique se débloque après réussite de la théorie.
              {lastTheorieResult === "ajourne" && (
                <span className="block mt-1 text-destructive">
                  Dernier résultat théorie : Échoué
                </span>
              )}
              {!lastTheorieResult && (
                <span className="block mt-1">
                  Aucun résultat théorique enregistré.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Examens Pratiques
          </h3>
          <p className="text-xs text-muted-foreground">
            {attempts} examen{attempts > 1 ? "s" : ""} enregistré{attempts > 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          disabled={!activeFiche}
        >
          <Plus className="h-4 w-4 mr-1" />
          Planifier
        </Button>
      </div>

      {!activeFiche && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground border">
          <Car className="h-4 w-4" />
          <span className="text-sm">
            Créez d'abord une fiche pratique pour planifier un examen.
          </span>
        </div>
      )}

      {examens.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Car className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Aucun examen pratique</p>
          <p className="text-sm mt-1">Planifiez le premier examen de conduite</p>
        </div>
      ) : (
        <ScrollArea className="h-[350px]">
          <div className="space-y-3 pr-3">
            {examens.map((examen) => (
              <ExamenPratiqueCard
                key={examen.id}
                examen={examen}
                onEdit={() => setEditingExamen(examen)}
                onDelete={() => handleDelete(examen)}
                onViewGrille={() => setGrilleExamen(examen)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {activeFiche && (
        <ExamenPratiqueEnhancedFormDialog
          ficheId={activeFiche.id}
          contactId={contactId}
          formationType={activeFiche.formation_type}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          tentativeNumber={attempts + 1}
        />
      )}

      {editingExamen && activeFiche && (
        <ExamenPratiqueEnhancedFormDialog
          ficheId={editingExamen.fiche_pratique_id}
          contactId={contactId}
          formationType={activeFiche.formation_type}
          examen={editingExamen}
          open={!!editingExamen}
          onOpenChange={(open) => !open && setEditingExamen(null)}
          tentativeNumber={(editingExamen as any).numero_tentative || 1}
        />
      )}

      {grilleExamen && (
        <GrilleEvaluationDialog
          examenId={grilleExamen.id}
          typeExamen={grilleExamen.type_examen}
          open={!!grilleExamen}
          onOpenChange={(open) => !open && setGrilleExamen(null)}
        />
      )}
    </div>
  );
}

interface ExamenPratiqueCardProps {
  examen: ExamenPratique;
  onEdit: () => void;
  onDelete: () => void;
  onViewGrille: () => void;
}

function ExamenPratiqueCard({ examen, onEdit, onDelete, onViewGrille }: ExamenPratiqueCardProps) {
  const statusConfig = examenStatutConfig[examen.statut];
  const resultatConfig = examen.resultat
    ? examenResultatConfig[examen.resultat]
    : null;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase">
              {examen.type_examen}
            </Badge>
            <Badge className={cn(statusConfig?.class)}>
              {statusConfig?.label}
            </Badge>
            {resultatConfig && (
              <Badge className={cn(resultatConfig.class)}>
                {resultatConfig.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onViewGrille}
              title="Grille d'évaluation"
            >
              <ClipboardList className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer l'examen ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. La grille d'évaluation associée sera également supprimée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(examen.date_examen), "dd/MM/yyyy")}</span>
          </div>
          {examen.heure_examen && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{examen.heure_examen.slice(0, 5)}</span>
            </div>
          )}
          {examen.centre_examen && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{examen.centre_examen}</span>
            </div>
          )}
        </div>

        {examen.score !== null && (
          <div className="mt-2 pt-2 border-t">
            <span className="text-sm">
              Score : <span className="font-medium">{examen.score}/20</span>
            </span>
          </div>
        )}

        {examen.observations && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
            {examen.observations}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
