import { Building2, Users, Zap, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SuperAdminStats } from "@/hooks/useSuperAdminStats";

interface SuperAdminKPICardsProps {
  stats: SuperAdminStats | undefined;
  isLoading: boolean;
}

export function SuperAdminKPICards({ stats, isLoading }: SuperAdminKPICardsProps) {
  const kpis = [
    {
      title: "Centres actifs",
      value: stats?.centresActifs ?? 0,
      subtitle: `${stats?.centresTotal ?? 0} total • ${stats?.centresOnboarding ?? 0} en onboarding`,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Apprenants",
      value: stats?.totalApprenants ?? 0,
      subtitle: "Tous centres confondus",
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Activation rapide",
      value: `${stats?.activationRate ?? 0}%`,
      subtitle: "Centres activés en < 48h",
      icon: Zap,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Réussite T3P",
      value: `${stats?.tauxReussiteGlobal ?? 0}%`,
      subtitle: "Taux de réussite global aux examens",
      icon: Trophy,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card 
          key={kpi.title} 
          className="border-border/50 transition-all duration-200 hover:shadow-md"
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 flex-1">
                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <p className="text-3xl font-display font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
              </div>
              <div className={cn("p-3 rounded-xl", kpi.bgColor)}>
                <kpi.icon className={cn("h-6 w-6", kpi.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
