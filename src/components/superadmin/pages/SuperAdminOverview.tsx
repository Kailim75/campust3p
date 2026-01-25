import { SuperAdminKPICards } from "../SuperAdminKPICards";
import { SuperAdminAlertsCard } from "../SuperAdminAlertsCard";
import { OnboardingFunnelCard } from "../OnboardingFunnelCard";
import { FormationBreakdownCard } from "../FormationBreakdownCard";
import { useSuperAdminStats, useCentreAlerts, useOnboardingFunnel } from "@/hooks/useSuperAdminStats";

export function SuperAdminOverview() {
  const { data: stats, isLoading: statsLoading } = useSuperAdminStats();
  const { data: alerts, isLoading: alertsLoading } = useCentreAlerts();
  const { data: funnel, isLoading: funnelLoading } = useOnboardingFunnel();

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards principales */}
      <SuperAdminKPICards stats={stats} isLoading={statsLoading} />

      {/* Alertes prioritaires + Entonnoir d'activation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SuperAdminAlertsCard alerts={alerts || []} isLoading={alertsLoading} />
        <OnboardingFunnelCard funnel={funnel || []} isLoading={funnelLoading} />
      </div>

      {/* Répartition par formation */}
      <FormationBreakdownCard stats={stats} isLoading={statsLoading} />
    </div>
  );
}
