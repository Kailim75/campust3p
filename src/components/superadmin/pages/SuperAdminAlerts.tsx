import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuperAdminAlertsCard } from "../SuperAdminAlertsCard";
import { useCentreAlerts } from "@/hooks/useSuperAdminStats";
import { AlertTriangle } from "lucide-react";

export function SuperAdminAlerts() {
  const { data: alerts, isLoading } = useCentreAlerts();

  return (
    <div className="space-y-6">
      {/* Alerts List Full Width */}
      <SuperAdminAlertsCard alerts={alerts || []} isLoading={isLoading} />

      {/* Additional Context */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardHeader>
            <CardTitle className="text-superadmin-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Centres à risque
            </CardTitle>
          </CardHeader>
          <CardContent className="text-superadmin-muted">
            Analyse détaillée des centres nécessitant une intervention
          </CardContent>
        </Card>
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardHeader>
            <CardTitle className="text-superadmin-foreground">Historique des interventions</CardTitle>
          </CardHeader>
          <CardContent className="text-superadmin-muted">
            Suivi des actions correctives
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
