import { Euro, FileText, GraduationCap, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardPeriodV2 } from "@/hooks/useDashboardPeriodV2";
import { formatEur } from "@/lib/format-currency";

interface DashboardKPIRowProps {
  onNavigate: (section: string) => void;
}

const kpiCards = [
  { key: "encaissements", label: "CA encaissé", icon: Euro, section: "finances", format: (v: number) => formatEur(v) },
  { key: "caFacture", label: "CA facturé", icon: FileText, section: "finances", format: (v: number) => formatEur(v) },
  { key: "inscriptionsCount", label: "Inscriptions", icon: GraduationCap, section: "sessions", format: (v: number) => String(v) },
  { key: "nouveauxProspects", label: "Nouveaux prospects", icon: UserPlus, section: "prospects", format: (v: number) => String(v) },
] as const;

export function DashboardKPIRow({ onNavigate }: DashboardKPIRowProps) {
  const { period } = useDashboardPeriodV2();
  const { data, isLoading } = useDashboardData(period);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const metrics = data?.metrics;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {kpiCards.map((kpi) => {
        const Icon = kpi.icon;
        const value = metrics?.[kpi.key] ?? 0;

        return (
          <button
            key={kpi.key}
            onClick={() => onNavigate(kpi.section)}
            className="rounded-xl border border-border bg-card p-6 text-left hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">{kpi.format(value)}</p>
          </button>
        );
      })}
    </div>
  );
}
