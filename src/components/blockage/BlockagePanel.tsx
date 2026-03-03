import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, AlertTriangle, Info, Wrench, ArrowRight, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockageDiagnostic, type Blockage } from "@/hooks/useBlockageDiagnostic";

interface BlockagePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: string) => void;
}

const SEVERITY_CONFIG = {
  BLOCKER: {
    icon: ShieldAlert,
    label: "Critique",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
    dotClass: "bg-destructive",
  },
  WARNING: {
    icon: AlertTriangle,
    label: "Avertissement",
    badgeClass: "bg-warning/15 text-warning border-warning/30",
    dotClass: "bg-warning",
  },
  INFO: {
    icon: Info,
    label: "Info",
    badgeClass: "bg-info/15 text-info border-info/30",
    dotClass: "bg-info",
  },
} as const;

function BlockageCard({
  blockage,
  onAction,
}: {
  blockage: Blockage;
  onAction: () => void;
}) {
  const config = SEVERITY_CONFIG[blockage.severity];
  const Icon = config.icon;

  return (
    <div className="p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors space-y-2">
      <div className="flex items-start gap-2">
        <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", config.dotClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-[10px] shrink-0", config.badgeClass)}>
              {config.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              Score: {blockage.priority_score}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground leading-tight">
            {blockage.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {blockage.explanation}
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={blockage.severity === "BLOCKER" ? "default" : "outline"}
          className="h-7 text-xs gap-1"
          onClick={onAction}
        >
          <Wrench className="h-3 w-3" />
          {blockage.action_label}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function BlockagePanel({ open, onOpenChange, onNavigate }: BlockagePanelProps) {
  const { data, isLoading } = useBlockageDiagnostic();

  const handleAction = (blockage: Blockage) => {
    onOpenChange(false);
    onNavigate(blockage.action_route);
  };

  const blockages = data?.blockages || [];
  const counts = data?.counts || { blockers: 0, warnings: 0, infos: 0, total: 0 };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileWarning className="h-5 w-5 text-destructive" />
            Diagnostic Anti-Blocage
          </SheetTitle>
          <div className="flex gap-2">
            {counts.blockers > 0 && (
              <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
                {counts.blockers} critique{counts.blockers > 1 ? "s" : ""}
              </Badge>
            )}
            {counts.warnings > 0 && (
              <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 text-xs">
                {counts.warnings} avertissement{counts.warnings > 1 ? "s" : ""}
              </Badge>
            )}
            {counts.infos > 0 && (
              <Badge variant="outline" className="bg-info/15 text-info border-info/30 text-xs">
                {counts.infos} info{counts.infos > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Analyse en cours…</p>
            ) : blockages.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="text-3xl">✅</div>
                <p className="text-sm font-medium text-foreground">Aucun blocage détecté</p>
                <p className="text-xs text-muted-foreground">Votre CRM est opérationnel.</p>
              </div>
            ) : (
              blockages.map((b, i) => (
                <BlockageCard key={`${b.code}-${b.entity_id}-${i}`} blockage={b} onAction={() => handleAction(b)} />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
