import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useContratCoherence } from "@/hooks/useContratCoherence";
import type { CoherenceStatus } from "@/lib/compliance/contratCoherenceCheck";

interface Props {
  inscriptionId: string;
}

const STATUS_CFG: Record<CoherenceStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  ok: { icon: CheckCircle2, className: "text-success", label: "Conforme" },
  warning: { icon: AlertTriangle, className: "text-warning", label: "À vérifier" },
  error: { icon: XCircle, className: "text-destructive", label: "Non conforme" },
};

export function ContratCoherencePanel({ inscriptionId }: Props) {
  const { data: report, isLoading } = useContratCoherence(inscriptionId);

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (!report) return null;

  const HeaderIcon = report.ready ? ShieldCheck : ShieldAlert;
  const headerClass = report.ready
    ? "text-success"
    : report.blocking > 0
      ? "text-destructive"
      : "text-warning";

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <HeaderIcon className={`h-5 w-5 mt-0.5 shrink-0 ${headerClass}`} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Contrôle de conformité — Contrat</h3>
            <p className="text-xs text-muted-foreground">
              Articles 2 / 4 / 5 / 8 / 9 + bloc représentant légal
              {report.context.age !== null && (
                <> · Bénéficiaire {report.context.age} ans</>
              )}
              {report.context.formationType && (
                <> · {report.context.isFC ? "Formation continue" : "Initial"} ({report.context.formationType})</>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant={report.ready ? "default" : "destructive"}
            className="text-[10px]"
          >
            {report.score}%
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {report.blocking} err · {report.warnings} avert
          </span>
        </div>
      </div>

      <ul className="space-y-1.5 pt-1 border-t">
        {report.checks.map((c) => {
          const cfg = STATUS_CFG[c.status];
          const Icon = cfg.icon;
          return (
            <li key={c.id} className="flex items-start gap-2 text-xs">
              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.className}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-[10px] text-muted-foreground">{c.reference}</span>
                </div>
                <p className="text-muted-foreground leading-snug">{c.message}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
