/**
 * Dashboard — Main orchestrator component.
 * 
 * REFACTORED:
 * - Uses centralized useDashboardData (10 queries instead of ~36)
 * - Removed inline useTodayActionCount (was duplicating queries)
 * - Added DashboardSynthesisBar for direction-level overview
 * - Merged Pilotage + Risk KPIs into DashboardKPIGrid (6 cards)
 * - Added DashboardSessionsPanel + DashboardFinancePanel (2-col grid)
 * - ActionPanelToday promoted to full width
 * - All interactive elements have aria-labels
 * - Focus-visible styles on all buttons
 * 
 * PRESERVED:
 * - DashboardPeriodPicker and useDashboardPeriodV2 (untouched)
 * - useBlockageDiagnostic (shared with Alertes page — untouched)
 * - Navigation signatures (onNavigate, onNavigateWithContact, onNavigateWithParams)
 * - ExpressEnrollmentDialog and ApprenantDetailSheet
 * - Sticky header with mini summary
 */

import React, { useState, useRef, useEffect } from "react";
import { useNoShowDetection } from "@/hooks/useNoShowDetection";
import { GraduationCap, CalendarCheck } from "lucide-react";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ExpressEnrollmentDialog } from "@/components/contacts/ExpressEnrollmentDialog";
import { DashboardPeriodPicker } from "./DashboardPeriodPicker";
import { DashboardSynthesisBar } from "./DashboardSynthesisBar";
import { DashboardKPIGrid } from "./DashboardKPIGrid";
import { ActionPanelToday } from "./ActionPanelToday";
import { DashboardSessionsPanel } from "./DashboardSessionsPanel";
import { DashboardFinancePanel } from "./DashboardFinancePanel";
import { useDashboardPeriodV2 } from "@/hooks/useDashboardPeriodV2";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCurrentUserRole } from "@/hooks/useUsers";
import { useBlockageDiagnostic } from "@/hooks/useBlockageDiagnostic";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEur } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

interface DashboardProps {
  onNavigate?: (section: string) => void;
  onNavigateWithContact?: (section: string, contactId?: string) => void;
  onNavigateWithParams?: (section: string, params: Record<string, string>) => void;
}

export function Dashboard({ onNavigate, onNavigateWithContact, onNavigateWithParams }: DashboardProps) {
  useNoShowDetection();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expressOpen, setExpressOpen] = useState(false);
  const { period } = useDashboardPeriodV2();
  const { data: dashboardData, isLoading } = useDashboardData(period);
  const { data: userRole } = useCurrentUserRole();
  const { data: diagnostic } = useBlockageDiagnostic();

  const metrics = dashboardData?.metrics;
  const todayActionCount = dashboardData?.todayActionCount ?? 0;

  // Sticky mini-summary
  const kpiRef = useRef<HTMLDivElement>(null);
  const [showMiniSummary, setShowMiniSummary] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowMiniSummary(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    if (kpiRef.current) observer.observe(kpiRef.current);
    return () => observer.disconnect();
  }, []);

  const isAdminOrStaff = userRole === "admin" || userRole === "staff" || userRole === "super_admin";

  const handleNavigate = (section: string, params?: Record<string, string>) => {
    if (params && onNavigateWithParams) {
      onNavigateWithParams(section, params);
    } else {
      onNavigate?.(section);
    }
  };

  const handleOpenContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setDetailOpen(true);
  };

  return (
    <div className="min-h-screen">
      {/* ═══ Sticky Header ═══ */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Tableau de bord
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pilotage de votre centre de formation
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DashboardPeriodPicker />
              <button
                onClick={() => onNavigate?.("aujourdhui")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label={`Voir les actions d'aujourd'hui, ${todayActionCount} éléments`}
              >
                <CalendarCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Aujourd'hui</span>
                {todayActionCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                    {todayActionCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setExpressOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sidebar text-sidebar-foreground hover:opacity-90 transition-opacity text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label="Inscription express d'un nouvel apprenant"
              >
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">Inscription Express</span>
              </button>
            </div>
          </div>

          {/* Admin diagnostic chip */}
          {isAdminOrStaff && diagnostic && diagnostic.counts.total > 0 && (
            <button
              onClick={() => onNavigate?.("alertes")}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-xs font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label={`Diagnostic administrateur, ${diagnostic.counts.total} anomalies détectées`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Diagnostic
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {diagnostic.counts.total}
              </Badge>
            </button>
          )}
        </div>

        {/* Mini KPI Summary (appears when KPI rows scroll out) */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 border-t border-border/30",
            showMiniSummary ? "max-h-12 opacity-100" : "max-h-0 opacity-0"
          )}
          role="status"
          aria-label="Résumé des indicateurs clés"
        >
          <div className="px-6 lg:px-8 py-2 flex items-center gap-6 text-xs">
            <span className="text-muted-foreground font-medium">Résumé</span>
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Encaissements</span>
              <span className="font-semibold text-foreground">
                {formatEur(metrics?.encaissements ?? 0)}
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Factures</span>
              <span className="font-semibold text-foreground">
                {metrics?.facturesEnAttente ?? 0}
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Retards</span>
              <span
                className={cn(
                  "font-semibold",
                  (metrics?.paiementsRetard ?? 0) > 0
                    ? "text-destructive"
                    : "text-foreground"
                )}
              >
                {metrics?.paiementsRetard ?? 0}
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Sessions</span>
              <span
                className={cn(
                  "font-semibold",
                  (metrics?.sessionsRisque ?? 0) > 0
                    ? "text-warning"
                    : "text-foreground"
                )}
              >
                {metrics?.sessionsRisque ?? 0} à risque
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* ═══ Main content ═══ */}
      <main className="px-6 lg:px-8 pb-8 pt-6 space-y-6">
        {/* Level 1 — Synthesis bar */}
        <DashboardSynthesisBar metrics={metrics} isLoading={isLoading} />

        {/* Level 1 — KPI Grid (6 cards) */}
        <div ref={kpiRef}>
          <DashboardKPIGrid
            metrics={metrics}
            isLoading={isLoading}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Level 2 — "À traiter aujourd'hui" (full width, primary action zone) */}
        <section aria-labelledby="today-actions-title">
          <h2
            id="today-actions-title"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3"
          >
            À traiter aujourd'hui
          </h2>
          <ActionPanelToday
            onNavigate={handleNavigate}
            onOpenContact={handleOpenContact}
          />
        </section>

        {/* Level 3 — Two-column grid: Sessions | Finance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section aria-labelledby="sessions-panel-title">
            <h2
              id="sessions-panel-title"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3"
            >
              Sessions & Pédagogie
            </h2>
            <DashboardSessionsPanel
              sessions={dashboardData?.upcomingSessions ?? []}
              isLoading={isLoading}
              onNavigate={handleNavigate}
            />
          </section>

          <section aria-labelledby="finance-panel-title">
            <h2
              id="finance-panel-title"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3"
            >
              Finance & Trésorerie
            </h2>
            <DashboardFinancePanel
              metrics={metrics}
              topFactures={dashboardData?.topFactures ?? []}
              isLoading={isLoading}
              onNavigate={handleNavigate}
            />
          </section>
        </div>
      </main>

      {/* ═══ Dialogs ═══ */}
      <ExpressEnrollmentDialog
        open={expressOpen}
        onOpenChange={setExpressOpen}
        onSuccess={(contactId) => {
          if (contactId) {
            setSelectedContactId(contactId);
            setDetailOpen(true);
          }
        }}
      />
      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
