import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, GripVertical, Calendar as CalendarIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO, addDays, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Session, useUpdateSession, useAllSessionInscriptionsCounts } from "@/hooks/useSessions";
import { toast } from "sonner";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";

interface SessionCalendarProps {
  sessions: Session[];
  onSessionClick: (session: Session) => void;
  onSessionEdit: (session: Session) => void;
}

const statusColors: Record<string, string> = {
  a_venir: "bg-info text-info-foreground",
  en_cours: "bg-warning text-warning-foreground",
  terminee: "bg-muted text-muted-foreground",
  annulee: "bg-destructive/50 text-destructive-foreground",
  complet: "bg-success text-success-foreground",
};


interface DragState {
  session: Session;
  originalStartDate: string;
  dragOffset: number; // Difference in days from drag start
}

export function SessionCalendar({ sessions, onSessionClick, onSessionEdit }: SessionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  
  const updateSession = useUpdateSession();
  const { data: inscriptionsCounts = {} } = useAllSessionInscriptionsCounts();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group sessions by start date for the current month view
  const sessionsByDate = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach((session) => {
      const startDate = session.date_debut;
      if (!map[startDate]) map[startDate] = [];
      map[startDate].push(session);
    });
    return map;
  }, [sessions]);

  // Get sessions that span across multiple days
  const getSessionsForDay = useCallback((date: Date): Session[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return sessions.filter((session) => {
      const start = parseISO(session.date_debut);
      const end = parseISO(session.date_fin);
      return date >= start && date <= end;
    });
  }, [sessions]);

  // Check if a session starts on this day
  const isSessionStart = (session: Session, date: Date): boolean => {
    return isSameDay(parseISO(session.date_debut), date);
  };

  // Calculate session duration in days (for display width)
  const getSessionDuration = (session: Session): number => {
    const start = parseISO(session.date_debut);
    const end = parseISO(session.date_fin);
    return differenceInDays(end, start) + 1;
  };

  const handleDragStart = (e: React.DragEvent, session: Session) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", session.id);
    setDragState({
      session,
      originalStartDate: session.date_debut,
      dragOffset: 0,
    });
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);

    if (!dragState) return;

    const { session } = dragState;
    const originalStart = parseISO(session.date_debut);
    const originalEnd = parseISO(session.date_fin);
    const duration = differenceInDays(originalEnd, originalStart);

    const newStartDate = format(targetDate, "yyyy-MM-dd");
    const newEndDate = format(addDays(targetDate, duration), "yyyy-MM-dd");

    if (newStartDate === session.date_debut) {
      setDragState(null);
      return;
    }

    try {
      await updateSession.mutateAsync({
        id: session.id,
        updates: {
          date_debut: newStartDate,
          date_fin: newEndDate,
        },
      });
      toast.success(`Session "${session.nom}" déplacée au ${format(targetDate, "dd MMMM yyyy", { locale: fr })}`);
    } catch {
      toast.error("Erreur lors du déplacement de la session");
    }

    setDragState(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDragOverDate(null);
  };

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Calendrier des sessions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Aujourd'hui
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="w-36 text-center font-medium">
                {format(currentDate, "MMMM yyyy", { locale: fr })}
              </span>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isToday = isSameDay(date, new Date());
            const daySessions = getSessionsForDay(date);
            const isDragOver = dragOverDate && isSameDay(date, dragOverDate);

            return (
              <div
                key={dateStr}
                className={cn(
                  "min-h-[100px] p-1 border rounded-lg transition-all",
                  isCurrentMonth ? "bg-background" : "bg-muted/30",
                  isToday && "ring-2 ring-primary ring-offset-1",
                  isDragOver && "bg-primary/10 border-primary"
                )}
                onDragOver={(e) => handleDragOver(e, date)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, date)}
              >
                {/* Date number */}
                <div
                  className={cn(
                    "text-xs font-medium mb-1 text-right",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                    isToday && "text-primary font-bold"
                  )}
                >
                  {format(date, "d")}
                </div>

                {/* Sessions for this day */}
                <div className="space-y-1">
                  {daySessions.slice(0, 3).map((session) => {
                    const startsHere = isSessionStart(session, date);
                    const inscriptions = inscriptionsCounts[session.id] || 0;

                    if (!startsHere) {
                      // Show continuation indicator
                      return (
                        <div
                          key={session.id}
                          className={cn(
                            "h-6 rounded-r text-xs flex items-center px-1 cursor-pointer opacity-60",
                            statusColors[session.statut],
                            getFormationColor(session.formation_type).border,
                            "border-l-4"
                          )}
                          onClick={() => onSessionClick(session)}
                        >
                          <span className="truncate text-[10px]">↳ {session.nom}</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={session.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, session)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSessionClick(session)}
                        className={cn(
                          "group relative rounded text-xs p-1 cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
                          statusColors[session.statut],
                          getFormationColor(session.formation_type).border,
                          "border-l-4",
                          dragState?.session.id === session.id && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                          <span className="truncate font-medium text-[10px]">
                            {session.nom}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[9px] opacity-80">
                          <Users className="h-2.5 w-2.5" />
                          <span>{inscriptions}/{session.places_totales}</span>
                        </div>
                      </div>
                    );
                  })}
                  {daySessions.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{daySessions.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Legend */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4 text-xs">
          <span className="text-muted-foreground font-medium">Légende:</span>
          {(() => {
            const typesInView = [...new Set(sessions.map(s => s.formation_type))].sort();
            return typesInView.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={cn("w-3 h-3 rounded", getFormationColor(type).dot)} />
                <span className="text-muted-foreground">{getFormationLabel(type)}</span>
              </div>
            ));
          })()}
          <span className="text-muted-foreground ml-auto">
            💡 Glissez-déposez pour reprogrammer
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
