import React, { useMemo } from "react";
import { useNoShowDetection } from "@/hooks/useNoShowDetection";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Euro,
  TrendingUp,
  Award,
  FileWarning,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CreditCard,
  Clock,
  RefreshCw,
  CheckCircle2,
  UserPlus,
  BookOpen,
  GraduationCap,
  Landmark,
  ChevronRight,
} from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, differenceInDays, addDays, parseISO, endOfMonth, getDate } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { formatEuro } from "@/lib/formatFinancial";

interface DashboardProps {
  onNavigate?: (section: string) => void;
  onNavigateWithContact?: (section: string, contactId?: string) => void;
}

// ─── HOOKS ───────────────────────────────────────────────

function useDashboardMetrics() {
  const { data: contacts, isLoading: contactsLoading } = useContacts();

  const { data: paiements, isLoading: paiementsLoading } = useQuery({
    queryKey: ["dashboard-paiements-month"],
    queryFn: async () => {
      const thisMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const lastMonth = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
      const lastMonthEnd = format(startOfMonth(new Date()), "yyyy-MM-dd");

      const [current, previous] = await Promise.all([
        supabase.from("paiements").select("montant").gte("date_paiement", thisMonth),
        supabase.from("paiements").select("montant").gte("date_paiement", lastMonth).lt("date_paiement", lastMonthEnd),
      ]);

      const caCurrent = (current.data || []).reduce((s, p) => s + Number(p.montant), 0);
      const caPrevious = (previous.data || []).reduce((s, p) => s + Number(p.montant), 0);
      return { caCurrent, caPrevious };
    },
  });

  const { data: examens, isLoading: examensLoading } = useQuery({
    queryKey: ["dashboard-examens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("examens_t3p").select("resultat");
      if (error) throw error;
      const total = (data || []).filter((e) => e.resultat !== "en_attente").length;
      const admis = (data || []).filter((e) => e.resultat === "admis").length;
      return { total, admis, taux: total > 0 ? Math.round((admis / total) * 100) : 0 };
    },
  });

  const { data: sessionsWeek, isLoading: sessionsLoading } = useQuery({
    queryKey: ["dashboard-sessions-week"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const inSevenDays = format(addDays(new Date(), 7), "yyyy-MM-dd");
      const { data, error } = await supabase.from("sessions").select("id").gte("date_debut", today).lte("date_debut", inSevenDays);
      if (error) throw error;
      return data?.length || 0;
    },
  });

  const { data: docsIncomplets, isLoading: docsLoading } = useQuery({
    queryKey: ["dashboard-docs-incomplets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_documents")
        .select("contact_id, type_document")
        .in("type_document", ["cni", "casier_b3", "certificat_medical", "photo", "permis_b"]);
      if (error) throw error;

      const contactDocsCount = new Map<string, number>();
      (data || []).forEach((d) => {
        contactDocsCount.set(d.contact_id, (contactDocsCount.get(d.contact_id) || 0) + 1);
      });

      const activeContacts = contacts?.filter(
        (c) =>
          c.statut === "En formation théorique" ||
          c.statut === "En formation pratique" ||
          c.statut === "En attente de validation"
      ) || [];

      return activeContacts.filter((c) => (contactDocsCount.get(c.id) || 0) < 5).length;
    },
    enabled: !!contacts,
  });

  const metrics = useMemo(() => {
    if (!contacts) return [];

    const activeStatuts = ["En formation théorique", "En formation pratique", "Examen T3P programmé", "Examen pratique programmé"];
    const inscritStatuts = [...activeStatuts, "En attente de validation"];
    const actifs = contacts.filter((c) => activeStatuts.includes(c.statut || "")).length;
    const inscrits = contacts.filter((c) => inscritStatuts.includes(c.statut || "")).length;
    const total = contacts.length;
    const tauxConversion = total > 0 ? Math.round((inscrits / total) * 100) : 0;

    const caChange = paiements
      ? paiements.caPrevious > 0
        ? Math.round(((paiements.caCurrent - paiements.caPrevious) / paiements.caPrevious) * 100)
        : paiements.caCurrent > 0 ? 100 : 0
      : undefined;

    return [
      { label: "Apprenants actifs", value: actifs, icon: Users, color: "text-primary", bgColor: "bg-primary/10", delta: undefined },
      { label: "CA du mois", value: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(paiements?.caCurrent || 0), icon: Euro, color: "text-primary", bgColor: "bg-primary/10", delta: caChange },
      { label: "Taux de conversion", value: `${tauxConversion}%`, icon: TrendingUp, color: "text-success", bgColor: "bg-success/10", delta: undefined },
      { label: "Réussite examens", value: `${examens?.taux || 0}%`, icon: Award, color: "text-info", bgColor: "bg-info/10", delta: undefined },
      { label: "Dossiers incomplets", value: docsIncomplets || 0, icon: FileWarning, color: (docsIncomplets || 0) > 0 ? "text-warning" : "text-success", bgColor: (docsIncomplets || 0) > 0 ? "bg-warning/10" : "bg-success/10", delta: undefined, isWarning: (docsIncomplets || 0) > 0 },
      { label: "Sessions cette semaine", value: sessionsWeek || 0, icon: Calendar, color: "text-primary", bgColor: "bg-primary/10", delta: undefined },
    ];
  }, [contacts, paiements, examens, docsIncomplets, sessionsWeek]);

  return { metrics, isLoading: contactsLoading || paiementsLoading || examensLoading || sessionsLoading || docsLoading };
}

// ─── ALERTS HOOK ─────────────────────────────────────────

interface DashboardAlert {
  id: string;
  type: "danger" | "warning" | "info";
  icon: typeof AlertCircle;
  message: string;
  action: string;
  section: string;
  contactId?: string;
}

function useDashboardAlerts() {
  const { data: contacts } = useContacts();

  const { data: incompleteAlerts } = useQuery({
    queryKey: ["dashboard-alerts-incomplete"],
    queryFn: async () => {
      if (!contacts) return [];
      const activeContacts = contacts.filter(
        (c) => c.statut === "En attente de validation" || c.statut === "En formation théorique" || c.statut === "En formation pratique"
      );
      const { data: docs } = await supabase.from("contact_documents").select("contact_id, type_document").in("contact_id", activeContacts.map((c) => c.id));
      const docsMap = new Map<string, number>();
      (docs || []).forEach((d) => { docsMap.set(d.contact_id, (docsMap.get(d.contact_id) || 0) + 1); });

      return activeContacts
        .filter((c) => (docsMap.get(c.id) || 0) < 5 && differenceInDays(new Date(), parseISO(c.created_at)) > 5)
        .slice(0, 3)
        .map((c) => ({
          id: `incomplete-${c.id}`, type: "danger" as const, icon: FileWarning,
          message: `${c.prenom} ${c.nom} — ${5 - (docsMap.get(c.id) || 0)} documents manquants`,
          action: "Voir le dossier", section: "contacts", contactId: c.id,
        }));
    },
    enabled: !!contacts && contacts.length > 0,
  });

  const { data: paymentAlerts } = useQuery({
    queryKey: ["dashboard-alerts-payments"],
    queryFn: async () => {
      const { data: factures } = await supabase
        .from("factures").select("id, montant_total, contact_id, date_emission, contacts(prenom, nom)")
        .in("statut", ["emise", "partiel"]).order("date_emission", { ascending: true }).limit(3);
      return (factures || [])
        .filter((f) => differenceInDays(new Date(), parseISO(f.date_emission)) > 7)
        .map((f: any) => ({
          id: `payment-${f.id}`, type: "warning" as const, icon: CreditCard,
          message: `${f.contacts?.prenom} ${f.contacts?.nom} — ${Number(f.montant_total).toLocaleString("fr-FR")}€ en attente`,
          action: "Voir paiement", section: "facturation", contactId: f.contact_id,
        }));
    },
  });

  const { data: examAlerts } = useQuery({
    queryKey: ["dashboard-alerts-exams"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const inSevenDays = format(addDays(new Date(), 7), "yyyy-MM-dd");
      const { data } = await supabase.from("examens_t3p")
        .select("id, date_examen, type_formation, contacts(prenom, nom, formation)")
        .gte("date_examen", today).lte("date_examen", inSevenDays).eq("resultat", "en_attente").limit(3);
      return (data || []).map((e: any) => ({
        id: `exam-${e.id}`, type: "info" as const, icon: GraduationCap,
        message: `${e.contacts?.prenom} ${e.contacts?.nom} — ${e.contacts?.formation || "Examen"} le ${format(parseISO(e.date_examen), "dd/MM", { locale: fr })}`,
        action: "Voir fiche", section: "contacts",
      }));
    },
  });

  const { data: financialAlerts } = useQuery({
    queryKey: ["dashboard-alerts-financial"],
    queryFn: async () => {
      const now = new Date();
      const mStart = format(startOfMonth(now), "yyyy-MM-dd");
      const mEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const alerts: DashboardAlert[] = [];

      const [versRes, chargesRes, paramsRes, recurringRes] = await Promise.all([
        supabase.from("versements").select("montant").gte("date_encaissement", mStart).lte("date_encaissement", mEnd),
        supabase.from("charges").select("montant, type_charge").gte("date_charge", mStart).lte("date_charge", mEnd).eq("statut", "active" as any),
        supabase.from("parametres_financiers").select("*").limit(1).maybeSingle(),
        supabase.from("charges").select("libelle, montant, periodicite").eq("statut", "active" as any).in("periodicite", ["mensuelle", "trimestrielle", "annuelle"] as any),
      ]);

      const ca = (versRes.data || []).reduce((s, v) => s + Number(v.montant), 0);
      const totalCharges = (chargesRes.data || []).reduce((s, c) => s + Number(c.montant), 0);
      const chargesFixes = (chargesRes.data || []).filter(c => c.type_charge === "fixe").reduce((s, c) => s + Number(c.montant), 0);
      const resultat = ca - totalCharges;
      const params = paramsRes.data;
      const prixMoyen = params ? (Number(params.prix_moyen_taxi) + Number(params.prix_moyen_vtc) + Number(params.prix_moyen_vmdtr)) / 3 : 990;

      if (resultat < 0) {
        const manquantes = Math.ceil(Math.abs(resultat) / prixMoyen);
        alerts.push({
          id: "financial-deficit", type: "danger", icon: Landmark,
          message: `Déficit de ${formatEuro(Math.abs(resultat))} ce mois — ${manquantes} formation${manquantes > 1 ? "s" : ""} manquante${manquantes > 1 ? "s" : ""} pour équilibrer`,
          action: "Voir Cockpit", section: "cockpit-financier",
        });
      }

      if (getDate(now) > 15 && prixMoyen > 0) {
        const seuil = Math.ceil(chargesFixes / prixMoyen);
        const vendues = (versRes.data || []).length;
        if (seuil > 0 && vendues < seuil * 0.6) {
          const restantes = seuil - vendues;
          alerts.push({
            id: "financial-seuil-risque", type: "warning", icon: Landmark,
            message: `Seuil de rentabilité à risque — ${restantes} formation${restantes > 1 ? "s" : ""} encore nécessaire${restantes > 1 ? "s" : ""}`,
            action: "Voir pipeline", section: "cockpit-financier",
          });
        }
      }

      const { data: currentChargesWithLabels } = await supabase.from("charges").select("libelle").gte("date_charge", mStart).lte("date_charge", mEnd);
      const saisisLabels = new Set((currentChargesWithLabels || []).map(c => c.libelle.toLowerCase()));
      (recurringRes.data || []).forEach((rc: any) => {
        if (!saisisLabels.has(rc.libelle.toLowerCase())) {
          alerts.push({
            id: `financial-recurring-${rc.libelle}`, type: "warning", icon: Landmark,
            message: `${rc.libelle} non enregistrée ce mois`, action: "Saisir", section: "cockpit-financier",
          });
        }
      });

      return alerts;
    },
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const all: DashboardAlert[] = [
      ...(incompleteAlerts || []), ...(paymentAlerts || []),
      ...(examAlerts || []), ...(financialAlerts || []),
    ];
    return all.sort((a, b) => {
      const order = { danger: 0, warning: 1, info: 2 };
      return order[a.type] - order[b.type];
    }).slice(0, 8);
  }, [incompleteAlerts, paymentAlerts, examAlerts, financialAlerts]);
}

// ─── ACTIVITY TIMELINE HOOK ──────────────────────────────

function useRecentActivity() {
  return useQuery({
    queryKey: ["dashboard-recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("id, type, titre, contenu, date_echange, contact_id, contacts(prenom, nom)")
        .order("date_echange", { ascending: false }).limit(8);
      if (error) throw error;
      return (data || []).map((h: any) => ({
        id: h.id,
        initials: `${(h.contacts?.prenom || "?").charAt(0)}${(h.contacts?.nom || "?").charAt(0)}`.toUpperCase(),
        name: `${h.contacts?.prenom || ""} ${h.contacts?.nom || ""}`,
        action: h.titre, type: h.type, date: h.date_echange,
      }));
    },
  });
}

// ─── COMPACT METRIC ──────────────────────────────────────

const CompactMetric = React.forwardRef<HTMLDivElement, {
  label: string; value: string | number; icon: React.ElementType; color: string; bgColor: string; delta?: string | number; isWarning?: boolean;
}>(function CompactMetric({
  label, value, icon: Icon, color, bgColor, delta, isWarning,
}, ref) {
  return (
    <div ref={ref} className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-card to-card/80 border border-border transition-all duration-150 hover:shadow-soft hover:scale-[1.01] ${isWarning ? "ring-1 ring-warning/30" : ""}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor} shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-foreground font-mono tabular-nums tracking-tight">{value}</p>
          {delta !== undefined && (
            <span className={`flex items-center gap-0.5 text-[11px] font-medium ${Number(delta) >= 0 ? "text-success" : "text-destructive"}`}>
              {Number(delta) >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Number(delta) >= 0 ? "+" : ""}{delta}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── ALERT ROW ───────────────────────────────────────────

const AlertRow = React.forwardRef<HTMLDivElement, { alert: DashboardAlert; onAction: () => void }>(function AlertRow({ alert, onAction }, ref) {
  const colorMap = {
    danger: { dot: "bg-destructive", text: "text-destructive" },
    warning: { dot: "bg-warning", text: "text-warning" },
    info: { dot: "bg-info", text: "text-info" },
  };
  const c = colorMap[alert.type];

  return (
    <div
      ref={ref}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={onAction}
    >
      <div className={`h-2 w-2 rounded-full ${c.dot} shrink-0`} />
      <p className="flex-1 text-sm text-foreground truncate">{alert.message}</p>
      <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-1">
        {alert.action}
        <ChevronRight className="h-3 w-3" />
      </span>
    </div>
  );
});

// ─── MAIN DASHBOARD ──────────────────────────────────────

export function Dashboard({ onNavigate, onNavigateWithContact }: DashboardProps) {
  useNoShowDetection();
  const { metrics, isLoading } = useDashboardMetrics();
  const alerts = useDashboardAlerts();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();

  const handleNavigate = (section: string, contactId?: string) => {
    if (contactId && onNavigateWithContact) {
      onNavigateWithContact(section, contactId);
    } else if (onNavigate) {
      onNavigate(section);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" subtitle={format(new Date(), "EEEE d MMMM yyyy", { locale: fr })} />

      <main className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
        {/* KPI Grid — Compact 2x3 on desktop */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {metrics.map((m) => (
                <CompactMetric key={m.label} {...m} />
              ))}
            </div>
          )}
        </section>

        {/* Two-column layout: Alerts + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Alerts — wider */}
          <section className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">À traiter</h2>
              {alerts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {alerts.length} action{alerts.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <Card className="p-0 overflow-hidden">
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 p-5 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Tout est à jour</p>
                    <p className="text-xs text-muted-foreground">Aucune action requise pour le moment</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="max-h-[380px]">
                  <div className="divide-y divide-border">
                    {alerts.map((alert) => (
                      <AlertRow
                        key={alert.id}
                        alert={alert}
                        onAction={() => handleNavigate(alert.section, alert.contactId)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </section>

          {/* Activity — narrower */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Activité récente</h2>
            </div>
            <Card className="p-0 overflow-hidden">
              {activityLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : (activity?.length || 0) === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Aucune activité récente
                </div>
              ) : (
                <ScrollArea className="max-h-[380px]">
                  <div className="divide-y divide-border">
                    {activity?.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                            {item.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-foreground truncate">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground"> — {item.action}</span>
                          </p>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(parseISO(item.date), { addSuffix: false, locale: fr })}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
