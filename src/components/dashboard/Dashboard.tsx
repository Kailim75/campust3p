import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "./StatCard";
import { AlertCard } from "./AlertCard";
import { SessionsOverview } from "./SessionsOverview";
import { RecentContacts } from "./RecentContacts";
import { RecentCallsCard } from "./RecentCallsCard";
import { MonthlyCAChart } from "./MonthlyCAChart";
import { FormationPieChart } from "./FormationPieChart";
import { FinancialSummaryCard } from "./FinancialSummaryCard";
import { InscriptionTrendChart } from "./InscriptionTrendChart";
import { ConversionKPICard } from "./ConversionKPICard";
import { CAParSourceChart } from "./CAParSourceChart";
import { FillRateCard } from "./FillRateCard";
import { ForecastCACard } from "./ForecastCACard";
import { PeriodSelector } from "./PeriodSelector";
import { ExamSuccessChart, ExamSuccessByFormation } from "./ExamSuccessChart";
import { MonthlyProjectionsChart, ProjectionDetailsTable } from "./MonthlyProjectionsChart";
import { CAByFormationChart } from "./CAByFormationChart";
import { PeriodComparisonDashboard } from "./PeriodComparisonDashboard";
import { ObjectifProgressCard } from "./ObjectifProgressCard";
import { PriorityActionCard } from "./PriorityActionCard";
import { TodayTasksCard } from "./TodayTasksCard";
import { SmartSuggestionsCard } from "./SmartSuggestionsCard";
import { Users, GraduationCap, TrendingUp, Euro, Download, UserPlus } from "lucide-react";
import { useDynamicContactStats, useDynamicFinanceStats } from "@/hooks/useDashboardDynamicStats";
import { useDashboardPeriod, periodOptions } from "@/hooks/useDashboardPeriod";
import { useDashboardExport } from "@/hooks/useDashboardExport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExpressEnrollmentDialog } from "@/components/contacts/ExpressEnrollmentDialog";

interface DashboardProps {
  onNavigate?: (section: string) => void;
  onNavigateWithContact?: (section: string, contactId?: string) => void;
}

export function Dashboard({ onNavigate, onNavigateWithContact }: DashboardProps) {
  const [expressEnrollOpen, setExpressEnrollOpen] = useState(false);
  const { data: contactStats, isLoading: contactsLoading } = useDynamicContactStats();
  const { data: financeStats, isLoading: financeLoading } = useDynamicFinanceStats();
  const { selectedPeriod } = useDashboardPeriod();
  const { exportDashboardToExcel } = useDashboardExport();
  
  const periodLabel = periodOptions.find(p => p.key === selectedPeriod)?.label.toLowerCase() || 'ce mois';
  
  const isLoading = contactsLoading || financeLoading;

  const formatEuro = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  const handleNavigate = (section: string) => {
    if (onNavigate) onNavigate(section);
  };

  const handleNavigateWithContact = (section: string, contactId?: string) => {
    if (onNavigateWithContact) {
      onNavigateWithContact(section, contactId);
    } else if (onNavigate) {
      onNavigate(section);
    }
  };

  const stats = [
    { 
      title: "Contacts total", 
      value: isLoading ? "..." : contactStats?.total ?? 0, 
      change: contactStats?.totalChange, 
      changeLabel: periodLabel, 
      icon: Users, 
      variant: "info" as const,
      section: "contacts",
    },
    { 
      title: "Clients actifs", 
      value: isLoading ? "..." : contactStats?.clients ?? 0, 
      change: contactStats?.clientsChange, 
      changeLabel: periodLabel, 
      icon: GraduationCap, 
      variant: "success" as const,
      section: "contacts",
    },
    { 
      title: "En attente", 
      value: isLoading ? "..." : contactStats?.enAttente ?? 0, 
      change: contactStats?.enAttenteChange, 
      changeLabel: periodLabel, 
      icon: TrendingUp, 
      variant: "primary" as const,
      section: "contacts",
    },
    { 
      title: "CA émis", 
      value: isLoading ? "..." : formatEuro(financeStats?.caThisPeriod ?? 0), 
      change: financeStats?.caChange, 
      changeLabel: periodLabel, 
      icon: Euro, 
      variant: "warning" as const,
      section: "paiements",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header 
        title="Tableau de bord" 
        subtitle="Vue d'ensemble de votre activité"
      />

      <main className="p-6 space-y-6 animate-fade-in">
        {/* Express Enrollment CTA + Priority Actions */}
        <div className="flex flex-col gap-4">
          {/* Row 1: CTA + Priority Action */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-stretch">
            <Button 
              size="lg" 
              onClick={() => setExpressEnrollOpen(true)}
              className="h-auto py-3 px-5 flex items-center gap-3 bg-primary hover:bg-primary/90 whitespace-nowrap"
            >
              <UserPlus className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-sm">Inscription Express</p>
                <p className="text-xs opacity-80">Nouveau stagiaire en 30 sec</p>
              </div>
            </Button>
            
            <PriorityActionCard onNavigate={handleNavigate} onNavigateWithContact={handleNavigateWithContact} />
          </div>

          {/* Row 2: Today Tasks + Smart Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TodayTasksCard onNavigate={handleNavigate} onNavigateWithContact={handleNavigateWithContact} />
            <SmartSuggestionsCard onNavigate={handleNavigate} />
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-foreground">Indicateurs clés</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportDashboardToExcel}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
            <PeriodSelector />
          </div>
        </div>
        
        {/* Stats Grid - Clickable KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard 
              key={stat.title} 
              title={stat.title}
              value={stat.value}
              change={stat.change}
              changeLabel={stat.changeLabel}
              icon={stat.icon}
              variant={stat.variant}
              onClick={() => handleNavigate(stat.section)}
            />
          ))}
        </div>

        {/* Tabs for different dashboard views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="objectifs">Objectifs</TabsTrigger>
            <TabsTrigger value="comparison">Comparaison</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="examens">Examens</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPIs avancés */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ConversionKPICard onClick={() => handleNavigate("contacts")} />
              <FillRateCard onClick={() => handleNavigate("sessions")} />
              <ForecastCACard onClick={() => handleNavigate("paiements")} />
              <CAParSourceChart />
            </div>

            {/* Sessions and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SessionsOverview onClick={() => handleNavigate("sessions")} />
              </div>
              <div>
                <AlertCard onClick={() => handleNavigate("alertes")} />
              </div>
            </div>

            {/* Formations and Inscriptions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormationPieChart onClick={() => handleNavigate("formations")} />
              <InscriptionTrendChart onClick={() => handleNavigate("sessions")} />
            </div>

            {/* Recent Contacts & Calls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentContacts onClick={() => handleNavigate("contacts")} />
              <RecentCallsCard onClick={() => handleNavigate("contacts")} />
            </div>
          </TabsContent>

          {/* Objectifs Tab */}
          <TabsContent value="objectifs" className="space-y-6">
            <ObjectifProgressCard />
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <PeriodComparisonDashboard />
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-6">
            {/* CA Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <MonthlyCAChart />
              <FinancialSummaryCard onClick={() => handleNavigate("paiements")} />
            </div>

            {/* Projections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <MonthlyProjectionsChart onClick={() => handleNavigate("sessions")} />
              <ProjectionDetailsTable />
            </div>

            {/* CA by Formation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CAByFormationChart onClick={() => handleNavigate("paiements")} />
              <ForecastCACard onClick={() => handleNavigate("paiements")} />
            </div>
          </TabsContent>

          {/* Examens Tab */}
          <TabsContent value="examens" className="space-y-6">
            {/* Exam Success Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ExamSuccessChart onClick={() => handleNavigate("contacts")} />
              <ExamSuccessByFormation />
            </div>

            {/* Sessions Overview for exams context */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SessionsOverview onClick={() => handleNavigate("sessions")} />
              <AlertCard onClick={() => handleNavigate("alertes")} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Express Enrollment Dialog */}
        <ExpressEnrollmentDialog 
          open={expressEnrollOpen} 
          onOpenChange={setExpressEnrollOpen}
          onSuccess={() => handleNavigate("contacts")}
        />
      </main>
    </div>
  );
}
