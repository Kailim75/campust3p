/**
 * DashboardFormationBreakdown — Performance comparison by formation type.
 * Switchable metrics: inscriptions, remplissage.
 * Uses data from useDashboardData.formationBreakdown.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FormationBreakdown } from "@/hooks/useDashboardData";
import { BarChart3 } from "lucide-react";

interface Props {
  data: FormationBreakdown[];
  isLoading: boolean;
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

type MetricView = "inscriptions" | "remplissage";

const COLORS = [
  "bg-primary",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-rose-500",
];

export function DashboardFormationBreakdown({ data, isLoading, onNavigate }: Props) {
  const [metric, setMetric] = useState<MetricView>("inscriptions");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-5 w-48 mb-4" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Performance par formation
          </h3>
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucune donnée de formation disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  const views: { key: MetricView; label: string }[] = [
    { key: "inscriptions", label: "Inscriptions" },
    { key: "remplissage", label: "Remplissage" },
  ];

  // Compute max for relative bar sizing
  const maxInscriptions = Math.max(...data.map((d) => d.inscriptions), 1);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Performance par formation
          </h3>
          <div className="flex items-center gap-1">
            {views.map((v) => (
              <button
                key={v.key}
                onClick={() => setMetric(v.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                  metric === v.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {data.slice(0, 6).map((item, idx) => {
            const fillPercent = item.places > 0 ? Math.round((item.inscrits / item.places) * 100) : 0;

            return (
              <button
                key={item.formation_type}
                onClick={() => onNavigate("sessions", { formation: item.formation_type })}
                className="w-full text-left group hover:bg-muted/30 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", COLORS[idx % COLORS.length])} />
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.formation_type}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0 ml-2">
                    {metric === "inscriptions"
                      ? item.inscriptions
                      : item.places > 0
                        ? `${fillPercent} %`
                        : "—"}
                  </span>
                </div>
                <div className="ml-4.5">
                  {metric === "inscriptions" ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", COLORS[idx % COLORS.length])}
                          style={{ width: `${Math.round((item.inscriptions / maxInscriptions) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-12 text-right">
                        {item.inscrits}/{item.places || "—"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Progress
                        value={fillPercent}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-[10px] text-muted-foreground w-12 text-right">
                        {item.inscrits}/{item.places || "—"}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
