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
import type { SessionFinancialData } from "@/hooks/useSessionFinancials";

interface SessionCardMobileProps {
  session: Session;
  inscrits: number;
  financial?: SessionFinancialData;
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

function getFillColor(fillRate: number) {
  if (fillRate >= 100) return { text: "text-emerald-600 dark:text-emerald-400", bar: "[&>div]:bg-emerald-600 dark:[&>div]:bg-emerald-400" };
  if (fillRate >= 70) return { text: "text-success", bar: "[&>div]:bg-success" };
  if (fillRate >= 50) return { text: "text-warning", bar: "[&>div]:bg-warning" };
  return { text: "text-destructive", bar: "[&>div]:bg-destructive" };
}

function getMobileSynthesis(session: Session, fillRate: number, fin?: SessionFinancialData): string {
  const daysUntil = Math.ceil(
    (new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (session.statut === 'annulee') return "Session annulée";
  if (session.statut === 'terminee') {
    if (fillRate >= 80 && fin && fin.ca_securise > 0) return "Terminée — rentable";
    if (fillRate < 50) return "Terminée — faible performance";
    return "Terminée";
  }
  if (fillRate >= 100 && fin && fin.ca_securise > 0) return "Complète — rentable";
  if (fillRate >= 100) return "Complète";
  if (fillRate < 50 && daysUntil <= 14 && daysUntil >= 0) return "Insuffisant — à risque";
  if (daysUntil <= 7 && daysUntil >= 0 && fillRate < 70) return "Démarrage proche — attention";
  if (fillRate < 50) return "Remplissage insuffisant";
  if (fillRate < 70) return "En cours de remplissage";
  return "Bonne trajectoire";
}

export function SessionCardMobile({
  session,
  inscrits,
  financial,
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
  const fillColor = getFillColor(fillRate);
  const priority = getMobilePriority(fillRate, session);
  const synthesis = getMobileSynthesis(session, fillRate, financial);
  const monthLabel = format(new Date(session.date_debut), 'MMM yyyy', { locale: fr });

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
              <span className="text-xs font-semibold uppercase text-foreground tracking-wide">{monthLabel}</span>
              {session.numero_session && (
                <span className="text-[10px] text-muted-foreground/70 font-mono">{session.numero_session}</span>
              )}
              <Badge variant="outline" className={cn("text-[10px]", formationColor.badge)}>
                {getFormationLabel(session.formation_type)}
              </Badge>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground/70 mt-1.5">
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
        <div className="bg-muted/30 rounded-md p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={cn("text-sm font-semibold tabular-nums", fillColor.text)}>
              {inscrits} / {session.places_totales} places
            </span>
            <span className={cn("text-xs font-medium tabular-nums", fillColor.text)}>
              {fillRate}%
            </span>
          </div>
          <Progress
            value={Math.min(fillRate, 100)}
            className={cn("h-3 w-full", fillColor.bar)}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground/70">
              💳 {financial && financial.nb_payes > 0 ? `${financial.nb_payes} payé${financial.nb_payes > 1 ? 's' : ''}` : '—'}
            </span>
            {financial && financial.ca_securise > 0 ? (
              <span className="font-medium text-success">
                {financial.ca_securise.toLocaleString('fr-FR')} €
              </span>
            ) : (
              <span className="text-muted-foreground/70">—</span>
            )}
          </div>
          {/* Micro-synthesis */}
          <p className={cn(
            "text-[11px] italic leading-tight",
            isCritical ? "text-destructive" : "text-muted-foreground"
          )}>
            {synthesis}
          </p>
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
