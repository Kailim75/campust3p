import { useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, Phone, Mail,
  ExternalLink, Check, Bot, CalendarCheck, RotateCcw,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import { useProspects, type Prospect } from "@/hooks/useProspects";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { openWhatsApp } from "@/lib/phone-utils";
import { format, parseISO, isPast, isToday, isTomorrow, endOfWeek, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  createAutoNote, deleteAutoNote, fetchTodayAutoNotes,
  isHandledToday, isProspectRdv, type ActionCategory,
} from "@/lib/aujourdhui-actions";

interface ProspectsAgendaProps {
  onViewDetail: (prospect: Prospect) => void;
}

type AgendaGroup = "overdue" | "today" | "tomorrow" | "week" | "later" | "unscheduled";

const GROUP_CONFIG: Record<AgendaGroup, { label: string; icon: typeof Calendar; color: string }> = {
  overdue:     { label: "En retard",    icon: AlertTriangle, color: "text-destructive" },
  today:       { label: "Aujourd'hui",  icon: Clock,         color: "text-warning" },
  tomorrow:    { label: "Demain",       icon: Calendar,      color: "text-info" },
  week:        { label: "Cette semaine", icon: Calendar,     color: "text-primary" },
  later:       { label: "Plus tard",    icon: Calendar,      color: "text-muted-foreground" },
  unscheduled: { label: "Non planifié", icon: Calendar,      color: "text-muted-foreground/50" },
};

export function ProspectsAgenda({ onViewDetail }: ProspectsAgendaProps) {
  const { data: prospects = [], isLoading } = useProspects();
  const { data: todayNotes = [] } = useQuery({
    queryKey: ["aujourdhui-today-notes"],
    queryFn: fetchTodayAutoNotes,
    staleTime: 30_000,
  });
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aujourdhui-today-notes"] });
    queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["contact-historique"] });
  }, [queryClient]);

  const logAction = useCallback(async (contactId: string, category: ActionCategory, extra?: string) => {
    const result = await createAutoNote(contactId, category, extra);
    if (result) {
      toast.success("Action enregistrée", {
        action: {
          label: "Annuler",
          onClick: async () => {
            await deleteAutoNote(result.id);
            invalidate();
            toast.info("Action annulée");
          },
        },
        duration: 10000,
      });
      invalidate();
    }
    return result;
  }, [invalidate]);

  const grouped = useMemo(() => {
    const active = prospects.filter(p => p.statut !== "converti" && p.statut !== "perdu");
    const groups: Record<AgendaGroup, Array<Prospect & { _isRdv: boolean; _lastNote: string | null }>> = {
      overdue: [], today: [], tomorrow: [], week: [], later: [], unscheduled: [],
    };

    const now = new Date();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    active.forEach(p => {
      const isRdv = isProspectRdv(p);
      // Find last [AUTO] note for this prospect
      const lastNote = todayNotes
        .filter(n => n.contact_id === p.id)
        .map(n => n.created_at)[0] || null;

      const enriched = { ...p, _isRdv: isRdv, _lastNote: lastNote };

      if (!p.date_prochaine_relance) {
        groups.unscheduled.push(enriched);
        return;
      }
      const d = parseISO(p.date_prochaine_relance);
      if (isToday(d)) groups.today.push(enriched);
      else if (isPast(d)) groups.overdue.push(enriched);
      else if (isTomorrow(d)) groups.tomorrow.push(enriched);
      else if (d <= weekEnd) groups.week.push(enriched);
      else groups.later.push(enriched);
    });

    Object.values(groups).forEach(g => g.sort((a, b) => {
      const da = a.date_prochaine_relance ? new Date(a.date_prochaine_relance).getTime() : Infinity;
      const db = b.date_prochaine_relance ? new Date(b.date_prochaine_relance).getTime() : Infinity;
      return da - db;
    }));

    return groups;
  }, [prospects, todayNotes]);

  const isRdvHandledToday = (id: string) =>
    isHandledToday(id, todayNotes, ["RDV", "Confirmation"]);

  const handleConfirmRdv = (p: Prospect) => {
    logAction(p.id, "prospect_confirmation_rdv", `Date: ${p.date_prochaine_relance || "aujourd'hui"}`);
    window.open(`mailto:${p.email}?subject=Confirmation de votre rendez-vous&body=Bonjour ${p.prenom},%0A%0ANous confirmons votre rendez-vous prévu le ${p.date_prochaine_relance ? format(parseISO(p.date_prochaine_relance), "dd/MM/yyyy", { locale: fr }) : "aujourd'hui"}.%0A%0AÀ très bientôt !%0AT3P Campus`);
  };

  const handleRelanceJ1 = (p: Prospect) => {
    logAction(p.id, "prospect_relance_j1", `Date: ${p.date_prochaine_relance || ""}`);
    window.open(`mailto:${p.email}?subject=Rappel — votre rendez-vous demain&body=Bonjour ${p.prenom},%0A%0ANous vous rappelons votre rendez-vous prévu demain.%0A%0AÀ bientôt !%0AT3P Campus`);
  };

  const handleRdvManque = (p: Prospect) => {
    logAction(p.id, "prospect_rdv_manque", `Date initiale: ${p.date_prochaine_relance || ""}`);
    window.open(`mailto:${p.email}?subject=Votre rendez-vous manqué&body=Bonjour ${p.prenom},%0A%0ANous avons constaté que vous n'avez pas pu honorer votre rendez-vous.%0ANous restons disponibles pour reprogrammer un créneau.%0A%0ACordialement,%0AT3P Campus`);
  };

  const handleRelanceEmail = (p: Prospect) => {
    logAction(p.id, "prospect_relance", `Formation: ${p.formation_souhaitee || ""}`);
    window.open(`mailto:${p.email}?subject=Votre projet de formation ${p.formation_souhaitee || ''}&body=Bonjour ${p.prenom},%0A%0ANous revenons vers vous concernant votre projet de formation.%0A%0ACordialement,%0AT3P Campus`);
  };

  const handleWhatsApp = (p: Prospect) => {
    logAction(p.id, "prospect_relance_whatsapp");
    openWhatsApp(p.telephone);
  };

  const handleAppel = (p: Prospect) => {
    logAction(p.id, "prospect_appel");
  };

  const handleMarkDone = async (p: Prospect, bloc: string) => {
    await logAction(p.id, "marquer_fait", `Bloc: ${bloc}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const orderedGroups: AgendaGroup[] = ["overdue", "today", "tomorrow", "week", "later", "unscheduled"];

  return (
    <div className="space-y-5">
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
              {items.slice(0, 15).map(p => {
                const handledToday = isRdvHandledToday(p.id);

                return (
                  <Card key={p.id} className={cn(
                    "p-3 hover:bg-muted/20 transition-colors",
                    groupKey === "overdue" && "border-destructive/30 bg-destructive/5",
                    groupKey === "today" && "border-warning/30 bg-warning/5",
                  )}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onViewDetail(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                          {p.prenom} {p.nom}
                          <ExternalLink className="h-3 w-3 opacity-40" />
                        </button>
                        {/* RDV vs Relance badge */}
                        {p._isRdv ? (
                          <Badge variant="outline" className="text-[9px] bg-warning/15 text-warning border-warning/30">
                            <CalendarCheck className="h-2.5 w-2.5 mr-0.5" /> RDV
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-accent/15 text-accent border-accent/30">
                            <RotateCcw className="h-2.5 w-2.5 mr-0.5" /> Relance
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {p.formation_souhaitee && <Badge variant="outline" className="text-[10px]">{p.formation_souhaitee}</Badge>}
                        {p.date_prochaine_relance && (
                          <span className={cn(
                            "text-[10px]",
                            groupKey === "overdue" ? "text-destructive font-medium" : "text-muted-foreground"
                          )}>
                            {groupKey === "overdue"
                              ? `${Math.abs(differenceInDays(parseISO(p.date_prochaine_relance), new Date()))}j retard`
                              : format(parseISO(p.date_prochaine_relance), "dd/MM", { locale: fr })
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Last contact indicator */}
                    {p._lastNote && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          Dernier contact : aujourd'hui {format(parseISO(p._lastNote), "HH:mm", { locale: fr })}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-1.5 flex-wrap">
                      {p._isRdv ? (
                        /* RDV-specific CTAs */
                        <>
                          {p.email && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={handledToday} onClick={() => handleConfirmRdv(p)}>
                                      <Mail className="h-3 w-3 mr-1" /> Confirmer RDV
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {handledToday && <TooltipContent><p>Déjà fait aujourd'hui</p></TooltipContent>}
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {p.email && groupKey === "tomorrow" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={handledToday} onClick={() => handleRelanceJ1(p)}>
                                      <Clock className="h-3 w-3 mr-1" /> Relance J-1
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {handledToday && <TooltipContent><p>Déjà fait aujourd'hui</p></TooltipContent>}
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {p.email && groupKey === "overdue" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/20" onClick={() => handleRdvManque(p)}>
                              <AlertTriangle className="h-3 w-3 mr-1" /> RDV manqué
                            </Button>
                          )}
                        </>
                      ) : (
                        /* Relance CTAs */
                        <>
                          {p.email && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleRelanceEmail(p)}>
                              <Mail className="h-3 w-3 mr-1" /> Relancer
                            </Button>
                          )}
                        </>
                      )}
                      {p.telephone && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" asChild>
                            <a href={`tel:${p.telephone}`} onClick={() => handleAppel(p)}><Phone className="h-3 w-3" /></a>
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => handleWhatsApp(p)}>
                            <SiWhatsapp className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 text-[10px] text-muted-foreground hover:text-success"
                        onClick={() => handleMarkDone(p, groupKey)}
                      >
                        <Check className="h-3 w-3 mr-1" /> Fait
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {orderedGroups.every(g => grouped[g].length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-success/40" />
          <p className="text-sm font-medium">Aucun prospect à relancer</p>
        </div>
      )}
    </div>
  );
}
