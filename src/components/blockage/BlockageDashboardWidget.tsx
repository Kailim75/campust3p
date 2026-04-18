import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockageDiagnostic } from "@/hooks/useBlockageDiagnostic";

interface BlockageDashboardWidgetProps {
  onOpenPanel: () => void;
}

export function BlockageDashboardWidget({ onOpenPanel }: BlockageDashboardWidgetProps) {
  const { data, isLoading } = useBlockageDiagnostic();

  if (isLoading) return null;

  const counts = data?.counts || { blockers: 0, warnings: 0, infos: 0, total: 0 };
  const top5 = data?.blockages.slice(0, 5) || [];

  // Count top error codes
  const codeCounts = new Map<string, number>();
  data?.blockages.forEach((b) => {
    codeCounts.set(b.code, (codeCounts.get(b.code) || 0) + 1);
  });
  const topErrors = Array.from(codeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalApprenants = data?.blockages.filter((b) => b.entity_type === "apprenant").length || 0;
  const totalWithDocs = data?.blockages.filter((b) => b.code === "DOC_MISSING_CMA").length || 0;
  const conformitePct = totalApprenants > 0
    ? Math.round(((totalApprenants - totalWithDocs) / totalApprenants) * 100)
    : 100;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          Santé CRM
        </h3>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onOpenPanel}>
          Voir tout <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 rounded-lg bg-destructive/5">
          <span className="text-lg font-bold text-destructive">{counts.blockers}</span>
          <span className="text-[10px] text-muted-foreground">Critiques</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-warning/5">
          <span className="text-lg font-bold text-warning">{counts.warnings}</span>
          <span className="text-[10px] text-muted-foreground">Avertissements</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-info/5">
          <span className="text-lg font-bold text-info">{conformitePct}%</span>
          <span className="text-[10px] text-muted-foreground">Conformité</span>
        </div>
      </div>

      {/* Top errors */}
      {topErrors.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Top erreurs</p>
          {topErrors.map(([code, count]) => (
            <div key={code} className="flex items-center justify-between text-xs">
              <span className="text-foreground truncate">{code.replace(/_/g, " ").toLowerCase()}</span>
              <Badge variant="outline" className="text-[10px] h-4">{count}</Badge>
            </div>
          ))}
        </div>
      )}

      {counts.total === 0 && (
        <div className="text-center py-3">
          <span className="text-xl">✅</span>
          <p className="text-xs text-muted-foreground mt-1">Aucun blocage détecté</p>
        </div>
      )}
    </Card>
  );
}
