import { Archive, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SmartOFHistoricalBannerProps {
  importSource?: string | null;
}

/**
 * Bandeau d'avertissement affiché en haut de la fiche d'un contact
 * marqué `is_historical_import = true` (typiquement import SmartOF).
 *
 * Garde-fou : la fiche reste consultable, les actions restent disponibles,
 * mais le contact est exclu des KPI opérationnels et son `statut_apprenant`
 * n'est jamais modifié automatiquement.
 */
export function SmartOFHistoricalBanner({ importSource }: SmartOFHistoricalBannerProps) {
  const sourceLabel = importSource && importSource.toLowerCase().includes("smartof")
    ? "SmartOF"
    : importSource || "externe";

  return (
    <div className="mx-3 sm:mx-5 mt-2 flex items-center gap-2 rounded-md border border-muted bg-muted/40 px-3 py-2 text-xs">
      <Archive className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-foreground">
        <span className="font-medium">Import historique {sourceLabel}</span>
        {" — "}fiche consultable, non comptée dans les KPI opérationnels.
      </span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground ml-auto cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px]">
            <p className="text-xs">
              Ce contact a été importé en tant qu'historique. Les actions
              (génération doc, paiement, inscription) restent possibles mais
              la fiche n'apparaît pas dans les apprenants actifs.
              Le statut apprenant n'est jamais modifié automatiquement.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
