import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Hash, GraduationCap, Archive, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";
import { SessionQualiopiBadge } from "./SessionQualiopiBadge";
import { SheetSizeSelector } from "@/components/ui/sheet-size-selector";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Session } from "@/hooks/useSessions";
import type { SessionQualiopiScore } from "@/hooks/useSessionQualiopi";
import type { SheetSize } from "@/hooks/useSheetSize";

const statusConfig: Record<string, { label: string; class: string }> = {
  a_venir: { label: "À venir", class: "bg-info/10 text-info border-info/20" },
  en_cours: { label: "En cours", class: "bg-warning/10 text-warning border-warning/20" },
  terminee: { label: "Terminée", class: "bg-muted text-muted-foreground border-muted" },
  annulee: { label: "Annulée", class: "bg-destructive/10 text-destructive border-destructive/20" },
  complet: { label: "Complet", class: "bg-success/10 text-success border-success/20" },
};

interface SessionDetailHeaderProps {
  session: Session;
  formateur: { prenom: string; nom: string } | null | undefined;
  qualiopiScore: SessionQualiopiScore | null | undefined;
  size: SheetSize;
  onSizeChange: (size: SheetSize) => void;
  onEdit: (session: Session) => void;
}

export function SessionDetailHeader({
  session,
  formateur,
  qualiopiScore,
  size,
  onSizeChange,
  onEdit,
}: SessionDetailHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <SheetHeader className="pb-3 sm:pb-4">
      {/* Mobile: stacked layout */}
      {isMobile ? (
        <div className="space-y-2">
          {/* Row 1: title + edit */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-tight truncate">{session.nom}</SheetTitle>
            </div>
            {!session.archived && (
              <Button size="sm" onClick={() => onEdit(session)} className="h-8 text-xs flex-shrink-0">
                <Edit className="h-3.5 w-3.5 mr-1" />
                Modifier
              </Button>
            )}
          </div>

          {/* Row 2: badges wrap */}
          <div className="flex flex-wrap items-center gap-1.5">
            {session.numero_session && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px]">
                <Hash className="h-3 w-3 mr-0.5" />
                {session.numero_session}
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-[10px]", getFormationColor(session.formation_type).badge)}>
              {getFormationLabel(session.formation_type)}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", statusConfig[session.statut]?.class)}>
              {statusConfig[session.statut]?.label || session.statut}
            </Badge>
            {qualiopiScore && <SessionQualiopiBadge qualiopi={qualiopiScore} />}
            {session.archived && (
              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-muted">
                <Archive className="h-3 w-3 mr-0.5" />
                Archivée
              </Badge>
            )}
          </div>

          {/* Row 3: formateur compact */}
          {formateur && (
            <div className="flex items-center gap-2 p-1.5 rounded-md bg-accent/50 border border-accent">
              <Avatar className="h-6 w-6 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                  {`${formateur.prenom?.[0] ?? ""}${formateur.nom?.[0] ?? ""}`.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate">{formateur.prenom} {formateur.nom}</span>
              <GraduationCap className="h-3.5 w-3.5 text-primary ml-auto flex-shrink-0" />
            </div>
          )}
        </div>
      ) : (
        /* Desktop: original layout preserved */
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
            {session.numero_session && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] sm:text-xs">
                <Hash className="h-3 w-3 mr-1" />
                {session.numero_session}
              </Badge>
            )}
            <SheetTitle className="text-base sm:text-xl truncate">{session.nom}</SheetTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", getFormationColor(session.formation_type).badge)}>
                {getFormationLabel(session.formation_type)}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-xs", statusConfig[session.statut]?.class)}
              >
                {statusConfig[session.statut]?.label || session.statut}
              </Badge>
              {qualiopiScore && (
                <SessionQualiopiBadge qualiopi={qualiopiScore} />
              )}
              {session.archived && (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-muted">
                  <Archive className="h-3 w-3 mr-1" />
                  Archivée
                </Badge>
              )}
            </div>

            {formateur && (
              <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-accent/50 border border-accent">
                <Avatar className="h-7 w-7 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {`${formateur.prenom?.[0] ?? ""}${formateur.nom?.[0] ?? ""}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Formateur</span>
                  <span className="text-sm font-medium">{formateur.prenom} {formateur.nom}</span>
                </div>
                <GraduationCap className="h-4 w-4 text-primary ml-auto" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {!session.archived && (
              <Button size="sm" onClick={() => onEdit(session)} className="h-8 text-xs sm:text-sm">
                <Edit className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline">Modifier</span>
              </Button>
            )}
            <div className="hidden sm:block">
              <SheetSizeSelector size={size} onSizeChange={onSizeChange} />
            </div>
          </div>
        </div>
      )}
    </SheetHeader>
  );
}
