import { useMemo, useState } from "react";
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
  CreditCard,
  Send,
  Check,
  RotateCcw,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isAfter, parseISO, startOfToday } from "date-fns";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createAutoNote } from "@/lib/aujourdhui-actions";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const { composerProps, openComposer } = useEmailComposer();

  // Check théorie status — latest result
  const lastTheorieResult = examensT3P.length > 0 ? examensT3P[0]?.resultat : null;
  const theorieReussie = lastTheorieResult === "admis";

  // Check if pratique is passed (latest result)
  const lastPratiqueResult = examens.length > 0 ? examens[0]?.resultat : null;
  const pratiqueReussie = lastPratiqueResult === "admis";

  // Check carte pro notes for this contact
  const { data: carteProNotes = [] } = useQuery({
    queryKey: ["carte-pro-notes", contactId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_historique")
        .select("id, titre, created_at")
        .eq("contact_id", contactId)
        .like("titre", "%Carte Pro%")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: pratiqueReussie,
  });

  const carteProEnvoyee = carteProNotes.length > 0;
  const carteProDate = carteProEnvoyee
    ? format(new Date(carteProNotes[0].created_at), "dd/MM/yyyy")
    : null;

  const handleDelete = async (examen: ExamenPratique) => {
    await deleteMutation.mutateAsync({
      id: examen.id,
      fichePratiqueId: examen.fiche_pratique_id,
      contactId,
    });
  };

  const handleSendCartePro = () => {
    openComposer({
      recipients: [{ id: contactId, email: "", prenom: "", nom: "" }],
      defaultSubject: "Démarches Carte Professionnelle — Examen pratique réussi",
      defaultBody: `Bonjour,\n\nSuite à votre réussite à l'examen pratique, vous pouvez maintenant faire votre demande de carte professionnelle en préfecture.\n\nDocuments nécessaires :\n- Attestation de réussite\n- Pièce d'identité en cours de validité\n- Justificatif de domicile de moins de 3 mois\n- 2 photos d'identité\n- Permis de conduire\n\nDélai moyen : 2 à 4 semaines.\n\nCordialement,\nÉcole T3P Montrouge`,
      autoNoteCategory: "carte_pro_envoyee",
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["carte-pro-notes", contactId] }),
    });
  };

  const handleMarkCarteProDone = async () => {
    await createAutoNote(contactId, "carte_pro_envoyee", "Marqué manuellement");
    toast.success("Carte Pro marquée comme envoyée");
    queryClient.invalidateQueries({ queryKey: ["carte-pro-notes", contactId] });
  };

  const handleRelanceCartePro = () => {
    openComposer({
      recipients: [{ id: contactId, email: "", prenom: "", nom: "" }],
      defaultSubject: "Relance — Carte Professionnelle",
      defaultBody: `Bonjour,\n\nNous revenons vers vous concernant votre demande de carte professionnelle.\n\nAvez-vous pu effectuer les démarches auprès de votre préfecture ?\n\nN'hésitez pas à nous contacter si vous avez besoin d'aide.\n\nCordialement,\nÉcole T3P Montrouge`,
      autoNoteCategory: "carte_pro_relance",
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["carte-pro-notes", contactId] }),
    });
  };

  const activeFiche = fiches.find((f) => f.statut !== "reussi") || fiches[0];
  const attempts = examens.length;
  const stats = useMemo(() => {
    const today = startOfToday();

    return {
      planned: examens.filter((exam) => exam.statut === "planifie" || isAfter(parseISO(exam.date_examen), today)).length,
      admitted: examens.filter((exam) => exam.resultat === "admis" || exam.statut === "reussi").length,
      evaluated: examens.filter((exam) => exam.statut !== "planifie" && exam.statut !== "reporte").length,
    };
  }, [examens]);

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
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Examens pratiques
          </h3>
          <p className="text-xs text-muted-foreground">
            Cette étape s’ouvre après validation de la théorie T3P.
          </p>
        </div>
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Pratique verrouillée
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  La pratique se débloque après réussite de la théorie.
                  {lastTheorieResult === "ajourne" && (
                    <span className="mt-1 block text-destructive">
                      Dernier résultat théorie : ajourné
                    </span>
                  )}
                  {!lastTheorieResult && (
                    <span className="mt-1 block">
                      Aucun résultat théorique enregistré.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Examens pratiques
          </h3>
          <p className="text-xs text-muted-foreground">
            {attempts} examen{attempts > 1 ? "s" : ""} enregistré{attempts > 1 ? "s" : ""} · suivi de la conduite et des suites carte pro.
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{attempts}</p>
          <p className="mt-1 text-xs text-muted-foreground">passage{attempts > 1 ? "s" : ""} pratique{attempts > 1 ? "s" : ""}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">À venir</p>
          <p className="mt-1 text-2xl font-bold text-info">{stats.planned}</p>
          <p className="mt-1 text-xs text-muted-foreground">planifié{stats.planned > 1 ? "s" : ""} ou encore à passer</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Évalués</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.evaluated}</p>
          <p className="mt-1 text-xs text-muted-foreground">avec présence ou résultat renseigné</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Admis</p>
          <p className="mt-1 text-2xl font-bold text-success">{stats.admitted}</p>
          <p className="mt-1 text-xs text-muted-foreground">ouvrent les démarches carte pro</p>
        </Card>
      </div>

      {/* Carte Pro encart — after pratique réussi */}
      {pratiqueReussie && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Carte Professionnelle</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  carteProEnvoyee
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-warning/10 text-warning border-warning/20"
                )}
              >
                {carteProEnvoyee ? `Envoyé le ${carteProDate}` : "À envoyer"}
              </Badge>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {!carteProEnvoyee && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] border-warning text-warning hover:bg-warning/10"
                  onClick={handleSendCartePro}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Envoyer démarches
                </Button>
              )}
              {carteProEnvoyee && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={handleRelanceCartePro}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Relancer
                </Button>
              )}
              {!carteProEnvoyee && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] text-muted-foreground"
                  onClick={handleMarkCarteProDone}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marquer fait
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!activeFiche && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-2 p-4 text-muted-foreground">
            <Car className="h-4 w-4" />
            <span className="text-sm">
              Créez d’abord une fiche pratique pour planifier un examen.
            </span>
          </CardContent>
        </Card>
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
          tentativeNumber={attempts || 1}
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

      <EmailComposerModal {...composerProps} />
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

        <div className="mb-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="gap-1.5">
            <ClipboardList className="h-3 w-3" />
            Grille disponible
          </Badge>
          {examen.document_resultat_path && (
            <Badge variant="outline" className="gap-1.5">
              <FileCheck className="h-3 w-3" />
              Résultat archivé
            </Badge>
          )}
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
