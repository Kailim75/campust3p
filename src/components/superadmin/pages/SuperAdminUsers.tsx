import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export function SuperAdminUsers() {
  return (
    <div className="space-y-6">
      <Card className="bg-superadmin-card border-superadmin-border">
        <CardHeader>
          <CardTitle className="text-superadmin-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-superadmin-primary" />
            Gestion des utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-superadmin-muted">
          Module de gestion des utilisateurs à venir
        </CardContent>
      </Card>
    </div>
  );
}
