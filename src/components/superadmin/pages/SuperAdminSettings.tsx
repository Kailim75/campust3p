import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export function SuperAdminSettings() {
  return (
    <div className="space-y-6">
      <Card className="bg-superadmin-card border-superadmin-border">
        <CardHeader>
          <CardTitle className="text-superadmin-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-superadmin-primary" />
            Configuration plateforme
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-superadmin-muted">
          Paramètres globaux de la plateforme à venir
        </CardContent>
      </Card>
    </div>
  );
}
