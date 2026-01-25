import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award, Target, BarChart3 } from "lucide-react";

export function SuperAdminPerformance() {
  return (
    <div className="space-y-6">
      {/* Coming Soon State */}
      <Card className="bg-superadmin-card border-superadmin-border">
        <CardHeader>
          <CardTitle className="text-superadmin-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-superadmin-primary" />
            Performance pédagogique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-lg bg-superadmin-primary/5 border border-superadmin-border">
              <Award className="h-10 w-10 mx-auto text-superadmin-primary mb-3" />
              <h3 className="font-semibold text-superadmin-foreground">Taux de réussite global</h3>
              <p className="text-3xl font-bold text-superadmin-primary mt-2">85%</p>
              <p className="text-sm text-superadmin-muted mt-1">+3% vs mois précédent</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-superadmin-accent/5 border border-superadmin-border">
              <Target className="h-10 w-10 mx-auto text-superadmin-accent mb-3" />
              <h3 className="font-semibold text-superadmin-foreground">Sessions complétées</h3>
              <p className="text-3xl font-bold text-superadmin-accent mt-2">156</p>
              <p className="text-sm text-superadmin-muted mt-1">Ce mois</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-success/5 border border-superadmin-border">
              <BarChart3 className="h-10 w-10 mx-auto text-success mb-3" />
              <h3 className="font-semibold text-superadmin-foreground">Certifications délivrées</h3>
              <p className="text-3xl font-bold text-success mt-2">423</p>
              <p className="text-sm text-superadmin-muted mt-1">Depuis le début</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardHeader>
            <CardTitle className="text-superadmin-foreground">Réussite par formation</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-superadmin-muted">
            Graphique à venir
          </CardContent>
        </Card>
        <Card className="bg-superadmin-card border-superadmin-border">
          <CardHeader>
            <CardTitle className="text-superadmin-foreground">Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-superadmin-muted">
            Graphique à venir
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
