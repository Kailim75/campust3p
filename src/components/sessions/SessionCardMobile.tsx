import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SessionEnrollmentBadge } from "./SessionEnrollmentBadge";
import { SessionHealthBadge } from "./SessionHealthBadge";
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

  return (
    <div
      className={cn(
        "relative border rounded-lg bg-card p-3 transition-colors",
        "border-l-4",
        formationColor.border,
        isActive && "ring-1 ring-inset ring-primary/20 bg-primary/5",
        isCritical && "ring-1 ring-inset ring-destructive/30 bg-destructive/5"
      )}
      onClick={() => onViewDetail(session)}
    >
      {/* Row 1: Name + critical badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-sm text-foreground truncate">{session.nom}</p>
            {isCritical && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20 gap-0.5 shrink-0">
                <AlertTriangle className="h-3 w-3" /> Critique
              </Badge>
            )}
          </div>
          {session.numero_session && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{session.numero_session}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>

      {/* Row 2: Badges — formation + status */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <Badge variant="outline" className={cn("text-xs", formationColor.badge)}>
          {getFormationLabel(session.formation_type)}
        </Badge>
        <Badge variant="outline" className={cn("text-xs", statusConfig[session.statut]?.class)}>
          {statusConfig[session.statut]?.label || session.statut}
        </Badge>
      </div>

      {/* Row 3: Dates */}
      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs">
          {format(new Date(session.date_debut), 'dd/MM/yyyy', { locale: fr })}
          {' – '}
          {format(new Date(session.date_fin), 'dd/MM/yyyy', { locale: fr })}
        </span>
      </div>

      {/* Row 4: Enrollment + Health */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <SessionEnrollmentBadge
          enrolled={inscrits}
          total={session.places_totales}
          financial={financial}
          className="flex-1 min-w-0"
        />
        <SessionHealthBadge health={health} compact />
      </div>

      {/* Row 5: Actions — always visible */}
      <div className="flex items-center justify-end gap-1 border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
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
