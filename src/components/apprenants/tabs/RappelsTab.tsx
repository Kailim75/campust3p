import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  BellOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { useContactHistorique, useUpdateHistoriqueAlert } from "@/hooks/useContactHistorique";
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface RappelsTabProps {
  contactId: string;
}

type RappelStatus = "overdue" | "today" | "tomorrow" | "upcoming" | "done";

function getRappelStatus(dateRappel: string, alerteActive: boolean | null): RappelStatus {
  if (!alerteActive) return "done";
  const date = parseISO(dateRappel);
  if (isToday(date)) return "today";
  if (isTomorrow(date)) return "tomorrow";
  if (isPast(date)) return "overdue";
  return "upcoming";
}

const STATUS_CONFIG: Record<RappelStatus, { label: string; icon: typeof Bell; className: string; cardClass: string }> = {
  overdue: {
    label: "En retard",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
    cardClass: "border-destructive/30 bg-destructive/5",
  },
  today: {
    label: "Aujourd'hui",
    icon: Bell,
    className: "bg-warning/10 text-warning border-warning/20",
    cardClass: "border-warning/30 bg-warning/5",
  },
  tomorrow: {
    label: "Demain",
    icon: Clock,
    className: "bg-info/10 text-info border-info/20",
    cardClass: "border-info/20",
  },
  upcoming: {
    label: "À venir",
    icon: Calendar,
    className: "bg-primary/10 text-primary border-primary/20",
    cardClass: "",
  },
  done: {
    label: "Terminé",
    icon: CheckCircle2,
    className: "bg-muted text-muted-foreground border-border",
    cardClass: "opacity-60",
  },
};

export function RappelsTab({ contactId }: RappelsTabProps) {
  const { data: historique, isLoading } = useContactHistorique(contactId);
  const updateAlert = useUpdateHistoriqueAlert();

  const rappels = useMemo(() => {
    if (!historique) return [];
    return historique
      .filter((h) => h.date_rappel)
      .map((h) => ({
        ...h,
        status: getRappelStatus(h.date_rappel!, h.alerte_active),
      }))
      .sort((a, b) => {
        const order: Record<RappelStatus, number> = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3, done: 4 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return new Date(a.date_rappel!).getTime() - new Date(b.date_rappel!).getTime();
      });
  }, [historique]);

  const stats = useMemo(() => {
    const counts = { overdue: 0, today: 0, upcoming: 0, done: 0 };
    rappels.forEach((r) => {
      if (r.status === "overdue") counts.overdue++;
      else if (r.status === "today") counts.today++;
      else if (r.status === "done") counts.done++;
      else counts.upcoming++;
    });
    return counts;
  }, [rappels]);

  const handleToggle = (rappel: any) => {
    updateAlert.mutate({
      id: rappel.id,
      contactId,
      alerte_active: !rappel.alerte_active,
      date_rappel: rappel.date_rappel,
      rappel_description: rappel.rappel_description,
    });
  };

  if (isLoading) return <Skeleton className="h-[300px] rounded-xl" />;

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "En retard", value: stats.overdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Aujourd'hui", value: stats.today, icon: Bell, color: "text-warning", bg: "bg-warning/10" },
          { label: "À venir", value: stats.upcoming, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
          { label: "Terminés", value: stats.done, icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted" },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center space-y-1">
            <div className={cn("mx-auto h-8 w-8 rounded-full flex items-center justify-center", s.bg)}>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Rappels list */}
      <ScrollArea className="h-[380px]">
        <div className="space-y-2">
          {rappels.length === 0 ? (
            <Card className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun rappel programmé</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Créez un rappel depuis l'onglet Notes
              </p>
            </Card>
          ) : (
            rappels.map((rappel) => {
              const config = STATUS_CONFIG[rappel.status];
              const StatusIcon = config.icon;
              const daysUntil = differenceInDays(parseISO(rappel.date_rappel!), new Date());

              return (
                <Card
                  key={rappel.id}
                  className={cn("p-4 transition-all hover:shadow-sm", config.cardClass)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", config.className.split(" ").filter(c => c.startsWith("bg-")).join(" "))}>
                      <StatusIcon className={cn("h-4 w-4", config.className.split(" ").filter(c => c.startsWith("text-")).join(" "))} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.className)}>
                          {config.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {rappel.status === "overdue"
                            ? `${Math.abs(daysUntil)}j de retard`
                            : rappel.status === "today"
                            ? "Maintenant"
                            : rappel.status === "tomorrow"
                            ? "Dans 1 jour"
                            : rappel.status === "upcoming"
                            ? `Dans ${daysUntil}j`
                            : ""}
                        </span>
                      </div>

                      {rappel.rappel_description && (
                        <p className="text-sm font-medium text-foreground mb-1 truncate">
                          {rappel.rappel_description}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(rappel.date_rappel!), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </div>

                      {rappel.contenu && (
                        <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-2">
                          {rappel.contenu}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-8 w-8 p-0"
                      onClick={() => handleToggle(rappel)}
                      disabled={updateAlert.isPending}
                    >
                      {rappel.alerte_active ? (
                        <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Bell className="h-3.5 w-3.5 text-primary" />
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
