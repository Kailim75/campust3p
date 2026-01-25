import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export function SuperAdminActivity() {
  return (
    <div className="space-y-6">
      <Card className="bg-superadmin-card border-superadmin-border">
        <CardHeader>
          <CardTitle className="text-superadmin-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-superadmin-primary" />
            Journal d'activité
          </CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center text-superadmin-muted">
          Logs et événements récents à venir
        </CardContent>
      </Card>
    </div>
  );
}
