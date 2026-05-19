import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { useInvoiceCompliance, complianceTone } from "@/hooks/useInvoiceCompliance";
import { cn } from "@/lib/utils";

interface Props {
  factureId: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Compact e-invoicing readiness badge.
 * Reform 2026/2027 — shows score 0-100 and number of blocking issues.
 */
export function InvoiceComplianceBadge({ factureId, className, onClick }: Props) {
  const { data, isLoading } = useInvoiceCompliance(factureId);

  if (isLoading) {
    return (
      <Badge variant="outline" className={cn("gap-1 font-normal", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-[10px]">…</span>
      </Badge>
    );
  }

  if (!data) return null;

  const tone = complianceTone(data.score);
  const blocking = data.issues.filter((i) => i.severity === "bloquant").length;

  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? AlertTriangle : ShieldAlert;
  const label =
    tone === "success" ? "Prête e-invoicing" : tone === "warning" ? "À compléter" : "Non conforme";

  const colorClasses =
    tone === "success"
      ? "border-success/30 bg-success/10 text-success hover:bg-success/15"
      : tone === "warning"
      ? "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15"
      : "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
              colorClasses,
              className,
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{data.score}/100</span>
            {blocking > 0 && (
              <span className="ml-0.5 rounded-sm bg-destructive/20 px-1 text-[9px] font-bold">
                {blocking}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{label} (réforme 2026/2027)</p>
            <p className="text-xs">
              Score {data.score}/100 — {blocking} bloquant{blocking > 1 ? "s" : ""},{" "}
              {data.issues.length - blocking} avertissement
              {data.issues.length - blocking > 1 ? "s" : ""}
            </p>
            {onClick && <p className="text-xs italic opacity-80">Cliquer pour voir le détail</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
