import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, Phone, Mail,
  ExternalLink,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import { useProspects, type Prospect } from "@/hooks/useProspects";
import { openWhatsApp } from "@/lib/phone-utils";
import { format, parseISO, isPast, isToday, isTomorrow, addDays, differenceInDays, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

interface ProspectsAgendaProps {
  onViewDetail: (prospect: Prospect) => void;
}

type AgendaGroup = "overdue" | "today" | "tomorrow" | "week" | "later" | "unscheduled";

const GROUP_CONFIG: Record<AgendaGroup, { label: string; icon: typeof Calendar; color: string }> = {
  overdue: { label: "En retard", icon: AlertTriangle, color: "text-destructive" },
  today: { label: "Aujourd'hui", icon: Clock, color: "text-warning" },
  tomorrow: { label: "Demain", icon: Calendar, color: "text-info" },
  week: { label: "Cette semaine", icon: Calendar, color: "text-primary" },
  later: { label: "Plus tard", icon: Calendar, color: "text-muted-foreground" },
  unscheduled: { label: "Non planifié", icon: Calendar, color: "text-muted-foreground/50" },
};

export function ProspectsAgenda({ onViewDetail }: ProspectsAgendaProps) {
  const { data: prospects = [], isLoading } = useProspects();

  const grouped = useMemo(() => {
    const active = prospects.filter(p => p.statut !== "converti" && p.statut !== "perdu");
    const groups: Record<AgendaGroup, Prospect[]> = {
      overdue: [], today: [], tomorrow: [], week: [], later: [], unscheduled: [],
    };

    const now = new Date();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    active.forEach(p => {
      if (!p.date_prochaine_relance) {
        groups.unscheduled.push(p);
        return;
      }
      const d = parseISO(p.date_prochaine_relance);
      if (isToday(d)) groups.today.push(p);
      else if (isPast(d)) groups.overdue.push(p);
      else if (isTomorrow(d)) groups.tomorrow.push(p);
      else if (d <= weekEnd) groups.week.push(p);
      else groups.later.push(p);
    });

    // Sort each group by date
    Object.values(groups).forEach(g => g.sort((a, b) => {
      const da = a.date_prochaine_relance ? new Date(a.date_prochaine_relance).getTime() : Infinity;
      const db = b.date_prochaine_relance ? new Date(b.date_prochaine_relance).getTime() : Infinity;
      return da - db;
    }));

    return groups;
  }, [prospects]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const orderedGroups: AgendaGroup[] = ["overdue", "today", "tomorrow", "week", "later", "unscheduled"];

  return (
    <div className="space-y-4">
      {orderedGroups.map(groupKey => {
        const items = grouped[groupKey];
        if (items.length === 0) return null;
        const config = GROUP_CONFIG[groupKey];
        const Icon = config.icon;

        return (
          <div key={groupKey}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn("h-4 w-4", config.color)} />
              <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
              <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.slice(0, 10).map(p => (
                <Card key={p.id} className={cn(
                  "p-3 hover:bg-muted/20 transition-colors",
                  groupKey === "overdue" && "border-destructive/30 bg-destructive/5",
                  groupKey === "today" && "border-warning/30 bg-warning/5",
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <button onClick={() => onViewDetail(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                      {p.prenom} {p.nom}
                      <ExternalLink className="h-3 w-3 opacity-40" />
                    </button>
                    <div className="flex items-center gap-2">
                      {p.formation_souhaitee && <Badge variant="outline" className="text-[10px]">{p.formation_souhaitee}</Badge>}
                      {p.date_prochaine_relance && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(p.date_prochaine_relance), "dd/MM", { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {p.email && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                          <a href={`mailto:${p.email}?subject=Confirmation de votre rendez-vous&body=Bonjour ${p.prenom},%0A%0ANous confirmons votre rendez-vous.%0A%0AÀ très bientôt !%0AT3P Campus`}>
                            <Mail className="h-3 w-3 mr-1" /> Confirmer
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                          <a href={`mailto:${p.email}?subject=Rappel — votre rendez-vous demain&body=Bonjour ${p.prenom},%0A%0ANous vous rappelons votre rendez-vous prévu prochainement.%0A%0AÀ bientôt !%0AT3P Campus`}>
                            <Clock className="h-3 w-3 mr-1" /> Relance J-1
                          </a>
                        </Button>
                      </>
                    )}
                    {p.telephone && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" asChild>
                          <a href={`tel:${p.telephone}`}><Phone className="h-3 w-3" /></a>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => openWhatsApp(p.telephone)}>
                          <SiWhatsapp className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
