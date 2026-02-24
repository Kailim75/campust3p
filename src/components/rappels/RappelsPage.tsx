import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Bell,
  BellOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Search,
  User,
  Filter,
  ExternalLink,
} from "lucide-react";
import { useHistoriqueAlerts, useUpdateHistoriqueAlert } from "@/hooks/useContactHistorique";
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type RappelStatus = "overdue" | "today" | "tomorrow" | "upcoming";

function getRappelStatus(dateRappel: string): RappelStatus {
  const date = startOfDay(parseISO(dateRappel));
  const now = startOfDay(new Date());
  if (isToday(date)) return "today";
  if (isTomorrow(date)) return "tomorrow";
  if (isPast(date)) return "overdue";
  return "upcoming";
}

const STATUS_CONFIG: Record<RappelStatus, { label: string; icon: typeof Bell; className: string; cardClass: string; dotColor: string }> = {
  overdue: {
    label: "En retard",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
    cardClass: "border-l-4 border-l-destructive",
    dotColor: "bg-destructive",
  },
  today: {
    label: "Aujourd'hui",
    icon: Bell,
    className: "bg-warning/10 text-warning border-warning/20",
    cardClass: "border-l-4 border-l-warning",
    dotColor: "bg-warning",
  },
  tomorrow: {
    label: "Demain",
    icon: Clock,
    className: "bg-info/10 text-info border-info/20",
    cardClass: "border-l-4 border-l-info",
    dotColor: "bg-info",
  },
  upcoming: {
    label: "À venir",
    icon: Calendar,
    className: "bg-primary/10 text-primary border-primary/20",
    cardClass: "border-l-4 border-l-primary",
    dotColor: "bg-primary",
  },
};

type FilterType = "all" | "overdue" | "today" | "tomorrow" | "upcoming";

export default function RappelsPage() {
  const { data: alertsRaw, isLoading } = useHistoriqueAlerts();
  const updateAlert = useUpdateHistoriqueAlert();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleGoToContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setDetailOpen(true);
  };

  const rappels = useMemo(() => {
    if (!alertsRaw) return [];
    return alertsRaw
      .filter((a: any) => a.date_rappel)
      .map((a: any) => ({
        ...a,
        status: getRappelStatus(a.date_rappel),
        contactNom: a.contacts ? `${a.contacts.prenom} ${a.contacts.nom}` : "Contact inconnu",
      }))
      .sort((a: any, b: any) => {
        const order: Record<RappelStatus, number> = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return new Date(a.date_rappel).getTime() - new Date(b.date_rappel).getTime();
      });
  }, [alertsRaw]);

  const filtered = useMemo(() => {
    let result = rappels;
    if (filter !== "all") result = result.filter((r: any) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r: any) =>
        r.contactNom.toLowerCase().includes(q) ||
        (r.titre || "").toLowerCase().includes(q) ||
        (r.rappel_description || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [rappels, filter, search]);

  const stats = useMemo(() => {
    const counts = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };
    rappels.forEach((r: any) => {
      counts[r.status as RappelStatus]++;
    });
    return counts;
  }, [rappels]);

  const handleMarkDone = (rappel: any) => {
    updateAlert.mutate({
      id: rappel.id,
      contactId: rappel.contact_id,
      alerte_active: false,
      date_rappel: rappel.date_rappel,
      rappel_description: rappel.rappel_description,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: rappels.length },
    { key: "overdue", label: "En retard", count: stats.overdue },
    { key: "today", label: "Aujourd'hui", count: stats.today },
    { key: "tomorrow", label: "Demain", count: stats.tomorrow },
    { key: "upcoming", label: "À venir", count: stats.upcoming },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Station Rappels
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })} — {rappels.length} rappel{rappels.length > 1 ? "s" : ""} actif{rappels.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "En retard", value: stats.overdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", borderColor: "border-destructive/20" },
          { label: "Aujourd'hui", value: stats.today, icon: Bell, color: "text-warning", bg: "bg-warning/10", borderColor: "border-warning/20" },
          { label: "Demain", value: stats.tomorrow, icon: Clock, color: "text-info", bg: "bg-info/10", borderColor: "border-info/20" },
          { label: "À venir", value: stats.upcoming, icon: Calendar, color: "text-primary", bg: "bg-primary/10", borderColor: "border-primary/20" },
        ].map((s) => (
          <Card key={s.label} className={cn("p-4 flex items-center gap-4 border", s.borderColor)}>
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
              <s.icon className={cn("h-5 w-5", s.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un rappel ou un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {filterButtons.map((fb) => (
            <Button
              key={fb.key}
              size="sm"
              variant={filter === fb.key ? "default" : "outline"}
              className={cn("text-xs whitespace-nowrap", filter === fb.key && "bg-primary text-primary-foreground")}
              onClick={() => setFilter(fb.key)}
            >
              {fb.label}
              <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                {fb.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Rappels List */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                {filter === "all" && !search ? "Aucun rappel actif" : "Aucun résultat"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filter === "all" && !search
                  ? "Créez des rappels depuis les fiches apprenants"
                  : "Essayez de modifier vos filtres"}
              </p>
            </Card>
          ) : (
            filtered.map((rappel: any) => {
              const config = STATUS_CONFIG[rappel.status as RappelStatus];
              const StatusIcon = config.icon;
              const daysUntil = differenceInDays(startOfDay(parseISO(rappel.date_rappel)), startOfDay(new Date()));

              return (
                <Card
                  key={rappel.id}
                  className={cn(
                    "p-4 transition-all hover:shadow-md group cursor-pointer",
                    config.cardClass
                  )}
                  onClick={() => handleGoToContact(rappel.contact_id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <div className={cn("mt-1.5 h-2.5 w-2.5 rounded-full shrink-0", config.dotColor)} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.className)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {rappel.status === "overdue"
                            ? `${Math.abs(daysUntil)}j de retard`
                            : rappel.status === "today"
                            ? "Aujourd'hui"
                            : rappel.status === "tomorrow"
                            ? "Demain"
                            : `Dans ${daysUntil}j`}
                        </span>
                      </div>

                      {/* Title / Description */}
                      <p className="text-sm font-medium text-foreground mb-0.5 truncate">
                        {rappel.rappel_description || rappel.titre || "Rappel"}
                      </p>

                      {/* Contact */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-primary underline-offset-2 group-hover:underline">{rappel.contactNom}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Date/Time */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(rappel.date_rappel), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </div>
                    </div>

                    {/* Actions */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkDone(rappel);
                      }}
                      disabled={updateAlert.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Traité
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
