import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  Hash,
  Edit,
  Trash2,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useContactExamensT3P,
  useDeleteExamenT3P,
  examenT3PStatutConfig,
  examenT3PResultatConfig,
  type ExamenT3P,
} from "@/hooks/useExamensT3P";
import { ExamenT3PFormDialog } from "./ExamenT3PFormDialog";
import { getDepartementLabel } from "@/constants/departements";

interface ExamensT3PSectionProps {
  contactId: string;
  formationType?: string;
}

export function ExamensT3PSection({ contactId, formationType }: ExamensT3PSectionProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingExamen, setEditingExamen] = useState<ExamenT3P | null>(null);

  const { data: examens = [], isLoading } = useContactExamensT3P(contactId);
  const deleteMutation = useDeleteExamenT3P();

  const handleDelete = async (examen: ExamenT3P) => {
    await deleteMutation.mutateAsync({ id: examen.id, contactId });
  };

  // Get the latest successful exam
  const latestSuccess = examens.find((e) => e.statut === "reussi");
  const attempts = examens.length;
  const maxAttempts = 3;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Examens T3P (Théorique)
          </h3>
          <p className="text-xs text-muted-foreground">
            {attempts} tentative{attempts > 1 ? "s" : ""} / {maxAttempts} max
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          disabled={attempts >= maxAttempts && !latestSuccess}
        >
          <Plus className="h-4 w-4 mr-1" />
          Planifier
        </Button>
      </div>

      {/* Alert for max attempts */}
      {attempts >= maxAttempts && !latestSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning border border-warning/20">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">
            Limite de 3 tentatives atteinte. Une dérogation est nécessaire.
          </span>
        </div>
      )}

      {/* T3P Status Card */}
      {latestSuccess && (
        <T3PStatusCard examen={latestSuccess} />
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : examens.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Aucun examen T3P</p>
          <p className="text-sm mt-1">Planifiez le premier examen théorique</p>
        </div>
      ) : (
        <ScrollArea className="h-[350px]">
          <div className="space-y-3 pr-3">
            {examens.map((examen) => (
              <ExamenT3PCard
                key={examen.id}
                examen={examen}
                onEdit={() => setEditingExamen(examen)}
                onDelete={() => handleDelete(examen)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <ExamenT3PFormDialog
        contactId={contactId}
        formationType={formationType || "TAXI"}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        tentativeNumber={attempts + 1}
      />

      {editingExamen && (
        <ExamenT3PFormDialog
          contactId={contactId}
          formationType={formationType || "TAXI"}
          examen={editingExamen}
          open={!!editingExamen}
          onOpenChange={(open) => !open && setEditingExamen(null)}
          tentativeNumber={editingExamen.numero_tentative}
        />
      )}
    </div>
  );
}

function T3PStatusCard({ examen }: { examen: ExamenT3P }) {
  const daysUntilExpiration = examen.date_expiration
    ? differenceInDays(new Date(examen.date_expiration), new Date())
    : null;
  const monthsUntilExpiration = examen.date_expiration
    ? differenceInMonths(new Date(examen.date_expiration), new Date())
    : null;

  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration < 180;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  return (
    <Card className={cn(
      "border-2",
      isExpired ? "border-destructive bg-destructive/5" :
      isExpiringSoon ? "border-warning bg-warning/5" :
      "border-success bg-success/5"
    )}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isExpired ? "bg-destructive/10" :
              isExpiringSoon ? "bg-warning/10" :
              "bg-success/10"
            )}>
              {isExpired ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : isExpiringSoon ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
            </div>
            <div>
              <p className="font-semibold">
                T3P {examen.type_formation}
              </p>
              <p className="text-sm text-muted-foreground">
                Obtenu le {examen.date_reussite && format(new Date(examen.date_reussite), "dd MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          <Badge className={cn(
            isExpired ? "bg-destructive" :
            isExpiringSoon ? "bg-warning" :
            "bg-success"
          )}>
            {isExpired ? "Expiré" :
             isExpiringSoon ? `Expire dans ${monthsUntilExpiration} mois` :
             "Valide"}
          </Badge>
        </div>
        {examen.date_expiration && (
          <p className="text-xs text-muted-foreground mt-2">
            Date d'expiration : {format(new Date(examen.date_expiration), "dd/MM/yyyy")}
          </p>
        )}
        {examen.score !== null && (
          <p className="text-sm mt-2">
            Score : <span className="font-medium">{examen.score}/20</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ExamenT3PCardProps {
  examen: ExamenT3P;
  onEdit: () => void;
  onDelete: () => void;
}

function ExamenT3PCard({ examen, onEdit, onDelete }: ExamenT3PCardProps) {
  const statusConfig = examenT3PStatutConfig[examen.statut as keyof typeof examenT3PStatutConfig];
  const resultatConfig = examen.resultat
    ? examenT3PResultatConfig[examen.resultat as keyof typeof examenT3PResultatConfig]
    : null;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{examen.type_formation}</Badge>
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
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>
                    Supprimer
                  </AlertDialogAction>
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
          {examen.departement && (
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Dép. {getDepartementLabel(examen.departement)}</span>
            </div>
          )}
          {examen.centre_examen && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{examen.centre_examen}</span>
            </div>
          )}
          {examen.numero_convocation && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              <span>{examen.numero_convocation}</span>
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

        <div className="mt-2 text-xs text-muted-foreground">
          Tentative n°{examen.numero_tentative}
        </div>
      </CardContent>
    </Card>
  );
}
