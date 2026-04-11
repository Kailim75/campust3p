import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Edit,
  Plus,
  Clock,
  Calendar,
  Car,
  GraduationCap,
  ClipboardCheck,
  FileText,
  User,
  MapPin,
  Star,
  CheckCircle,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFichePratique, fichePratiqueStatutConfig, useDeleteFichePratique } from "@/hooks/useFichesPratique";
import { useFicheSeances, typeSeanceOptions, parcoursOptions, useDeleteSeanceConduite, type SeanceConduite } from "@/hooks/useSeancesConduite";
import { useFicheExamens, examenStatutConfig, useDeleteExamenPratique, type ExamenPratique } from "@/hooks/useExamensPratique";
import { FichePratiqueFormDialog } from "./FichePratiqueFormDialog";
import { SeanceConduiteFormDialog } from "./SeanceConduiteFormDialog";
import { ExamenPratiqueFormDialog } from "./ExamenPratiqueFormDialog";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
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

interface FichePratiqueDetailProps {
  ficheId: string;
  contactId: string;
  onBack: () => void;
}

export function FichePratiqueDetail({ ficheId, contactId, onBack }: FichePratiqueDetailProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [seanceDialogOpen, setSeanceDialogOpen] = useState(false);
  const [examenDialogOpen, setExamenDialogOpen] = useState(false);
  const [editingSeance, setEditingSeance] = useState<SeanceConduite | null>(null);
  const [editingExamen, setEditingExamen] = useState<ExamenPratique | null>(null);

  const { data: fiche, isLoading } = useFichePratique(ficheId);
  const { data: seances = [], isLoading: seancesLoading } = useFicheSeances(ficheId);
  const { data: examens = [], isLoading: examensLoading } = useFicheExamens(ficheId);
  
  const deleteFiche = useDeleteFichePratique();
  const deleteSeance = useDeleteSeanceConduite();
  const deleteExamen = useDeleteExamenPratique();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Fiche non trouvée
      </div>
    );
  }

  const heuresRestantes = fiche.heures_prevues - fiche.heures_realisees;
  const progressPercent = fiche.heures_prevues > 0 
    ? Math.min((fiche.heures_realisees / fiche.heures_prevues) * 100, 100) 
    : 0;
  const statusConfig = fichePratiqueStatutConfig[fiche.statut];
  const nextExam = examens.find((examen) => new Date(examen.date_examen) >= new Date());
  const validatedSeancesCount = seances.filter((seance) => seance.validation_formateur).length;
  const isOverdue = Boolean(fiche.date_fin_prevue && differenceInDays(new Date(fiche.date_fin_prevue), new Date()) < 0);
  const vigilanceItems = [
    isOverdue ? "La date de fin prévue est dépassée." : null,
    heuresRestantes > 0 && examens.length > 0 ? "Un examen existe alors qu'il reste des heures à réaliser." : null,
    seances.length > 0 && validatedSeancesCount === 0 ? "Des séances existent mais aucune n'est encore validée par le formateur." : null,
  ].filter(Boolean) as string[];

  const handleDeleteFiche = async () => {
    await deleteFiche.mutateAsync({ id: fiche.id, contactId });
    onBack();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">{fiche.formation_type}</h3>
              <Badge variant="outline" className={cn("text-xs", statusConfig.class)}>
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Modifier
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer cette fiche ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Toutes les séances et examens associés seront également supprimés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteFiche}>Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Séances</p>
              <p className="mt-1 text-lg font-semibold">{seances.length}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Validées</p>
              <p className="mt-1 text-lg font-semibold">{validatedSeancesCount}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Examens</p>
              <p className="mt-1 text-lg font-semibold">{examens.length}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Prochain examen</p>
              <p className="mt-1 text-sm font-semibold">
                {nextExam ? format(new Date(nextExam.date_examen), "dd/MM/yyyy") : "Aucun"}
              </p>
            </div>
          </div>

          {vigilanceItems.length > 0 && (
            <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <ShieldAlert className="h-4 w-4 text-warning" />
                Points à surveiller
              </div>
              <div className="mt-2 space-y-1 text-muted-foreground">
                {vigilanceItems.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-warning/70" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <p className="text-2xl font-bold text-primary">{fiche.heures_realisees}h</p>
          <p className="text-xs text-muted-foreground">Réalisées</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <p className="text-2xl font-bold">{fiche.heures_prevues}h</p>
          <p className="text-xs text-muted-foreground">Prévues</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <p className={cn("text-2xl font-bold", heuresRestantes <= 0 ? "text-success" : "text-warning")}>
            {heuresRestantes}h
          </p>
          <p className="text-xs text-muted-foreground">Restantes</p>
        </div>
      </div>

      <Progress value={progressPercent} className="h-2" />

      {/* Tabs */}
      <Tabs defaultValue="seances" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="seances" className="text-xs">
            <Car className="h-3.5 w-3.5 mr-1" />
            Séances ({seances.length})
          </TabsTrigger>
          <TabsTrigger value="examens" className="text-xs">
            <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
            Examens ({examens.length})
          </TabsTrigger>
        </TabsList>

        {/* Séances Tab */}
        <TabsContent value="seances" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingSeance(null); setSeanceDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter séance
            </Button>
          </div>

          {seancesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : seances.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune séance enregistrée</p>
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2 pr-3">
                {seances.map((seance) => (
                  <SeanceCard 
                    key={seance.id} 
                    seance={seance}
                    onEdit={() => { setEditingSeance(seance); setSeanceDialogOpen(true); }}
                    onDelete={() => deleteSeance.mutate({ 
                      id: seance.id, 
                      fichePratiqueId: fiche.id, 
                      contactId 
                    })}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Examens Tab */}
        <TabsContent value="examens" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingExamen(null); setExamenDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Planifier examen
            </Button>
          </div>

          {examensLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : examens.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun examen planifié</p>
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2 pr-3">
                {examens.map((examen) => (
                  <ExamenCard 
                    key={examen.id} 
                    examen={examen}
                    onEdit={() => { setEditingExamen(examen); setExamenDialogOpen(true); }}
                    onDelete={() => deleteExamen.mutate({ 
                      id: examen.id, 
                      fichePratiqueId: fiche.id, 
                      contactId 
                    })}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <FichePratiqueFormDialog
        contactId={contactId}
        fiche={fiche}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <SeanceConduiteFormDialog
        ficheId={fiche.id}
        contactId={contactId}
        seance={editingSeance}
        open={seanceDialogOpen}
        onOpenChange={setSeanceDialogOpen}
      />

      <ExamenPratiqueFormDialog
        ficheId={fiche.id}
        contactId={contactId}
        formationType={fiche.formation_type}
        examen={editingExamen}
        open={examenDialogOpen}
        onOpenChange={setExamenDialogOpen}
      />
    </div>
  );
}

interface SeanceCardProps {
  seance: SeanceConduite;
  onEdit: () => void;
  onDelete: () => void;
}

function SeanceCard({ seance, onEdit, onDelete }: SeanceCardProps) {
  const typeLabel = typeSeanceOptions.find(t => t.value === seance.type_seance)?.label || seance.type_seance;
  const parcoursLabel = seance.parcours ? parcoursOptions.find(p => p.value === seance.parcours)?.label : null;

  return (
    <div className="p-3 border rounded-lg group hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className={cn(
            "p-1.5 rounded-md",
            seance.validation_formateur ? "bg-success/10" : "bg-muted"
          )}>
            {seance.validation_formateur ? (
              <CheckCircle className="h-3.5 w-3.5 text-success" />
            ) : (
              <Car className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">
                {format(new Date(seance.date_seance), "dd MMM yyyy", { locale: fr })}
              </p>
              <Badge variant="secondary" className="text-xs">
                {typeLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(seance.duree_minutes / 60)}h{seance.duree_minutes % 60 > 0 ? `${seance.duree_minutes % 60}min` : ""}
              </span>
              {seance.formateurs && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {seance.formateurs.prenom} {seance.formateurs.nom}
                </span>
              )}
              {parcoursLabel && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {parcoursLabel}
                </span>
              )}
            </div>
            {seance.vehicules && (
              <p className="text-xs text-muted-foreground mt-1">
                🚗 {seance.vehicules.marque} {seance.vehicules.modele} ({seance.vehicules.immatriculation})
              </p>
            )}
            {seance.note_globale && (
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "h-3 w-3",
                      i < seance.note_globale! ? "text-warning fill-warning" : "text-muted"
                    )} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette séance ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible.
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
      {seance.observations && (
        <p className="text-xs text-muted-foreground mt-2 pl-8 italic">
          "{seance.observations}"
        </p>
      )}
    </div>
  );
}

interface ExamenCardProps {
  examen: ExamenPratique;
  onEdit: () => void;
  onDelete: () => void;
}

function ExamenCard({ examen, onEdit, onDelete }: ExamenCardProps) {
  const statutConfig = examenStatutConfig[examen.statut];

  return (
    <div className="p-3 border rounded-lg group hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">
              Examen {examen.type_examen}
            </p>
            <Badge variant="outline" className={cn("text-xs", statutConfig.class)}>
              {statutConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(examen.date_examen), "dd MMM yyyy", { locale: fr })}
              {examen.heure_examen && ` à ${examen.heure_examen.slice(0, 5)}`}
            </span>
            {examen.centre_examen && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {examen.centre_examen}
              </span>
            )}
          </div>
          {examen.resultat && (
            <p className={cn(
              "text-xs font-medium mt-1",
              examen.resultat === "admis" ? "text-success" : "text-destructive"
            )}>
              Résultat: {examen.resultat.toUpperCase()}
              {examen.score && ` (${examen.score})`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cet examen ?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
