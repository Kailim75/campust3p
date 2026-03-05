import React, { useState } from "react";
import { useNoShowDetection } from "@/hooks/useNoShowDetection";
import { GraduationCap, CalendarCheck } from "lucide-react";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ExpressEnrollmentDialog } from "@/components/contacts/ExpressEnrollmentDialog";
import { DashboardPeriodPicker } from "./DashboardPeriodPicker";
import { DashboardPilotageRow } from "./DashboardPilotageRow";
import { DashboardRiskRow } from "./DashboardRiskRow";
import { ActionPanelToday } from "./ActionPanelToday";
import { ActionPanelSessions } from "./ActionPanelSessions";
import { useDashboardPeriodV2 } from "@/hooks/useDashboardPeriodV2";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useCurrentUserRole } from "@/hooks/useUsers";
import { useBlockageDiagnostic } from "@/hooks/useBlockageDiagnostic";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isToday, isPast, parseISO } from "date-fns";

function useTodayActionCount() {
  return useQuery({
    queryKey: ["dashboard", "today-count"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const [prospectsRes, docsRes, contactsRes] = await Promise.all([
        supabase.from("prospects").select("id, date_prochaine_relance, statut")
          .eq("is_active", true).not("statut", "in", '("converti","perdu")'),
        supabase.from("contact_documents").select("contact_id, type_document"),
        supabase.from("contacts").select("id").eq("archived", false),
      ]);
      const prospects = prospectsRes.data || [];
      const rdvToday = prospects.filter(p => p.date_prochaine_relance && isToday(parseISO(p.date_prochaine_relance))).length;
      const relances = prospects.filter(p => p.statut === "relance" || (p.date_prochaine_relance && isPast(parseISO(p.date_prochaine_relance)) && !isToday(parseISO(p.date_prochaine_relance)))).length;
      const CMA_DOCS = ["cni", "photo", "attestation_domicile", "permis_b"];
      const docsMap = new Map<string, Set<string>>();
      (docsRes.data || []).forEach((d: any) => {
        if (!docsMap.has(d.contact_id)) docsMap.set(d.contact_id, new Set());
        docsMap.get(d.contact_id)!.add(d.type_document);
      });
      const contacts = contactsRes.data || [];
      const cma = contacts.filter(c => {
        const docs = docsMap.get(c.id) || new Set();
        return CMA_DOCS.some(d => !docs.has(d));
      }).length;
      return rdvToday + relances + Math.min(cma, 10);
    },
    staleTime: 60_000,
  });
}

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
  const { data: todayCount } = useTodayActionCount();
  const { period } = useDashboardPeriodV2();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(period);
  const { data: userRole } = useCurrentUserRole();
  const { data: diagnostic } = useBlockageDiagnostic();

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
      {/* Header */}
      <div className="px-8 pt-8 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de votre centre</p>
          </div>
          <div className="flex items-center gap-3">
            <DashboardPeriodPicker />
            <button
              onClick={() => onNavigate?.("aujourdhui")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <CalendarCheck className="h-4 w-4" />
              Voir Aujourd'hui
              {(todayCount ?? 0) > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                  {todayCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setExpressOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sidebar text-sidebar-foreground hover:opacity-90 transition-opacity text-sm font-medium"
            >
              <GraduationCap className="h-4 w-4" />
              Inscription Express
            </button>
          </div>
        </div>

        {/* Admin diagnostic chip */}
        {isAdminOrStaff && diagnostic && diagnostic.counts.total > 0 && (
          <button
            onClick={() => onNavigate?.("alertes")}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-xs font-medium text-muted-foreground"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Diagnostic (admin)
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {diagnostic.counts.total}
            </Badge>
          </button>
        )}
      </div>

      <main className="px-8 pb-8 pt-6 space-y-6">
        {/* Row 1 — Pilotage KPIs */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pilotage</h2>
          <DashboardPilotageRow metrics={metrics} isLoading={metricsLoading} onNavigate={handleNavigate} />
        </div>

        {/* Row 2 — Risk & Quality KPIs */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Risque & Qualité</h2>
          <DashboardRiskRow metrics={metrics} isLoading={metricsLoading} onNavigate={handleNavigate} />
        </div>

        {/* Row 3 — Action Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActionPanelToday onNavigate={handleNavigate} onOpenContact={handleOpenContact} />
          <ActionPanelSessions onNavigate={handleNavigate} />
        </div>
      </main>

      {/* Dialogs */}
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
