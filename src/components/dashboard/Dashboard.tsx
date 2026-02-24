import React, { useState } from "react";
import { useNoShowDetection } from "@/hooks/useNoShowDetection";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, Clock, Euro, Download, GraduationCap } from "lucide-react";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { PriorityActionCard } from "./PriorityActionCard";
import { TodayTasksCard } from "./TodayTasksCard";
import { SmartSuggestionsCard } from "./SmartSuggestionsCard";
import { StatCard } from "./StatCard";
import { ConversionKPICard } from "./ConversionKPICard";
import { FillRateCard } from "./FillRateCard";
import { ForecastCACard } from "./ForecastCACard";
import { CAParSourceChart } from "./CAParSourceChart";
import { SessionsOverview } from "./SessionsOverview";
import { AlertCard } from "./AlertCard";
import { PeriodSelector } from "./PeriodSelector";
import { ObjectifProgressCard } from "./ObjectifProgressCard";
import { PeriodComparisonDashboard } from "./PeriodComparisonDashboard";
import { ExamSuccessChart } from "./ExamSuccessChart";
import { FinancialSummaryCard } from "./FinancialSummaryCard";
import { useDynamicContactStats, useDynamicFinanceStats } from "@/hooks/useDashboardDynamicStats";
import { useDashboardPeriod } from "@/hooks/useDashboardPeriod";
import { ExpressEnrollmentDialog } from "@/components/contacts/ExpressEnrollmentDialog";
import { cn } from "@/lib/utils";

interface DashboardProps {
  onNavigate?: (section: string) => void;
  onNavigateWithContact?: (section: string, contactId?: string) => void;
}

export function Dashboard({ onNavigate, onNavigateWithContact }: DashboardProps) {
  useNoShowDetection();
  const { data: contactStats } = useDynamicContactStats();
  const { data: financeStats } = useDynamicFinanceStats();
  const { selectedPeriod } = useDashboardPeriod();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expressOpen, setExpressOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const periodLabel = selectedPeriod === "30d" ? "30 derniers jours" 
    : selectedPeriod === "7d" ? "7 derniers jours"
    : selectedPeriod === "3m" ? "3 derniers mois"
    : selectedPeriod === "12m" ? "12 derniers mois"
    : "30 derniers jours";

  const handleNavigate = (section: string) => {
    onNavigate?.(section);
  };

  const handleNavigateWithContact = (section: string, contactId?: string) => {
    if (contactId) {
      setSelectedContactId(contactId);
      setDetailOpen(true);
    } else {
      onNavigateWithContact?.(section, contactId);
    }
  };

  const formatEuro = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      <main className="px-6 pb-6 space-y-6">
        {/* Row 1: Express Enrollment + Priority Action */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Inscription Express Card */}
          <div 
            className="relative overflow-hidden rounded-xl bg-sidebar text-sidebar-foreground p-6 cursor-pointer hover:shadow-lg transition-all group"
            onClick={() => setExpressOpen(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative">
              <div className="p-2 rounded-lg bg-white/20 w-fit mb-3">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold text-lg">Inscription Express</h3>
              <p className="text-sm opacity-80">Nouveau stagiaire en 30 sec</p>
            </div>
          </div>

          {/* Priority Action */}
          <div className="lg:col-span-3">
            <PriorityActionCard 
              onNavigate={handleNavigate}
              onNavigateWithContact={handleNavigateWithContact}
            />
          </div>
        </div>

        {/* Row 2: Today Tasks + Smart Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TodayTasksCard 
            onNavigate={handleNavigate}
            onNavigateWithContact={handleNavigateWithContact}
          />
          <SmartSuggestionsCard onNavigate={handleNavigate} />
        </div>

        {/* Row 3: Indicateurs clés */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground text-lg">Indicateurs clés</h2>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5" />
                Export Excel
              </Button>
              <PeriodSelector />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Contacts total"
              value={contactStats?.total ?? "-"}
              change={contactStats?.totalChange}
              changeLabel={periodLabel}
              icon={Users}
              variant="primary"
              onClick={() => handleNavigate("contacts")}
            />
            <StatCard
              title="Clients actifs"
              value={contactStats?.clients ?? "-"}
              change={contactStats?.clientsChange}
              changeLabel={periodLabel}
              icon={UserCheck}
              variant="success"
              onClick={() => handleNavigate("contacts")}
            />
            <StatCard
              title="En attente"
              value={contactStats?.enAttente ?? "-"}
              change={contactStats?.enAttenteChange}
              changeLabel={periodLabel}
              icon={Clock}
              variant="warning"
              onClick={() => handleNavigate("contacts")}
            />
            <StatCard
              title="CA émis"
              value={financeStats ? formatEuro(financeStats.caThisPeriod) : "-"}
              change={financeStats?.caChange}
              changeLabel={periodLabel}
              icon={Euro}
              variant="info"
              onClick={() => handleNavigate("paiements")}
            />
          </div>
        </div>

        {/* Row 4: Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="objectifs">Objectifs</TabsTrigger>
            <TabsTrigger value="comparison">Comparaison</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="examens">Examens</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ConversionKPICard onClick={() => handleNavigate("contacts")} />
              <FillRateCard onClick={() => handleNavigate("sessions")} />
              <ForecastCACard onClick={() => handleNavigate("paiements")} />
              <CAParSourceChart />
            </div>
          </TabsContent>

          {/* Objectifs */}
          <TabsContent value="objectifs" className="mt-4">
            <ObjectifProgressCard />
          </TabsContent>

          {/* Comparaison */}
          <TabsContent value="comparison" className="mt-4">
            <PeriodComparisonDashboard />
          </TabsContent>

          {/* Finance */}
          <TabsContent value="finance" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FinancialSummaryCard onClick={() => handleNavigate("paiements")} />
              <ForecastCACard onClick={() => handleNavigate("paiements")} />
            </div>
          </TabsContent>

          {/* Examens */}
          <TabsContent value="examens" className="mt-4">
            <ExamSuccessChart />
          </TabsContent>
        </Tabs>

        {/* Row 5: Sessions + Alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SessionsOverview onClick={() => handleNavigate("sessions")} />
          <AlertCard onClick={() => handleNavigate("alertes")} />
        </div>
      </main>

      {/* Express Enrollment Dialog */}
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

      {/* Contact Detail Sheet */}
      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
