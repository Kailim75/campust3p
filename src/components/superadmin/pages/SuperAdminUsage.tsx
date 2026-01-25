import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, MousePointer, Clock } from "lucide-react";

export function SuperAdminUsage() {
  return (
    <div className="space-y-6">
      {/* KPIs Usage */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-superadmin-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-superadmin-primary" />
              </div>
              <div>
                <p className="text-sm text-superadmin-muted">Utilisateurs actifs</p>
                <p className="text-2xl font-bold text-superadmin-foreground">234</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-superadmin-accent/10 flex items-center justify-center">
                <MousePointer className="h-5 w-5 text-superadmin-accent" />
              </div>
              <div>
                <p className="text-sm text-superadmin-muted">Sessions/jour</p>
                <p className="text-2xl font-bold text-superadmin-foreground">1.2k</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-superadmin-muted">Temps moyen</p>
                <p className="text-2xl font-bold text-superadmin-foreground">18m</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-superadmin-muted">Taux adoption</p>
                <p className="text-2xl font-bold text-superadmin-foreground">72%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardHeader>
            <CardTitle className="text-superadmin-foreground">Fonctionnalités les plus utilisées</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-superadmin-muted">
            Graphique à venir
          </CardContent>
        </Card>
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardHeader>
            <CardTitle className="text-superadmin-foreground">Évolution de l'engagement</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-superadmin-muted">
            Graphique à venir
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
