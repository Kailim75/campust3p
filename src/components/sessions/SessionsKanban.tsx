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
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Copy, 
  Trash2,
  Users,
  Calendar,
  MapPin
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUpdateSession, type Session } from "@/hooks/useSessions";
import { toast } from "sonner";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";

type SessionStatus = "a_venir" | "en_cours" | "terminee" | "annulee" | "complet";

const KANBAN_COLUMNS: { id: SessionStatus; label: string; color: string }[] = [
  { id: "a_venir", label: "À venir", color: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" },
  { id: "en_cours", label: "En cours", color: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700" },
  { id: "terminee", label: "Terminée", color: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700" },
  { id: "complet", label: "Complet", color: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700" },
  { id: "annulee", label: "Annulée", color: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700" },
];

const STATUS_BADGE_VARIANTS: Record<SessionStatus, string> = {
  a_venir: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  en_cours: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  terminee: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  complet: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  annulee: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

interface SessionsKanbanProps {
  sessions: Session[];
  inscriptionsCounts: Record<string, number>;
  isLoading: boolean;
  onViewDetail: (session: Session) => void;
  onEdit: (session: Session) => void;
  onDuplicate: (session: Session) => void;
  onDelete: (id: string) => void;
}

export function SessionsKanban({
  sessions,
  inscriptionsCounts,
  isLoading,
  onViewDetail,
  onEdit,
  onDuplicate,
  onDelete,
}: SessionsKanbanProps) {
  const updateSession = useUpdateSession();

  const sessionsByStatus = useMemo(() => {
    const grouped: Record<SessionStatus, Session[]> = {
      a_venir: [],
      en_cours: [],
      terminee: [],
      complet: [],
      annulee: [],
    };

    sessions.forEach((session) => {
      const status = (session.statut as SessionStatus) || "a_venir";
      if (grouped[status]) {
        grouped[status].push(session);
      }
    });

    // Sort sessions within each column by date
    Object.keys(grouped).forEach((status) => {
      grouped[status as SessionStatus].sort(
        (a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
      );
    });

    return grouped;
  }, [sessions]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as SessionStatus;
    
    try {
      await updateSession.mutateAsync({
        id: draggableId,
        updates: { statut: newStatus },
      });
      toast.success(`Session déplacée vers "${KANBAN_COLUMNS.find(c => c.id === newStatus)?.label}"`);
    } catch (error) {
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
            {/* Column Header */}
            <div className={`rounded-t-lg border-2 ${column.color} p-3 mb-2`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{column.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {sessionsByStatus[column.id].length}
                </Badge>
              </div>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 space-y-2 p-2 rounded-b-lg border-2 border-t-0 transition-colors min-h-[200px] ${
                    snapshot.isDraggingOver
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  {sessionsByStatus[column.id].map((session, index) => (
                    <Draggable
                      key={session.id}
                      draggableId={session.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`cursor-grab active:cursor-grabbing transition-shadow ${
                            snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : ""
                          }`}
                        >
                          <CardContent className="p-3 space-y-2">
                            {/* Header with actions */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 
                                  className="font-medium text-sm truncate cursor-pointer hover:text-primary"
                                  onClick={() => onViewDetail(session)}
                                >
                                  {session.nom}
                                </h4>
                                {session.numero_session && (
                                  <p className="text-xs text-muted-foreground">
                                    #{session.numero_session}
                                  </p>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => onViewDetail(session)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Voir détails
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onEdit(session)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onDuplicate(session)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Dupliquer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => onDelete(session.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Formation type badge */}
                            <Badge variant="outline" className={cn("text-xs", getFormationColor(session.formation_type).badge)}>
                              {getFormationLabel(session.formation_type)}
                            </Badge>

                            {/* Meta info */}
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
                                  <span className="truncate">
                                    {session.adresse_ville || session.lieu}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>
                                  {inscriptionsCounts[session.id] || 0} inscrits
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
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
