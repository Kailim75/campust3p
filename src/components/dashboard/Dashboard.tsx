import { Header } from "@/components/layout/Header";
import { StatCard } from "./StatCard";
import { AlertCard } from "./AlertCard";
import { SessionsOverview } from "./SessionsOverview";
import { RecentContacts } from "./RecentContacts";
import { MonthlyCAChart } from "./MonthlyCAChart";
import { FormationPieChart } from "./FormationPieChart";
import { FinancialSummaryCard } from "./FinancialSummaryCard";
import { InscriptionTrendChart } from "./InscriptionTrendChart";
import { ConversionKPICard } from "./ConversionKPICard";
import { CAParSourceChart } from "./CAParSourceChart";
import { FillRateCard } from "./FillRateCard";
import { ForecastCACard } from "./ForecastCACard";
import { PeriodSelector } from "./PeriodSelector";
import { Users, GraduationCap, TrendingUp, Euro, CalendarDays } from "lucide-react";
import { useDynamicContactStats, useDynamicFinanceStats } from "@/hooks/useDashboardDynamicStats";
import { useDashboardPeriod, periodOptions } from "@/hooks/useDashboardPeriod";

interface DashboardProps {
  onNavigate?: (section: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { data: contactStats, isLoading: contactsLoading } = useDynamicContactStats();
  const { data: financeStats, isLoading: financeLoading } = useDynamicFinanceStats();
  const { selectedPeriod } = useDashboardPeriod();
  
  const periodLabel = periodOptions.find(p => p.key === selectedPeriod)?.label.toLowerCase() || 'ce mois';
  
  const isLoading = contactsLoading || financeLoading;

  const formatEuro = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

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
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Aperçu</h2>
          <PeriodSelector />
        </div>
        
        {/* Stats Grid */}
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
              onClick={onNavigate ? () => onNavigate(stat.section) : undefined}
            />
          ))}
        </div>

        {/* KPIs avancés: Conversion + CA par source + Fill Rate + Forecast */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ConversionKPICard onClick={onNavigate ? () => onNavigate("contacts") : undefined} />
          <FillRateCard onClick={onNavigate ? () => onNavigate("sessions") : undefined} />
          <ForecastCACard onClick={onNavigate ? () => onNavigate("paiements") : undefined} />
          <CAParSourceChart />
        </div>

        {/* Graphiques CA et Finance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MonthlyCAChart />
          <FinancialSummaryCard onClick={onNavigate ? () => onNavigate("paiements") : undefined} />
        </div>

        {/* Graphiques Formations et Inscriptions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormationPieChart onClick={onNavigate ? () => onNavigate("formations") : undefined} />
          <InscriptionTrendChart onClick={onNavigate ? () => onNavigate("sessions") : undefined} />
        </div>

        {/* Sessions and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SessionsOverview onClick={onNavigate ? () => onNavigate("sessions") : undefined} />
          </div>
          <div>
            <AlertCard onClick={onNavigate ? () => onNavigate("alertes") : undefined} />
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="grid grid-cols-1">
          <RecentContacts onClick={onNavigate ? () => onNavigate("contacts") : undefined} />
        </div>
      </main>
    </div>
  );
}
