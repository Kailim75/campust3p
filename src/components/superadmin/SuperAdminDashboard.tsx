import { Header } from "@/components/layout/Header";
import { SuperAdminKPICards } from "./SuperAdminKPICards";
import { SuperAdminAlertsCard } from "./SuperAdminAlertsCard";
import { OnboardingFunnelCard } from "./OnboardingFunnelCard";
import { FormationBreakdownCard } from "./FormationBreakdownCard";
import { useSuperAdminStats, useCentreAlerts, useOnboardingFunnel } from "@/hooks/useSuperAdminStats";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsSuperAdmin } from "@/hooks/useCentres";
import { ShieldAlert } from "lucide-react";

export function SuperAdminDashboard() {
  const { data: isSuperAdmin, isLoading: checkingRole } = useIsSuperAdmin();
  const { data: stats, isLoading: statsLoading } = useSuperAdminStats();
  const { data: alerts, isLoading: alertsLoading } = useCentreAlerts();
  const { data: funnel, isLoading: funnelLoading } = useOnboardingFunnel();

  // Vérification du rôle
  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Accès refusé</h2>
          <p className="text-muted-foreground">
            Cette page est réservée aux administrateurs de la plateforme.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = statsLoading || alertsLoading || funnelLoading;

  return (
    <div className="min-h-screen">
      <Header 
        title="Pilotage CampusT3P" 
        subtitle="Vue globale de la plateforme multi-centres"
      />

      <main className="p-6 space-y-6 animate-fade-in">
        {/* 4 KPI Cards principales */}
        <SuperAdminKPICards stats={stats} isLoading={isLoading} />

        {/* Alertes prioritaires + Entonnoir d'activation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SuperAdminAlertsCard alerts={alerts || []} isLoading={alertsLoading} />
          <OnboardingFunnelCard funnel={funnel || []} isLoading={funnelLoading} />
        </div>

        {/* Répartition par formation */}
        <FormationBreakdownCard stats={stats} isLoading={statsLoading} />
      </main>
    </div>
  );
}
