import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, Phone, Mail,
  ExternalLink, Check, Bot, CalendarCheck, RotateCcw, CalendarPlus,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import { useProspects, useUpdateProspect, type Prospect } from "@/hooks/useProspects";
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

interface EnrichedProspect extends Prospect {
  _isRdv: boolean;
  _lastNoteTime: string | null;
  _lastNoteTitle: string | null;
  _relanceHandled: boolean;
  _rdvHandled: boolean;
  _anyHandled: boolean;
}

const GROUP_CONFIG: Record<AgendaGroup, { label: string; icon: typeof Calendar; color: string; emptyLabel: string }> = {
  overdue:     { label: "En retard",     icon: AlertTriangle, color: "text-destructive",        emptyLabel: "Aucun retard" },
  today:       { label: "Aujourd'hui",   icon: Clock,         color: "text-warning",             emptyLabel: "Rien prévu aujourd'hui" },
  tomorrow:    { label: "Demain",        icon: Calendar,      color: "text-info",                emptyLabel: "" },
  week:        { label: "Cette semaine", icon: Calendar,      color: "text-primary",             emptyLabel: "" },
  later:       { label: "Plus tard",     icon: Calendar,      color: "text-muted-foreground",    emptyLabel: "" },
  unscheduled: { label: "Non planifié",  icon: Calendar,      color: "text-muted-foreground/50", emptyLabel: "" },
};

const RELANCE_KEYWORDS = ["Relance prospect", "Relance", "Marqué comme traité"];
const RDV_KEYWORDS = ["RDV", "Confirmation"];

type TypeFilter = "all" | "rdv" | "relance";

export function ProspectsAgenda({ onViewDetail }: ProspectsAgendaProps) {
  const { data: prospects = [], isLoading } = useProspects();
  const { data: todayNotes = [] } = useQuery({
    queryKey: ["aujourdhui-today-notes"],
    queryFn: fetchTodayAutoNotes,
    staleTime: 30_000,
  });
  const queryClient = useQueryClient();
  const updateProspect = useUpdateProspect();
  const [showHandled, setShowHandled] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

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
    const groups: Record<AgendaGroup, EnrichedProspect[]> = {
      overdue: [], today: [], tomorrow: [], week: [], later: [], unscheduled: [],
    };

    const now = new Date();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    active.forEach(p => {
      const isRdv = isProspectRdv(p);
      const prospectNotes = todayNotes.filter(n => n.contact_id === p.id);
      const lastNote = prospectNotes[0] || null;

      const relanceHandled = isHandledToday(p.id, todayNotes, RELANCE_KEYWORDS);
      const rdvHandled = isHandledToday(p.id, todayNotes, RDV_KEYWORDS);
      const anyHandled = prospectNotes.length > 0;

      const enriched: EnrichedProspect = {
        ...p,
        _isRdv: isRdv,
        _lastNoteTime: lastNote?.created_at || null,
        _lastNoteTitle: lastNote?.titre?.replace("[AUTO] ", "") || null,
        _relanceHandled: relanceHandled,
        _rdvHandled: rdvHandled,
        _anyHandled: anyHandled,
      };

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

    // Stable sort: overdue → oldest first, rest → date ascending
    Object.values(groups).forEach(g => g.sort((a, b) => {
      const da = a.date_prochaine_relance ? new Date(a.date_prochaine_relance).getTime() : Infinity;
      const db = b.date_prochaine_relance ? new Date(b.date_prochaine_relance).getTime() : Infinity;
      return da - db;
    }));

    return groups;
  }, [prospects, todayNotes]);

  // Counts for filters
  const allFlat = useMemo(() => Object.values(grouped).flat(), [grouped]);
  const totalHandled = useMemo(() => allFlat.filter(p => p._anyHandled).length, [allFlat]);
  const rdvCount = useMemo(() => allFlat.filter(p => p._isRdv).length, [allFlat]);
  const relanceCount = useMemo(() => allFlat.filter(p => !p._isRdv).length, [allFlat]);

  const handleScheduleDate = useCallback((prospectId: string, date: Date) => {
    updateProspect.mutate(
      { id: prospectId, updates: { date_prochaine_relance: date.toISOString().split("T")[0] } },
      { onSuccess: () => toast.success("Date planifiée") }
    );
  }, [updateProspect]);

  // ─── Action handlers ───
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

  const handleMarkDone = async (p: EnrichedProspect, bloc: string) => {
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
      {/* Toolbar: type filter + toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1">
          {([
            { value: "all" as TypeFilter, label: "Tous", count: rdvCount + relanceCount },
            { value: "rdv" as TypeFilter, label: "RDV", count: rdvCount, icon: CalendarCheck },
            { value: "relance" as TypeFilter, label: "Relances", count: relanceCount, icon: RotateCcw },
          ]).map(opt => (
            <Button
              key={opt.value}
              variant={typeFilter === opt.value ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1"
              onClick={() => setTypeFilter(opt.value)}
            >
              {opt.icon && <opt.icon className="h-3 w-3" />}
              {opt.label}
              <span className="opacity-60">({opt.count})</span>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-handled-agenda" checked={showHandled} onCheckedChange={setShowHandled} />
          <Label htmlFor="show-handled-agenda" className="text-xs text-muted-foreground cursor-pointer">
            Afficher traités
            {totalHandled > 0 && !showHandled && (
              <span className="ml-1 text-muted-foreground/60">({totalHandled})</span>
            )}
          </Label>
        </div>
      </div>

      {orderedGroups.map(groupKey => {
        const allItemsRaw = grouped[groupKey];
        // Apply type filter
        const allItems = typeFilter === "all" ? allItemsRaw
          : typeFilter === "rdv" ? allItemsRaw.filter(p => p._isRdv)
          : allItemsRaw.filter(p => !p._isRdv);
        // Filter out handled items from today/overdue unless toggle is on
        const items = showHandled
          ? allItems
          : allItems.filter(p => !p._anyHandled || groupKey === "tomorrow" || groupKey === "week" || groupKey === "later" || groupKey === "unscheduled");

        if (items.length === 0 && allItems.length === 0) return null;
        const config = GROUP_CONFIG[groupKey];
        const Icon = config.icon;
        const hiddenCount = allItems.length - items.length;

        return (
          <div key={groupKey}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn("h-4 w-4", config.color)} />
              <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
              <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
              {hiddenCount > 0 && !showHandled && (
                <span className="text-[10px] text-muted-foreground/50">+{hiddenCount} traité{hiddenCount > 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-6 py-2">Tous les éléments ont été traités ✓</p>
              ) : items.slice(0, 20).map(p => (
                <AgendaCard
                  key={p.id}
                  prospect={p}
                  groupKey={groupKey}
                  onViewDetail={onViewDetail}
                  onConfirmRdv={handleConfirmRdv}
                  onRelanceJ1={handleRelanceJ1}
                  onRdvManque={handleRdvManque}
                  onRelanceEmail={handleRelanceEmail}
                  onWhatsApp={handleWhatsApp}
                  onAppel={handleAppel}
                  onMarkDone={handleMarkDone}
                  onSchedule={handleScheduleDate}
                />
              ))}
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

// ─── Card sub-component ───

interface AgendaCardProps {
  prospect: EnrichedProspect;
  groupKey: AgendaGroup;
  onViewDetail: (p: Prospect) => void;
  onConfirmRdv: (p: Prospect) => void;
  onRelanceJ1: (p: Prospect) => void;
  onRdvManque: (p: Prospect) => void;
  onRelanceEmail: (p: Prospect) => void;
  onWhatsApp: (p: Prospect) => void;
  onAppel: (p: Prospect) => void;
  onMarkDone: (p: EnrichedProspect, bloc: string) => void;
  onSchedule: (prospectId: string, date: Date) => void;
}

function AgendaCard({
  prospect: p, groupKey,
  onViewDetail, onConfirmRdv, onRelanceJ1, onRdvManque, onRelanceEmail,
  onWhatsApp, onAppel, onMarkDone, onSchedule,
}: AgendaCardProps) {
  const daysLate = p.date_prochaine_relance && groupKey === "overdue"
    ? Math.abs(differenceInDays(parseISO(p.date_prochaine_relance), new Date()))
    : 0;

  const dateDisplay = useMemo(() => {
    if (!p.date_prochaine_relance) return null;
    const d = parseISO(p.date_prochaine_relance);
    if (groupKey === "overdue") return `En retard de ${daysLate}j — ${format(d, "EEEE dd MMM", { locale: fr })}`;
    if (groupKey === "today") return `Aujourd'hui — ${format(d, "HH:mm", { locale: fr }) !== "00:00" ? format(d, "HH:mm") : ""}`;
    return format(d, "EEEE dd MMM", { locale: fr });
  }, [p.date_prochaine_relance, groupKey, daysLate]);

  return (
    <Card className={cn(
      "p-3 hover:bg-muted/20 transition-colors",
      groupKey === "overdue" && "border-destructive/30 bg-destructive/5",
      groupKey === "today" && "border-warning/30 bg-warning/5",
      p._anyHandled && "opacity-60",
    )}>
      {/* Row 1: Name + type + date */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => onViewDetail(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate">
            {p.prenom} {p.nom}
            <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
          </button>
          {p._isRdv ? (
            <Badge variant="outline" className="text-[9px] bg-warning/15 text-warning border-warning/30 shrink-0">
              <CalendarCheck className="h-2.5 w-2.5 mr-0.5" /> RDV
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] bg-accent/15 text-accent border-accent/30 shrink-0">
              <RotateCcw className="h-2.5 w-2.5 mr-0.5" /> Relance
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {p.formation_souhaitee && <Badge variant="outline" className="text-[10px]">{p.formation_souhaitee}</Badge>}
        </div>
      </div>

      {/* Row 2: Date/time display */}
      {dateDisplay && (
        <div className="flex items-center gap-1.5 mb-1.5 pl-0.5">
          <Calendar className={cn("h-3 w-3 shrink-0", groupKey === "overdue" ? "text-destructive" : "text-muted-foreground")} />
          <span className={cn(
            "text-[11px] capitalize",
            groupKey === "overdue" ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {dateDisplay}
          </span>
        </div>
      )}

      {/* Row 3: Last action indicator */}
      {p._lastNoteTime && (
        <div className="flex items-center gap-1.5 mb-1.5 pl-0.5">
          <Bot className="h-3 w-3 text-primary/60 shrink-0" />
          <span className="text-[10px] text-muted-foreground">
            Dernière action : {p._lastNoteTitle} — {format(parseISO(p._lastNoteTime), "HH:mm", { locale: fr })}
          </span>
        </div>
      )}

      {/* Row 4: CTAs */}
      <div className="flex gap-1.5 flex-wrap">
        {p._isRdv ? (
          <>
            {p.email && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={p._rdvHandled} onClick={() => onConfirmRdv(p)}>
                        <Mail className="h-3 w-3 mr-1" /> Confirmer RDV
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {p._rdvHandled && <TooltipContent><p>Déjà fait aujourd'hui</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            )}
            {p.email && groupKey === "tomorrow" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={p._rdvHandled} onClick={() => onRelanceJ1(p)}>
                        <Clock className="h-3 w-3 mr-1" /> Relance J-1
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {p._rdvHandled && <TooltipContent><p>Déjà fait aujourd'hui</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            )}
            {p.email && groupKey === "overdue" && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/20" onClick={() => onRdvManque(p)}>
                <AlertTriangle className="h-3 w-3 mr-1" /> RDV manqué
              </Button>
            )}
          </>
        ) : (
          <>
            {p.email && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={p._relanceHandled} onClick={() => onRelanceEmail(p)}>
                        <Mail className="h-3 w-3 mr-1" /> Relancer
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {p._relanceHandled && <TooltipContent><p>Déjà relancé aujourd'hui</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        )}
        {p.telephone && (
          <>
            <Button size="sm" variant="ghost" className="h-7 text-[10px]" asChild>
              <a href={`tel:${p.telephone}`} onClick={() => onAppel(p)}><Phone className="h-3 w-3" /></a>
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => onWhatsApp(p)}>
              <SiWhatsapp className="h-3 w-3" />
            </Button>
          </>
        )}
        {groupKey === "unscheduled" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-[10px] text-primary border-primary/30">
                <CalendarPlus className="h-3 w-3 mr-1" /> Planifier
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={undefined}
                onSelect={(date) => { if (date) onSchedule(p.id, date); }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        )}
        <Button
          size="sm" variant="ghost"
          className="h-7 text-[10px] text-muted-foreground hover:text-success"
          onClick={(e) => { e.stopPropagation(); onMarkDone(p, groupKey); }}
        >
          <Check className="h-3 w-3 mr-1" /> Fait
        </Button>
      </div>
    </Card>
  );
}
