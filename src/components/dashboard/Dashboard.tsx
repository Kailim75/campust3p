import React, { useMemo, useState } from "react";
import { useNoShowDetection } from "@/hooks/useNoShowDetection";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Percent,
  Phone,
  BarChart3,
  AlertTriangle,
  CreditCard,
  FileWarning,
  UserX,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Target,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, differenceInDays, addDays, parseISO, endOfMonth, getDate, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { formatEuro, formatEuroShort } from "@/lib/formatFinancial";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface DashboardProps {
  onNavigate?: (section: string) => void;
  onNavigateWithContact?: (section: string, contactId?: string) => void;
}

// ─── STRATEGIC KPI HOOK ──────────────────────────────────

function useStrategicKPIs() {
  const now = new Date();
  const mStart = format(startOfMonth(now), "yyyy-MM-dd");
  const mEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const prevMStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const prevMEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(now, 7), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["dashboard-strategic-kpis", mStart],
    queryFn: async () => {
      const [
        versCurrentRes, versPrevRes,
        chargesRes, paramsRes,
        sessionsRes, inscriptionsRes,
        leadsRes, contactsRes,
      ] = await Promise.all([
        // CA current month (versements réels)
        supabase.from("versements").select("montant").gte("date_encaissement", mStart).lte("date_encaissement", mEnd),
        // CA previous month
        supabase.from("versements").select("montant").gte("date_encaissement", prevMStart).lte("date_encaissement", prevMEnd),
        // Charges du mois
        supabase.from("charges").select("montant, type_charge").gte("date_charge", mStart).lte("date_charge", mEnd).eq("statut", "active" as any),
        // Params financiers
        supabase.from("parametres_financiers").select("*").limit(1).maybeSingle(),
        // Sessions ouvertes (pour remplissage)
        supabase.from("sessions").select("id, places_totales, statut, date_debut").in("statut", ["a_venir", "en_cours"]).eq("archived", false),
        // Inscriptions pour sessions ouvertes
        supabase.from("session_inscriptions").select("session_id"),
        // Leads 7 jours (historique contacts)
        supabase.from("contact_historique").select("id, type, contact_id").gte("date_echange", sevenDaysAgo).in("type", ["appel", "whatsapp", "email"]),
        // Contacts récents (pour conversion leads)
        supabase.from("contacts").select("id, statut, created_at").gte("created_at", sevenDaysAgo),
      ]);

      // 1. CA du mois
      const caCurrent = (versCurrentRes.data || []).reduce((s, v) => s + Number(v.montant), 0);
      const caPrev = (versPrevRes.data || []).reduce((s, v) => s + Number(v.montant), 0);
      const caVariation = caPrev > 0 ? Math.round(((caCurrent - caPrev) / caPrev) * 100) : caCurrent > 0 ? 100 : 0;

      // Objectif CA (charges fixes * 1.3 comme objectif minimal)
      const totalCharges = (chargesRes.data || []).reduce((s, c) => s + Number(c.montant), 0);
      const chargesFixes = (chargesRes.data || []).filter(c => c.type_charge === "fixe").reduce((s, c) => s + Number(c.montant), 0);
      const objectifCA = chargesFixes > 0 ? chargesFixes * 1.5 : 10000; // fallback
      const pctObjectif = objectifCA > 0 ? Math.round((caCurrent / objectifCA) * 100) : 0;
      const dayOfMonth = getDate(now);
      const daysInMonth = parseInt(format(endOfMonth(now), "d"));
      const isRythmInsuffisant = dayOfMonth > 15 && pctObjectif < 60;

      // 2. Marge estimée
      const marge = caCurrent - totalCharges;
      const margePercent = caCurrent > 0 ? Math.round((marge / caCurrent) * 100) : 0;

      // 3. Taux de remplissage global (sessions ouvertes seulement)
      const sessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];
      const inscriptionsBySession = new Map<string, number>();
      inscriptions.forEach((i: any) => {
        inscriptionsBySession.set(i.session_id, (inscriptionsBySession.get(i.session_id) || 0) + 1);
      });
      
      let totalPlaces = 0;
      let totalInscrits = 0;
      sessions.filter(s => s.statut === "a_venir" || s.statut === "en_cours").forEach((s: any) => {
        const inscrits = inscriptionsBySession.get(s.id) || 0;
        totalPlaces += s.places_totales;
        totalInscrits += inscrits;
      });
      const tauxRemplissage = totalPlaces > 0 ? Math.round((totalInscrits / totalPlaces) * 100) : 0;

      // 4. Leads 7 jours
      const leads = leadsRes.data || [];
      const uniqueLeadContacts = new Set(leads.map((l: any) => l.contact_id));
      const leadsCount = uniqueLeadContacts.size;
      
      const recentContacts = contactsRes.data || [];
      const convertis = recentContacts.filter((c: any) => 
        c.statut && !["Prospect", "nouveau"].includes(c.statut)
      ).length;
      const tauxConversion = leadsCount > 0 ? Math.round((convertis / leadsCount) * 100) : 0;

      // 5. CA Prévisionnel (basé sur inscriptions confirmées non encore facturées)
      const params = paramsRes.data;
      const prixMoyen = params ? (Number(params.prix_moyen_taxi || 990) + Number(params.prix_moyen_vtc || 990) + Number(params.prix_moyen_vmdtr || 990)) / 3 : 990;
      const sessionsAVenir = sessions.filter(s => parseISO(s.date_debut) > now);
      let caPrevi = 0;
      sessionsAVenir.forEach((s: any) => {
        const inscrits = inscriptionsBySession.get(s.id) || 0;
        caPrevi += inscrits * prixMoyen;
      });

      return {
        ca: { value: caCurrent, variation: caVariation, pctObjectif, isRythmInsuffisant },
        marge: { value: marge, percent: margePercent },
        remplissage: { value: tauxRemplissage, totalPlaces, totalInscrits },
        leads: { count: leadsCount, tauxConversion, isProblemeClosing: leadsCount > 5 && tauxConversion < 10 },
        caPrevi: { value: caPrevi },
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── CRITICAL SESSIONS HOOK ──────────────────────────────

function useCriticalSessions() {
  const now = new Date();
  const in21Days = format(addDays(now, 21), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["dashboard-critical-sessions"],
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, nom, date_debut, date_fin, places_totales, statut, formation_type")
        .in("statut", ["a_venir", "en_cours"])
        .eq("archived", false)
        .lte("date_debut", in21Days)
        .order("date_debut", { ascending: true });

      if (!sessions?.length) return [];

      const { data: inscriptions } = await supabase
        .from("session_inscriptions")
        .select("session_id")
        .in("session_id", sessions.map(s => s.id));

      const countMap = new Map<string, number>();
      (inscriptions || []).forEach((i: any) => {
        countMap.set(i.session_id, (countMap.get(i.session_id) || 0) + 1);
      });

      return sessions.map(s => {
        const inscrits = countMap.get(s.id) || 0;
        const taux = s.places_totales > 0 ? Math.round((inscrits / s.places_totales) * 100) : 0;
        const joursAvant = differenceInDays(parseISO(s.date_debut), now);
        const isCritical = taux < 50 && joursAvant < 14;
        return { ...s, inscrits, taux, joursAvant, isCritical };
      }).sort((a, b) => {
        if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
        if (a.joursAvant !== b.joursAvant) return a.joursAvant - b.joursAvant;
        return a.taux - b.taux;
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── PRIORITY ALERTS HOOK ────────────────────────────────

interface PriorityAlert {
  id: string;
  type: "danger" | "warning";
  icon: React.ElementType;
  message: string;
  section: string;
  contactId?: string;
}

function usePriorityAlerts() {
  return useQuery({
    queryKey: ["dashboard-priority-alerts"],
    queryFn: async () => {
      const alerts: PriorityAlert[] = [];

      // Paiements en retard
      const { data: factures } = await supabase
        .from("factures")
        .select("id, montant_total, contact_id, date_emission, contacts(prenom, nom)")
        .in("statut", ["emise", "partiel"])
        .order("date_emission", { ascending: true })
        .limit(4);

      (factures || []).filter((f: any) => differenceInDays(new Date(), parseISO(f.date_emission)) > 7).forEach((f: any) => {
        alerts.push({
          id: `pay-${f.id}`, type: "danger", icon: CreditCard,
          message: `${f.contacts?.prenom} ${f.contacts?.nom} — ${formatEuro(Number(f.montant_total))} en retard`,
          section: "facturation", contactId: f.contact_id,
        });
      });

      // Dossiers incomplets bloquants
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, prenom, nom, statut, created_at")
        .in("statut", ["En attente de validation", "En formation théorique", "En formation pratique"])
        .eq("archived", false);

      if (contacts?.length) {
        const { data: docs } = await supabase
          .from("contact_documents")
          .select("contact_id, type_document")
          .in("contact_id", contacts.map(c => c.id));

        const docsMap = new Map<string, number>();
        (docs || []).forEach((d: any) => { docsMap.set(d.contact_id, (docsMap.get(d.contact_id) || 0) + 1); });

        contacts
          .filter(c => (docsMap.get(c.id) || 0) < 4 && differenceInDays(new Date(), parseISO(c.created_at)) > 5)
          .slice(0, 3)
          .forEach(c => {
            alerts.push({
              id: `doc-${c.id}`, type: "warning", icon: FileWarning,
              message: `${c.prenom} ${c.nom} — dossier incomplet bloquant`,
              section: "contacts", contactId: c.id,
            });
          });
      }

      // Élèves inactifs > 7 jours
      const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const { data: activeContacts } = await supabase
        .from("contacts")
        .select("id, prenom, nom, updated_at")
        .in("statut", ["En formation théorique", "En formation pratique"])
        .eq("archived", false)
        .lt("updated_at", sevenDaysAgo)
        .limit(3);

      (activeContacts || []).forEach(c => {
        const jours = differenceInDays(new Date(), parseISO(c.updated_at));
        alerts.push({
          id: `inactive-${c.id}`, type: "warning", icon: UserX,
          message: `${c.prenom} ${c.nom} — inactif depuis ${jours}j`,
          section: "contacts", contactId: c.id,
        });
      });

      return alerts.sort((a, b) => {
        const order = { danger: 0, warning: 1 };
        return order[a.type] - order[b.type];
      }).slice(0, 8);
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── CA HISTORY HOOK ─────────────────────────────────────

function useCAHistory() {
  return useQuery({
    queryKey: ["dashboard-ca-history-6m"],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({
          label: format(d, "MMM yy", { locale: fr }),
          start: format(startOfMonth(d), "yyyy-MM-dd"),
          end: format(endOfMonth(d), "yyyy-MM-dd"),
        });
      }

      const results = await Promise.all(
        months.map(async (m) => {
          const { data } = await supabase
            .from("versements")
            .select("montant")
            .gte("date_encaissement", m.start)
            .lte("date_encaissement", m.end);
          const total = (data || []).reduce((s, v) => s + Number(v.montant), 0);
          return { name: m.label, ca: total };
        })
      );

      return results;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── MAIN DASHBOARD ──────────────────────────────────────

export function Dashboard({ onNavigate }: DashboardProps) {
  useNoShowDetection();
  const { data: kpis, isLoading: kpisLoading } = useStrategicKPIs();
  const { data: criticalSessions, isLoading: sessionsLoading } = useCriticalSessions();
  const { data: alerts, isLoading: alertsLoading } = usePriorityAlerts();
  const { data: caHistory, isLoading: historyLoading } = useCAHistory();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleAlertClick = (alert: PriorityAlert) => {
    if (alert.contactId) {
      setSelectedContactId(alert.contactId);
      setDetailOpen(true);
    } else if (onNavigate) {
      onNavigate(alert.section);
    }
  };

  const isLoading = kpisLoading;

  return (
    <div className="min-h-screen">
      {/* Minimal header */}
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Pilotage</h1>
        <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}</p>
      </div>

      <main className="px-6 pb-6 space-y-5 max-w-[1400px]">
        {/* ─── ZONE 1: KPI STRATÉGIQUES ─── */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* CA du mois */}
            <KPICard
              label="CA du mois"
              value={formatEuro(kpis.ca.value)}
              icon={Euro}
              delta={kpis.ca.variation}
              sub={`${kpis.ca.pctObjectif}% objectif`}
              badge={kpis.ca.isRythmInsuffisant ? { label: "Rythme insuffisant", variant: "warning" } : undefined}
            />
            {/* Marge estimée */}
            <KPICard
              label="Marge estimée"
              value={formatEuro(kpis.marge.value)}
              icon={kpis.marge.value >= 0 ? TrendingUp : TrendingDown}
              sub={`${kpis.marge.percent}% du CA`}
              badge={
                kpis.marge.percent < 15 ? { label: "Critique", variant: "danger" }
                : kpis.marge.percent < 30 ? { label: "Attention", variant: "warning" }
                : undefined
              }
              negative={kpis.marge.value < 0}
            />
            {/* Taux remplissage */}
            <KPICard
              label="Remplissage"
              value={`${kpis.remplissage.value}%`}
              icon={Percent}
              sub={`${kpis.remplissage.totalInscrits}/${kpis.remplissage.totalPlaces} places`}
              badge={kpis.remplissage.value < 60 ? { label: "Acquisition ↑", variant: "warning" } : undefined}
            />
            {/* Leads 7j */}
            <KPICard
              label="Leads 7 jours"
              value={kpis.leads.count}
              icon={Phone}
              sub={`${kpis.leads.tauxConversion}% conversion`}
              badge={kpis.leads.isProblemeClosing ? { label: "Problème closing", variant: "danger" } : undefined}
            />
            {/* CA Prévisionnel */}
            <KPICard
              label="CA prévisionnel"
              value={formatEuro(kpis.caPrevi.value)}
              icon={Target}
              sub="sessions à venir"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ─── LEFT COLUMN: Sessions + Alerts ─── */}
          <div className="lg:col-span-2 space-y-5">
            {/* ─── ZONE 2: SESSIONS CRITIQUES ─── */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold text-foreground">Sessions critiques</h2>
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => onNavigate?.("sessions")}>
                  Toutes <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              {sessionsLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : !criticalSessions?.length ? (
                <div className="px-4 pb-4 text-sm text-muted-foreground">Aucune session à risque</div>
              ) : (
                <div className="divide-y divide-border">
                  {criticalSessions.slice(0, 6).map(s => (
                    <div
                      key={s.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors",
                        s.isCritical && "bg-destructive/5 border-l-2 border-l-destructive"
                      )}
                      onClick={() => onNavigate?.("sessions")}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{s.nom}</p>
                          {s.isCritical && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                              Action immédiate
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(s.date_debut), "dd MMM", { locale: fr })} · {s.formation_type}
                        </p>
                      </div>
                      {/* Fill bar */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              s.taux >= 80 ? "bg-success" : s.taux >= 50 ? "bg-warning" : "bg-destructive"
                            )}
                            style={{ width: `${Math.min(s.taux, 100)}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-mono font-medium tabular-nums w-10 text-right",
                          s.taux >= 80 ? "text-success" : s.taux >= 50 ? "text-warning" : "text-destructive"
                        )}>
                          {s.inscrits}/{s.places_totales}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
                        {s.joursAvant <= 0 ? "Auj." : `${s.joursAvant}j`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ─── ZONE 3: ALERTES PRIORITAIRES ─── */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Alertes prioritaires
                  {(alerts?.length || 0) > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">{alerts?.length}</Badge>
                  )}
                </h2>
                {(alerts?.length || 0) > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => onNavigate?.("alertes")}>
                    Voir tout <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {alertsLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
                </div>
              ) : !alerts?.length ? (
                <div className="px-4 pb-4 text-sm text-muted-foreground">Aucune alerte — tout est en ordre ✓</div>
              ) : (
                <div className="divide-y divide-border">
                  {alerts.map(alert => {
                    const Icon = alert.icon;
                    return (
                      <div
                        key={alert.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors group"
                        onClick={() => handleAlertClick(alert)}
                      >
                        <div className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          alert.type === "danger" ? "bg-destructive" : "bg-warning"
                        )} />
                        <p className="flex-1 text-sm text-foreground truncate">{alert.message}</p>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* ─── RIGHT COLUMN: CA Chart ─── */}
          <div className="space-y-5">
            {/* ─── ZONE 4: HISTORIQUE CA ─── */}
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-foreground mb-4">CA mensuel — 6 mois</h2>
              {historyLoading ? (
                <Skeleton className="h-[200px] rounded-lg" />
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={caHistory || []} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatEuroShort(v)}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        width={55}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatEuro(value), "CA"]}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="ca" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

// ─── KPI CARD ────────────────────────────────────────────

function KPICard({
  label, value, icon: Icon, delta, sub, badge, negative,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  delta?: number;
  sub?: string;
  badge?: { label: string; variant: "warning" | "danger" };
  negative?: boolean;
}) {
  return (
    <Card className={cn(
      "p-4 flex flex-col gap-1.5 relative overflow-hidden",
      badge?.variant === "danger" && "ring-1 ring-destructive/30",
      badge?.variant === "warning" && "ring-1 ring-warning/30",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={cn("h-4 w-4", negative ? "text-destructive" : "text-primary")} />
      </div>
      <p className={cn(
        "text-lg font-bold font-mono tabular-nums tracking-tight leading-none",
        negative ? "text-destructive" : "text-foreground"
      )}>
        {value}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {delta !== undefined && (
          <span className={cn(
            "flex items-center gap-0.5 text-[10px] font-medium",
            delta >= 0 ? "text-success" : "text-destructive"
          )}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta >= 0 ? "+" : ""}{delta}%
          </span>
        )}
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
      {badge && (
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1.5 py-0 h-4 mt-0.5 w-fit",
            badge.variant === "danger" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20"
          )}
        >
          {badge.label}
        </Badge>
      )}
    </Card>
  );
}
