import { Car, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SuperAdminStats } from "@/hooks/useSuperAdminStats";

interface FormationBreakdownCardProps {
  stats: SuperAdminStats | undefined;
  isLoading: boolean;
}

export function FormationBreakdownCard({ stats, isLoading }: FormationBreakdownCardProps) {
  const total = stats?.totalApprenants || 1; // Éviter division par zéro

  const formations = [
    {
      name: "Taxi",
      count: stats?.apprenantsTaxi ?? 0,
      percentage: Math.round(((stats?.apprenantsTaxi ?? 0) / total) * 100),
      color: "bg-warning",
      icon: Car,
    },
    {
      name: "VTC",
      count: stats?.apprenantsVtc ?? 0,
      percentage: Math.round(((stats?.apprenantsVtc ?? 0) / total) * 100),
      color: "bg-primary",
      icon: Car,
    },
    {
      name: "VMDTR",
      count: stats?.apprenantsVmdtr ?? 0,
      percentage: Math.round(((stats?.apprenantsVmdtr ?? 0) / total) * 100),
      color: "bg-info",
      icon: Truck,
    },
  ];

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Répartition par formation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {formations.map((formation) => (
            <div key={formation.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("p-2 rounded-lg", formation.color + "/10")}>
                    <formation.icon className={cn("h-4 w-4", formation.color.replace("bg-", "text-"))} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{formation.name}</span>
                </div>
                <span className="text-2xl font-display font-bold text-foreground">
                  {formation.count}
                </span>
              </div>
              <Progress 
                value={formation.percentage} 
                className={cn("h-2", `[&>div]:${formation.color}`)}
              />
              <p className="text-xs text-muted-foreground">
                {formation.percentage}% des apprenants
              </p>
            </div>
          ))}
        </div>

        {/* Activité récente */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Activité 7 derniers jours</p>
              <p className="text-lg font-semibold text-foreground">
                {stats?.activiteLast7Days ?? 0} centres
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Activité 30 derniers jours</p>
              <p className="text-lg font-semibold text-foreground">
                {stats?.activiteLast30Days ?? 0} centres
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
