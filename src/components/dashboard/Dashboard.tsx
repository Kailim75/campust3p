import { useMemo } from "react";
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

  // Paiements du mois
  const { data: paiements, isLoading: paiementsLoading } = useQuery({
    queryKey: ["dashboard-paiements-month"],
    queryFn: async () => {
      const thisMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const lastMonth = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
      const lastMonthEnd = format(startOfMonth(new Date()), "yyyy-MM-dd");

      const [current, previous] = await Promise.all([
        supabase
          .from("paiements")
          .select("montant")
          .gte("date_paiement", thisMonth),
        supabase
          .from("paiements")
          .select("montant")
          .gte("date_paiement", lastMonth)
          .lt("date_paiement", lastMonthEnd),
      ]);

      const caCurrent = (current.data || []).reduce((s, p) => s + Number(p.montant), 0);
      const caPrevious = (previous.data || []).reduce((s, p) => s + Number(p.montant), 0);
      return { caCurrent, caPrevious };
    },
  });

  // Examens
  const { data: examens, isLoading: examensLoading } = useQuery({
    queryKey: ["dashboard-examens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examens_t3p")
        .select("resultat");
      if (error) throw error;
      const total = (data || []).filter((e) => e.resultat !== "en_attente").length;
      const admis = (data || []).filter((e) => e.resultat === "admis").length;
      return { total, admis, taux: total > 0 ? Math.round((admis / total) * 100) : 0 };
    },
  });

  // Sessions cette semaine
  const { data: sessionsWeek, isLoading: sessionsLoading } = useQuery({
    queryKey: ["dashboard-sessions-week"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const inSevenDays = format(addDays(new Date(), 7), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("sessions")
        .select("id")
        .gte("date_debut", today)
        .lte("date_debut", inSevenDays);
      if (error) throw error;
      return data?.length || 0;
    },
  });

  // Documents incomplets
  const { data: docsIncomplets, isLoading: docsLoading } = useQuery({
    queryKey: ["dashboard-docs-incomplets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_documents")
        .select("contact_id, type_document")
        .in("type_document", ["cni", "casier_b3", "certificat_medical", "photo", "permis_b"]);
      if (error) throw error;

      // Count contacts with at least 1 missing required doc
      // This is approximate - we count contacts who have fewer than 5 required docs uploaded
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

      const incomplete = activeContacts.filter((c) => {
        const docs = contactDocsCount.get(c.id) || 0;
        return docs < 5;
      });

      return incomplete.length;
    },
    enabled: !!contacts,
  });

  const metrics = useMemo(() => {
    if (!contacts) return [];

    const activeStatuts = ["En formation théorique", "En formation pratique", "Examen T3P programmé", "Examen pratique programmé"];
    const inscritStatuts = [...activeStatuts, "En attente de validation"];
    const conversionStatuts = [...inscritStatuts];

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
      {
        label: "Apprenants actifs",
        value: actifs,
        icon: Users,
        color: "text-primary",
        bgColor: "bg-primary/10",
        delta: undefined,
      },
      {
        label: "CA du mois",
        value: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(paiements?.caCurrent || 0),
        icon: Euro,
        color: "text-accent",
        bgColor: "bg-accent/10",
        delta: caChange,
      },
      {
        label: "Taux de conversion",
        value: `${tauxConversion}%`,
        icon: TrendingUp,
        color: "text-success",
        bgColor: "bg-success/10",
        delta: undefined,
      },
      {
        label: "Réussite examens",
        value: `${examens?.taux || 0}%`,
        icon: Award,
        color: "text-info",
        bgColor: "bg-info/10",
        delta: undefined,
      },
      {
        label: "Dossiers incomplets",
        value: docsIncomplets || 0,
        icon: FileWarning,
        color: (docsIncomplets || 0) > 0 ? "text-accent" : "text-success",
        bgColor: (docsIncomplets || 0) > 0 ? "bg-accent/10" : "bg-success/10",
        delta: undefined,
        isWarning: (docsIncomplets || 0) > 0,
      },
      {
        label: "Sessions cette semaine",
        value: sessionsWeek || 0,
        icon: Calendar,
        color: "text-primary",
        bgColor: "bg-primary/10",
        delta: undefined,
      },
    ];
  }, [contacts, paiements, examens, docsIncomplets, sessionsWeek]);

  return {
    metrics,
    isLoading: contactsLoading || paiementsLoading || examensLoading || sessionsLoading || docsLoading,
  };
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

  // Dossiers incomplets > 5 jours
  const { data: incompleteAlerts } = useQuery({
    queryKey: ["dashboard-alerts-incomplete"],
    queryFn: async () => {
      if (!contacts) return [];
      const fiveDaysAgo = subMonths(new Date(), 0); // placeholder - filter by created_at
      
      // Get documents for active contacts
      const activeContacts = contacts.filter(
        (c) =>
          c.statut === "En attente de validation" ||
          c.statut === "En formation théorique" ||
          c.statut === "En formation pratique"
      );

      const { data: docs } = await supabase
        .from("contact_documents")
        .select("contact_id, type_document")
        .in("contact_id", activeContacts.map((c) => c.id));

      const docsMap = new Map<string, number>();
      (docs || []).forEach((d) => {
        docsMap.set(d.contact_id, (docsMap.get(d.contact_id) || 0) + 1);
      });

      return activeContacts
        .filter((c) => {
          const numDocs = docsMap.get(c.id) || 0;
          const daysSinceCreation = differenceInDays(new Date(), parseISO(c.created_at));
          return numDocs < 5 && daysSinceCreation > 5;
        })
        .slice(0, 3)
        .map((c) => ({
          id: `incomplete-${c.id}`,
          type: "danger" as const,
          icon: FileWarning,
          message: `${c.prenom} ${c.nom} — ${5 - (docsMap.get(c.id) || 0)} documents manquants`,
          action: "Voir le dossier",
          section: "contacts",
          contactId: c.id,
        }));
    },
    enabled: !!contacts && contacts.length > 0,
  });

  // Paiements en attente > 7 jours
  const { data: paymentAlerts } = useQuery({
    queryKey: ["dashboard-alerts-payments"],
    queryFn: async () => {
      const { data: factures } = await supabase
        .from("factures")
        .select("id, montant_total, contact_id, date_emission, contacts(prenom, nom)")
        .in("statut", ["emise", "partiel"])
        .order("date_emission", { ascending: true })
        .limit(3);

      return (factures || [])
        .filter((f) => differenceInDays(new Date(), parseISO(f.date_emission)) > 7)
        .map((f: any) => ({
          id: `payment-${f.id}`,
          type: "warning" as const,
          icon: CreditCard,
          message: `${f.contacts?.prenom} ${f.contacts?.nom} — ${Number(f.montant_total).toLocaleString("fr-FR")}€ en attente`,
          action: "Voir paiement",
          section: "facturation",
          contactId: f.contact_id,
        }));
    },
  });

  // Examens dans ≤ 7 jours
  const { data: examAlerts } = useQuery({
    queryKey: ["dashboard-alerts-exams"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const inSevenDays = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const { data } = await supabase
        .from("examens_t3p")
        .select("id, date_examen, type_examen, contacts(prenom, nom, formation)")
        .gte("date_examen", today)
        .lte("date_examen", inSevenDays)
        .eq("resultat", "en_attente")
        .limit(3);

      return (data || []).map((e: any) => ({
        id: `exam-${e.id}`,
        type: "info" as const,
        icon: GraduationCap,
        message: `${e.contacts?.prenom} ${e.contacts?.nom} — ${e.contacts?.formation || "Examen"} le ${format(parseISO(e.date_examen), "dd/MM", { locale: fr })}`,
        action: "Voir fiche",
        section: "contacts",
      }));
    },
  });

  // ── Alertes financières ──
  const { data: financialAlerts } = useQuery({
    queryKey: ["dashboard-alerts-financial"],
    queryFn: async () => {
      const now = new Date();
      const mStart = format(startOfMonth(now), "yyyy-MM-dd");
      const mEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const alerts: DashboardAlert[] = [];

      // Get CA & charges for current month
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
      const prixMoyen = params
        ? (Number(params.prix_moyen_taxi) + Number(params.prix_moyen_vtc) + Number(params.prix_moyen_vmdtr)) / 3
        : 990;

      // 🔴 Déficit
      if (resultat < 0) {
        const manquantes = Math.ceil(Math.abs(resultat) / prixMoyen);
        alerts.push({
          id: "financial-deficit",
          type: "danger",
          icon: Landmark,
          message: `Déficit de ${formatEuro(Math.abs(resultat))} ce mois — ${manquantes} formation${manquantes > 1 ? "s" : ""} manquante${manquantes > 1 ? "s" : ""} pour équilibrer`,
          action: "Voir Cockpit",
          section: "cockpit-financier",
        });
      }

      // 🟠 Seuil de rentabilité à risque (après le 15)
      if (getDate(now) > 15 && prixMoyen > 0) {
        const seuil = Math.ceil(chargesFixes / prixMoyen);
        const vendues = (versRes.data || []).length;
        if (seuil > 0 && vendues < seuil * 0.6) {
          const restantes = seuil - vendues;
          alerts.push({
            id: "financial-seuil-risque",
            type: "warning",
            icon: Landmark,
            message: `Seuil de rentabilité à risque — ${restantes} formation${restantes > 1 ? "s" : ""} encore nécessaire${restantes > 1 ? "s" : ""}`,
            action: "Voir pipeline",
            section: "cockpit-financier",
          });
        }
      }

      // 🟡 Charges récurrentes non saisies ce mois
      const currentChargesLabels = (chargesRes.data || []).map(() => ""); // We need libelles
      const { data: currentChargesWithLabels } = await supabase
        .from("charges")
        .select("libelle")
        .gte("date_charge", mStart)
        .lte("date_charge", mEnd);
      const saisisLabels = new Set((currentChargesWithLabels || []).map(c => c.libelle.toLowerCase()));

      (recurringRes.data || []).forEach((rc: any) => {
        if (!saisisLabels.has(rc.libelle.toLowerCase())) {
          alerts.push({
            id: `financial-recurring-${rc.libelle}`,
            type: "warning",
            icon: Landmark,
            message: `${rc.libelle} non enregistrée ce mois`,
            action: "Saisir",
            section: "cockpit-financier",
          });
        }
      });

      return alerts;
    },
    staleTime: 5 * 60 * 1000,
  });

  const alerts = useMemo(() => {
    const all: DashboardAlert[] = [
      ...(incompleteAlerts || []),
      ...(paymentAlerts || []),
      ...(examAlerts || []),
      ...(financialAlerts || []),
    ];
    // Sort: danger first, then warning, then info
    return all.sort((a, b) => {
      const order = { danger: 0, warning: 1, info: 2 };
      return order[a.type] - order[b.type];
    }).slice(0, 8);
  }, [incompleteAlerts, paymentAlerts, examAlerts, financialAlerts]);

  return alerts;
}

// ─── ACTIVITY TIMELINE HOOK ──────────────────────────────

function useRecentActivity() {
  return useQuery({
    queryKey: ["dashboard-recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("id, type, titre, contenu, date_echange, contact_id, contacts(prenom, nom)")
        .order("date_echange", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []).map((h: any) => ({
        id: h.id,
        initials: `${(h.contacts?.prenom || "?").charAt(0)}${(h.contacts?.nom || "?").charAt(0)}`.toUpperCase(),
        name: `${h.contacts?.prenom || ""} ${h.contacts?.nom || ""}`,
        action: h.titre,
        type: h.type,
        date: h.date_echange,
      }));
    },
  });
}

// ─── COMPONENTS ──────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  delta,
  isWarning,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bgColor: string;
  delta?: number;
  isWarning?: boolean;
}) {
  return (
    <Card className={`p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated ${isWarning ? "ring-1 ring-accent/30" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-display font-bold text-foreground">{value}</p>
          {delta !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${delta >= 0 ? "text-success" : "text-destructive"}`}>
              {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              <span>{delta >= 0 ? "+" : ""}{delta}% vs mois préc.</span>
            </div>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

function AlertTypeIcon({ type }: { type: string }) {
  const colors = {
    danger: "bg-destructive/10 text-destructive",
    warning: "bg-accent/10 text-accent",
    info: "bg-info/10 text-info",
  };
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${colors[type as keyof typeof colors] || colors.info}`}>
      <AlertCircle className="h-4 w-4" />
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconMap: Record<string, { icon: any; color: string }> = {
    appel: { icon: Clock, color: "bg-info/10 text-info" },
    email: { icon: BookOpen, color: "bg-primary/10 text-primary" },
    note: { icon: FileWarning, color: "bg-muted text-muted-foreground" },
    rdv: { icon: Calendar, color: "bg-accent/10 text-accent" },
  };
  const config = iconMap[type] || iconMap.note;
  const Icon = config.icon;
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.color}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

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
      <Header title="Dashboard" subtitle="Vue d'ensemble de votre centre" />

      <main className="p-6 space-y-8 animate-fade-in">
        {/* ZONE 1 — Métriques */}
        <section>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Indicateurs clés</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((m) => (
                <MetricCard key={m.label} {...m} />
              ))}
            </div>
          )}
        </section>

        {/* ZONE 2 + 3 side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ZONE 2 — Alertes du jour */}
          <section className="lg:col-span-3">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Alertes du jour</h2>
            <Card className="p-0 overflow-hidden">
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 p-6 text-success">
                  <CheckCircle2 className="h-6 w-6" />
                  <div>
                    <p className="font-semibold">Tout est à jour !</p>
                    <p className="text-sm text-muted-foreground">Aucune alerte pour le moment.</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="max-h-[420px]">
                  <div className="divide-y divide-border">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors"
                      >
                        <AlertTypeIcon type={alert.type} />
                        <p className="flex-1 text-sm text-foreground">{alert.message}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary hover:text-primary shrink-0"
                          onClick={() => handleNavigate(alert.section, alert.contactId)}
                        >
                          {alert.action}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </section>

          {/* ZONE 3 — Activité récente */}
          <section className="lg:col-span-2">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Activité récente</h2>
            <Card className="p-0 overflow-hidden">
              {activityLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (activity?.length || 0) === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Aucune activité récente
                </div>
              ) : (
                <ScrollArea className="max-h-[420px]">
                  <div className="divide-y divide-border">
                    {activity?.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                            {item.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            <span className="font-medium">{item.name}</span>{" "}
                            <span className="text-muted-foreground">— {item.action}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(parseISO(item.date), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
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
