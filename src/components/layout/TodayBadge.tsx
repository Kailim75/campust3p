import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTodayCounts } from "@/hooks/useTodayCounts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TodayBadgeProps {
  onClick: () => void;
}

/**
 * Discrete badge always visible in the header.
 * Shows the total of "things to handle today": rappels dûs + dossiers CMA incomplets.
 * Click → navigate to "Aujourd'hui" hub.
 *
 * Le comptage est différé de quelques secondes après le montage : le badge
 * n'a pas à concourir avec les données de la page pendant le premier
 * chargement (audit perf du 18/07/2026).
 */
export function TodayBadge({ onClick }: TodayBadgeProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2_500);
    return () => clearTimeout(t);
  }, []);
  const { data, isLoading } = useTodayCounts({ enabled: ready });
  const total = data?.total ?? 0;
  const rappels = data?.rappels ?? 0;
  const cma = data?.cma ?? 0;

  if (isLoading || total === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            aria-label="Ouvrir Aujourd'hui"
            className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Aujourd'hui
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Aucune action urgente</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={`${total} actions à traiter aujourd'hui`}
          className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          Aujourd'hui · {total}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {rappels > 0 && <div>{rappels} rappel{rappels > 1 ? "s" : ""} dû{rappels > 1 ? "s" : ""}</div>}
        {cma > 0 && <div>{cma} dossier{cma > 1 ? "s" : ""} CMA incomplet{cma > 1 ? "s" : ""}</div>}
      </TooltipContent>
    </Tooltip>
  );
}
