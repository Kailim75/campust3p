import { useState, useCallback } from "react";
import { ArrowRight, Phone, FileText, UserX, MessageCircle, CheckCircle2, CalendarClock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTodayActions, ActionItem } from "@/hooks/useDashboardActionData";
import { formatEur } from "@/lib/format-currency";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addDays, nextMonday, format } from "date-fns";

interface Props {
  onNavigate: (section: string, params?: Record<string, string>) => void;
  onOpenContact: (contactId: string) => void;
}

const typeConfig: Record<ActionItem["type"], { icon: typeof Phone; color: string; sectionLabel: string }> = {
  prospect: { icon: Phone, color: "text-primary", sectionLabel: "Relances prospects" },
  facture: { icon: FileText, color: "text-warning", sectionLabel: "Factures / paiements" },
  apprenant: { icon: UserX, color: "text-destructive", sectionLabel: "Apprenants / docs" },
};

type TimeFilter = "all" | "late" | "today" | "week";
type TypeFilter = "all" | "prospect" | "facture" | "apprenant";

const RESCHEDULE_PRESETS = [
  { label: "Demain", getDate: () => format(addDays(new Date(), 1), "yyyy-MM-dd") },
  { label: "Dans 3 jours", getDate: () => format(addDays(new Date(), 3), "yyyy-MM-dd") },
  { label: "Semaine prochaine", getDate: () => format(nextMonday(new Date()), "yyyy-MM-dd") },
];

function QuickActions({ item, onMarkDone }: { item: ActionItem; onMarkDone: (item: ActionItem) => void }) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("Relance replanifiée depuis dashboard");
  const queryClient = useQueryClient();

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.telephone) {
      const phone = item.telephone.replace(/\s/g, "").replace(/^0/, "33");
      window.open(`https://wa.me/${phone}`, "_blank");
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.telephone) {
      window.open(`tel:${item.telephone}`, "_self");
    }
  };

  const handleReschedule = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rescheduleDate) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("action_logs").insert({
        user_id: user.id,
        action_type: "reschedule",
        entity_type: item.type,
        entity_id: item.entityId,
        label: item.label,
        note: rescheduleNote || null,
        metadata: { new_date: rescheduleDate },
      });

      if (item.type === "prospect") {
        await supabase.from("prospects").update({ date_prochaine_relance: rescheduleDate }).eq("id", item.entityId);
      }

      toast.success("Replanifié avec succès");
      setRescheduleOpen(false);
      setRescheduleDate("");
      setRescheduleNote("Relance replanifiée depuis dashboard");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      toast.error("Erreur lors de la replanification");
    }
  };

  return (
    <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
      {item.telephone && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleWhatsApp} className="p-1 rounded hover:bg-primary/10 transition-colors">
                <MessageCircle className="h-3.5 w-3.5 text-green-600" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">WhatsApp</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleCall} className="p-1 rounded hover:bg-primary/10 transition-colors">
                <Phone className="h-3.5 w-3.5 text-primary" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Appeler</TooltipContent>
          </Tooltip>
        </>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => { e.stopPropagation(); onMarkDone(item); }}
            className="p-1 rounded hover:bg-green-500/10 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">Marquer fait</TooltipContent>
      </Tooltip>
      <Popover open={rescheduleOpen} onOpenChange={(open) => {
        setRescheduleOpen(open);
        if (open) {
          setRescheduleDate("");
          setRescheduleNote("Relance replanifiée depuis dashboard");
        }
      }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-primary/10 transition-colors"
              >
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Replanifier</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-64 p-3" align="end" onClick={e => e.stopPropagation()}>
          <p className="text-xs font-medium mb-2">Replanifier</p>
          {/* Presets */}
          <div className="flex gap-1.5 mb-2">
            {RESCHEDULE_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setRescheduleDate(p.getDate())}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                  rescheduleDate === p.getDate()
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Input
            type="date"
            value={rescheduleDate}
            onChange={e => setRescheduleDate(e.target.value)}
            className="text-xs h-8 mb-2"
          />
          <Textarea
            placeholder="Note (optionnel)"
            value={rescheduleNote}
            onChange={e => setRescheduleNote(e.target.value)}
            className="text-xs min-h-[50px] mb-2"
          />
          <Button size="sm" className="w-full text-xs h-7" onClick={handleReschedule} disabled={!rescheduleDate}>
            Confirmer
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const timeFilters: { key: TimeFilter; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "late", label: "En retard" },
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
];

const typeFilters: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "prospect", label: "Prospects" },
  { key: "facture", label: "Factures" },
  { key: "apprenant", label: "Docs" },
];

export function ActionPanelToday({ onNavigate, onOpenContact }: Props) {
  const { data: items, isLoading } = useTodayActions();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const handleMarkDone = useCallback(async (item: ActionItem) => {
    // Optimistic: hide immediately
    setDismissedIds(prev => new Set(prev).add(item.id));

    let logId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { data: logData } = await supabase.from("action_logs").insert({
        user_id: user.id,
        action_type: "mark_done",
        entity_type: item.type,
        entity_id: item.entityId,
        label: item.label,
        metadata: { reason: item.reason },
      }).select("id").single();

      logId = logData?.id ?? null;

      if (item.type === "prospect" || item.type === "apprenant") {
        await supabase.from("contact_historique").insert({
          contact_id: item.entityId,
          titre: "[AUTO] Traité depuis dashboard",
          type: "note",
          date_echange: new Date().toISOString().split("T")[0],
          contenu: `Action "${item.reason}" traitée`,
          created_by: user.id,
        });
      }

      toast.success("Marqué comme fait", {
        duration: 10000,
        action: {
          label: "Annuler",
          onClick: async () => {
            // Rollback
            setDismissedIds(prev => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            });
            if (logId) {
              await supabase.from("action_logs").delete().eq("id", logId);
            }
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            toast.info("Action annulée");
          },
        },
      });

      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      // Rollback on error
      setDismissedIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      toast.error("Erreur");
    }
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}
      </div>
    );
  }

  // Apply filters + dismiss
  let filtered = (items || []).filter(i => !dismissedIds.has(i.id));
  if (timeFilter === "late") filtered = filtered.filter(i => (i.retardDays ?? 0) > 0);
  else if (timeFilter === "today") filtered = filtered.filter(i => (i.retardDays ?? 0) === 0);
  if (typeFilter !== "all") filtered = filtered.filter(i => i.type === typeFilter);

  const grouped = {
    prospect: filtered.filter(i => i.type === "prospect"),
    facture: filtered.filter(i => i.type === "facture"),
    apprenant: filtered.filter(i => i.type === "apprenant"),
  };
  const lateCount = filtered.filter((item) => (item.retardDays ?? 0) > 0).length;
  const dueTodayCount = filtered.filter((item) => (item.retardDays ?? 0) === 0).length;
  const groupSummary = [
    grouped.prospect.length > 0 ? `${grouped.prospect.length} relance${grouped.prospect.length > 1 ? "s" : ""}` : null,
    grouped.facture.length > 0 ? `${grouped.facture.length} paiement${grouped.facture.length > 1 ? "s" : ""}` : null,
    grouped.apprenant.length > 0 ? `${grouped.apprenant.length} dossier${grouped.apprenant.length > 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">À traiter aujourd&apos;hui</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {filtered.length === 0
                ? "Aucune action prioritaire détectée."
                : [
                    lateCount > 0 ? `${lateCount} en retard` : null,
                    dueTodayCount > 0 ? `${dueTodayCount} à traiter aujourd'hui` : null,
                    groupSummary || null,
                  ].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {filtered.length}
          </Badge>
        </div>

        {/* Filter chips */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Échéance
            </span>
            {timeFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setTimeFilter(f.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                  timeFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Type
            </span>
            {typeFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                  typeFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-5 text-center">
            Rien d&apos;urgent pour le moment.
          </p>
        )}

        <div className="space-y-4">
        {(["prospect", "facture", "apprenant"] as const).map(type => {
          const group = grouped[type];
          if (group.length === 0) return null;
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <div key={type} className="last:mb-0">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", config.color)} />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                    {config.sectionLabel}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
                    {group.length}
                  </Badge>
                </div>
                <button
                  onClick={() => onNavigate(group[0].section)}
                  className="text-[11px] text-primary hover:underline shrink-0"
                >
                  Voir
                </button>
              </div>
              <div className="space-y-1">
                {group.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.type === "apprenant") onOpenContact(item.entityId);
                      else if (item.type === "prospect") onNavigate("prospects");
                      else onNavigate(item.section);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                        {item.montant != null && item.montant > 0 && (
                          <span className="text-xs font-semibold text-foreground shrink-0">
                            {formatEur(item.montant)}
                          </span>
                        )}
                        {(item.retardDays ?? 0) > 0 && (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] border-destructive/30 bg-destructive/5 text-destructive shrink-0"
                          >
                            {item.retardDays}j retard
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs",
                        item.retardDays && item.retardDays > 0 ? "text-destructive font-medium" : "text-muted-foreground"
                      )}>
                        {item.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {item.track && (
                        <Badge variant="outline" className="text-[10px] ml-1">
                          {item.track === "initial" ? "Initial" : "Continue"}
                        </Badge>
                      )}
                      <QuickActions item={item} onMarkDone={handleMarkDone} />
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </TooltipProvider>
  );
}
