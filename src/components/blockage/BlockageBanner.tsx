import { AlertTriangle, ChevronRight, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockageDiagnostic } from "@/hooks/useBlockageDiagnostic";

interface BlockageBannerProps {
  onOpenPanel: () => void;
}

export function BlockageBanner({ onOpenPanel }: BlockageBannerProps) {
  const { data, isLoading } = useBlockageDiagnostic();

  if (isLoading || !data || data.counts.total === 0) return null;

  const { blockers, warnings } = data.counts;
  const hasCritical = blockers > 0;

  return (
    <button
      onClick={onOpenPanel}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
        hasCritical
          ? "bg-destructive/10 text-destructive hover:bg-destructive/15 border-b border-destructive/20"
          : "bg-warning/10 text-warning hover:bg-warning/15 border-b border-warning/20"
      )}
    >
      {hasCritical ? (
        <ShieldAlert className="h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      )}
      <span>
        🚦 Diagnostic système : {blockers > 0 && `${blockers} blocage${blockers > 1 ? "s" : ""} critique${blockers > 1 ? "s" : ""}`}
        {blockers > 0 && warnings > 0 && " · "}
        {warnings > 0 && `${warnings} avertissement${warnings > 1 ? "s" : ""}`}
      </span>
      <ChevronRight className="h-4 w-4 ml-auto shrink-0" />
    </button>
  );
}
