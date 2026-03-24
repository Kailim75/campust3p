import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar, Edit, Trash2, Copy, AlertTriangle, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";
import type { Session } from "@/hooks/useSessions";
import type { SessionFinancialData, SessionHealthScore } from "@/hooks/useSessionFinancials";

interface SessionCardMobileProps {
  session: Session;
  inscrits: number;
  financial?: SessionFinancialData;
  health: SessionHealthScore;
  isCritical: boolean;
  isActive: boolean;
  statusConfig: Record<string, { label: string; class: string }>;
  onViewDetail: (session: Session) => void;
  onEdit: (session: Session) => void;
  onDuplicate: (session: Session) => void;
  onDelete: (id: string) => void;
}

function getMobilePriority(fillRate: number, session: Session) {
  const daysUntil = Math.ceil(
    (new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (fillRate < 50 && daysUntil <= 14 && daysUntil >= 0) {
    return { emoji: "🔴", label: "Risque élevé", class: "bg-destructive/10 text-destructive border-destructive/20" };
  }
  if (fillRate < 70) {
    return { emoji: "🟡", label: "À surveiller", class: "bg-warning/10 text-warning border-warning/20" };
  }
  return { emoji: "🟢", label: "OK", class: "bg-success/10 text-success border-success/20" };
}

export function SessionCardMobile({
  session,
  inscrits,
  financial,
  health,
  isCritical,
  isActive,
  statusConfig,
  onViewDetail,
  onEdit,
  onDuplicate,
  onDelete,
}: SessionCardMobileProps) {
  const formationColor = getFormationColor(session.formation_type);
  const fillRate = session.places_totales > 0 ? Math.round((inscrits / session.places_totales) * 100) : 0;
  const isFull = inscrits >= session.places_totales && session.places_totales > 0;
  const isNearFull = fillRate >= 80 && !isFull;
  const priority = getMobilePriority(fillRate, session);

  return (
    <div
      className={cn(
        "relative border rounded-lg bg-card transition-colors",
        "border-l-4",
        isCritical ? "border-l-destructive bg-destructive/[0.04]" : formationColor.border,
        isActive && "ring-1 ring-inset ring-primary/20 bg-primary/5",
      )}
      onClick={() => onViewDetail(session)}
    >
      {/* ──── ZONE 1 — IDENTITÉ ──── */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium text-sm text-foreground truncate">{session.nom}</p>
              {isCritical && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20 gap-0.5 shrink-0">
                  <AlertTriangle className="h-3 w-3" /> Critique
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {session.numero_session && (
                <span className="text-xs text-muted-foreground font-mono">{session.numero_session}</span>
              )}
              <Badge variant="outline" className={cn("text-[10px]", formationColor.badge)}>
                {getFormationLabel(session.formation_type)}
              </Badge>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground mt-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">
            {format(new Date(session.date_debut), 'dd/MM/yyyy', { locale: fr })}
            {' – '}
            {format(new Date(session.date_fin), 'dd/MM/yyyy', { locale: fr })}
          </span>
        </div>
      </div>

      {/* ──── ZONE 2 — PERFORMANCE (focus) ──── */}
      <div className="px-3 pb-2">
        <div className="bg-muted/30 rounded-md p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              isFull ? "text-destructive" : isNearFull ? "text-warning" : "text-foreground"
            )}>
              {inscrits} / {session.places_totales} places
            </span>
            <span className={cn(
              "text-xs font-medium tabular-nums",
              fillRate < 50 ? "text-destructive" : fillRate < 70 ? "text-warning" : "text-success"
            )}>
              {fillRate}%
            </span>
          </div>
          <Progress
            value={fillRate}
            className={cn(
              "h-3 w-full",
              isFull && "[&>div]:bg-destructive",
              isNearFull && "[&>div]:bg-warning",
              !isFull && !isNearFull && fillRate < 50 && "[&>div]:bg-destructive",
              !isFull && !isNearFull && fillRate >= 50 && fillRate < 70 && "[&>div]:bg-warning",
              !isFull && !isNearFull && fillRate >= 70 && "[&>div]:bg-success",
            )}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              💳 {financial && financial.nb_payes > 0 ? `${financial.nb_payes} payé${financial.nb_payes > 1 ? 's' : ''}` : '—'}
            </span>
            {financial && financial.ca_securise > 0 ? (
              <span className="font-medium text-success">
                {financial.ca_securise.toLocaleString('fr-FR')} €
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {/* ──── ZONE 3 — STATUT & PRIORITÉ ──── */}
      <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={cn("text-xs", statusConfig[session.statut]?.class)}>
          {statusConfig[session.statut]?.label || session.statut}
        </Badge>
        <Badge variant="outline" className={cn("text-xs gap-1", priority.class)}>
          {priority.emoji} {priority.label}
        </Badge>
      </div>

      {/* ──── ACTIONS ──── */}
      <div className="flex items-center justify-end gap-1 border-t border-border mx-3 pt-2 pb-2" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(session)} title="Modifier">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(session)} title="Dupliquer">
          <Copy className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Envoyer à la corbeille ?</AlertDialogTitle>
              <AlertDialogDescription>
                La session « {session.nom} » sera envoyée à la corbeille avec ses inscriptions et émargements.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(session.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Envoyer à la corbeille
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
