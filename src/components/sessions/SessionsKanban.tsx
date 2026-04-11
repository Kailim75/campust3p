import { useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal, Eye, Pencil, Copy, Trash2, Users, Calendar, MapPin, AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUpdateSession, type Session } from "@/hooks/useSessions";
import { toast } from "sonner";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";

type SessionStatus = "a_venir" | "en_cours" | "terminee" | "annulee" | "complet";

const KANBAN_COLUMNS: { id: SessionStatus; label: string; bgClass: string; borderClass: string }[] = [
  { id: "a_venir", label: "À venir", bgClass: "bg-info/10", borderClass: "border-info/30" },
  { id: "en_cours", label: "En cours", bgClass: "bg-warning/10", borderClass: "border-warning/30" },
  { id: "terminee", label: "Terminée", bgClass: "bg-success/10", borderClass: "border-success/30" },
  { id: "complet", label: "Complet", bgClass: "bg-primary/10", borderClass: "border-primary/30" },
  { id: "annulee", label: "Annulée", bgClass: "bg-destructive/10", borderClass: "border-destructive/30" },
];

interface SessionsKanbanProps {
  sessions: Session[];
  inscriptionsCounts: Record<string, number>;
  isLoading: boolean;
  onViewDetail: (session: Session) => void;
  onEdit: (session: Session) => void;
  onDuplicate: (session: Session) => void;
  onDelete: (id: string) => void;
}

function isSessionCritical(session: Session, inscriptionsCounts: Record<string, number>) {
  if (session.statut !== "a_venir") return false;

  const daysUntil = Math.ceil(
    (new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntil > 14 || daysUntil < 0) return false;

  const inscrits = inscriptionsCounts[session.id] || 0;
  const fillRate = session.places_totales > 0 ? inscrits / session.places_totales : 0;
  return fillRate < 0.5;
}

function getBusinessPriority(session: Session, inscriptionsCounts: Record<string, number>) {
  const inscrits = inscriptionsCounts[session.id] || 0;
  const fillRate = session.places_totales > 0 ? (inscrits / session.places_totales) * 100 : 100;
  const daysUntil = Math.ceil(
    (new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (fillRate < 50 && daysUntil <= 14 && daysUntil >= 0) {
    return { label: "Risque élevé", className: "bg-destructive/10 text-destructive border-destructive/20" };
  }

  if (fillRate < 70) {
    return { label: "À surveiller", className: "bg-warning/10 text-warning border-warning/20" };
  }

  return { label: "OK", className: "bg-success/10 text-success border-success/20" };
}

function getKanbanSynthesis(session: Session, fillRate: number) {
  const daysUntil = Math.ceil(
    (new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (session.statut === "annulee") return "Session annulée";
  if (session.statut === "terminee") return fillRate < 50 ? "Session terminée avec faible remplissage" : "Session terminée";
  if (fillRate >= 100) return "Session complète";
  if (fillRate < 50 && daysUntil <= 14 && daysUntil >= 0) return "Remplissage insuffisant à l'approche du démarrage";
  if (daysUntil <= 7 && daysUntil >= 0 && fillRate < 70) return "Démarrage proche, remplissage à surveiller";
  if (fillRate < 70) return "Remplissage encore en cours";
  return "Bonne trajectoire";
}

export function SessionsKanban({
  sessions, inscriptionsCounts, isLoading,
  onViewDetail, onEdit, onDuplicate, onDelete,
}: SessionsKanbanProps) {
  const updateSession = useUpdateSession();

  const sessionsByStatus = useMemo(() => {
    const grouped: Record<SessionStatus, Session[]> = {
      a_venir: [], en_cours: [], terminee: [], complet: [], annulee: [],
    };
    sessions.forEach((session) => {
      const status = (session.statut as SessionStatus) || "a_venir";
      if (grouped[status]) grouped[status].push(session);
    });
    Object.keys(grouped).forEach((status) => {
      grouped[status as SessionStatus].sort(
        (a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
      );
    });
    return grouped;
  }, [sessions]);

  const columnSummaries = useMemo(() => {
    return Object.fromEntries(
      KANBAN_COLUMNS.map((column) => {
        const columnSessions = sessionsByStatus[column.id];
        const criticalCount = columnSessions.filter((session) => isSessionCritical(session, inscriptionsCounts)).length;
        const totalInscrits = columnSessions.reduce((total, session) => total + (inscriptionsCounts[session.id] || 0), 0);
        const totalPlaces = columnSessions.reduce((total, session) => total + session.places_totales, 0);

        return [
          column.id,
          {
            criticalCount,
            totalInscrits,
            totalPlaces,
            fillRate: totalPlaces > 0 ? Math.round((totalInscrits / totalPlaces) * 100) : 0,
          },
        ];
      }),
    ) as Record<SessionStatus, { criticalCount: number; totalInscrits: number; totalPlaces: number; fillRate: number }>;
  }, [inscriptionsCounts, sessionsByStatus]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStatus = destination.droppableId as SessionStatus;
    try {
      await updateSession.mutateAsync({ id: draggableId, updates: { statut: newStatus } });
      toast.success(`Session déplacée vers "${KANBAN_COLUMNS.find(c => c.id === newStatus)?.label}"`);
    } catch {
      toast.error("Erreur lors du changement de statut");
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.id} className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[500px]">
        {KANBAN_COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col">
            {(() => {
              const summary = columnSummaries[column.id];
              return (
            <div className={cn("rounded-t-lg border-2 p-3 mb-2", column.bgClass, column.borderClass)}>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{column.label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {sessionsByStatus[column.id].length}
                    </Badge>
                    {summary.criticalCount > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {summary.criticalCount} critique{summary.criticalCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {summary.totalInscrits}/{summary.totalPlaces || 0} places · {summary.fillRate}%
                  </p>
                </div>
              </div>
            </div>
              );
            })()}

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex-1 space-y-2 p-2 rounded-b-lg border-2 border-t-0 min-h-[200px] transition-colors",
                    snapshot.isDraggingOver ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
                  )}
                >
                  {sessionsByStatus[column.id].map((session, index) => {
                    const inscrits = inscriptionsCounts[session.id] || 0;
                    const fillRate = session.places_totales > 0 ? Math.round((inscrits / session.places_totales) * 100) : 0;
                    const fillColor = fillRate >= 70 ? "bg-success" : fillRate >= 40 ? "bg-warning" : "bg-destructive";
                    const fillText = fillRate >= 70 ? "text-success" : fillRate >= 40 ? "text-warning" : "text-destructive";
                    const isCritical = isSessionCritical(session, inscriptionsCounts);
                    const priority = getBusinessPriority(session, inscriptionsCounts);
                    const synthesis = getKanbanSynthesis(session, fillRate);

                    return (
                      <Draggable key={session.id} draggableId={session.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "cursor-grab active:cursor-grabbing transition-shadow",
                              isCritical && "border-destructive/40 bg-destructive/[0.03]",
                              snapshot.isDragging && "shadow-lg ring-2 ring-primary/20"
                            )}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className="font-medium text-sm truncate cursor-pointer hover:text-primary"
                                    onClick={() => onViewDetail(session)}
                                  >
                                    {session.nom}
                                  </h4>
                                  {session.numero_session && (
                                    <p className="text-xs text-muted-foreground font-mono">#{session.numero_session}</p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onViewDetail(session)}>
                                      <Eye className="h-4 w-4 mr-2" />Voir détails
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onEdit(session)}>
                                      <Pencil className="h-4 w-4 mr-2" />Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDuplicate(session)}>
                                      <Copy className="h-4 w-4 mr-2" />Dupliquer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(session.id)}>
                                      <Trash2 className="h-4 w-4 mr-2" />Envoyer à la corbeille
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              <Badge variant="outline" className={cn("text-xs", getFormationColor(session.formation_type).badge)}>
                                {getFormationLabel(session.formation_type)}
                              </Badge>

                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className={cn("text-[10px]", priority.className)}>
                                  {priority.label}
                                </Badge>
                                {isCritical && (
                                  <Badge variant="destructive" className="gap-1 text-[10px]">
                                    <AlertTriangle className="h-3 w-3" />
                                    Critique
                                  </Badge>
                                )}
                              </div>

                              {/* Fill rate bar */}
                              <div>
                                <div className="flex items-center justify-between text-[10px] mb-1">
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Users className="h-2.5 w-2.5" />
                                    {inscrits}/{session.places_totales}
                                  </span>
                                  <span className={cn("font-semibold tabular-nums", fillText)}>{fillRate}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full transition-all", fillColor)}
                                    style={{ width: `${Math.min(fillRate, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {format(parseISO(session.date_debut), "d MMM", { locale: fr })}
                                    {session.date_fin !== session.date_debut && (
                                      <> - {format(parseISO(session.date_fin), "d MMM", { locale: fr })}</>
                                    )}
                                  </span>
                                </div>
                                {(session.adresse_ville || session.lieu) && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{session.adresse_ville || session.lieu}</span>
                                  </div>
                                )}
                              </div>

                              <p className={cn("text-[11px] leading-tight", isCritical ? "text-destructive" : "text-muted-foreground")}>
                                {synthesis}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}

                  {sessionsByStatus[column.id].length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Aucune session
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
