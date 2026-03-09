import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, AlertTriangle, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useContractQualification,
  useQualifyContractFrame,
  type ContractDocumentType,
  type ContractFrameStatus,
} from "@/hooks/useContractQualification";

interface ContractQualificationBadgeProps {
  inscriptionId: string | null;
  /** Compact mode for lists */
  compact?: boolean;
  /** Show qualify CTA when a_qualifier */
  showAction?: boolean;
}

const STATUS_CONFIG: Record<ContractFrameStatus, {
  label: string;
  className: string;
  icon: typeof FileText;
}> = {
  qualifie: {
    label: "Qualifié",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    icon: CheckCircle2,
  },
  auto_detecte: {
    label: "Auto-détecté",
    className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    icon: CheckCircle2,
  },
  a_qualifier: {
    label: "À qualifier",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    icon: AlertTriangle,
  },
};

const TYPE_LABELS: Record<ContractDocumentType, string> = {
  contrat: "Contrat de formation",
  convention: "Convention de formation",
};

export function ContractQualificationBadge({
  inscriptionId,
  compact = false,
  showAction = true,
}: ContractQualificationBadgeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useContractQualification({ inscriptionId });
  const qualifyMutation = useQualifyContractFrame();

  if (isLoading || !data) return null;

  const statusConfig = STATUS_CONFIG[data.contractFrameStatus];
  const StatusIcon = statusConfig.icon;

  const handleQualify = async (type: ContractDocumentType) => {
    if (!inscriptionId) return;
    await qualifyMutation.mutateAsync({
      inscriptionId,
      contractDocumentType: type,
      source: "manual",
    });
    setDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("text-xs gap-1", statusConfig.className)}>
          <StatusIcon className="h-3 w-3" />
          {data.contractDocumentType
            ? TYPE_LABELS[data.contractDocumentType]
            : statusConfig.label}
        </Badge>

        {!compact && data.contractFrameStatus !== "a_qualifier" && data.qualificationSource && (
          <span className="text-[10px] text-muted-foreground">
            {data.qualificationSource === "manual" ? "Manuel" : "Auto"}
          </span>
        )}

        {showAction && data.contractFrameStatus === "a_qualifier" && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
            onClick={() => setDialogOpen(true)}
          >
            <HelpCircle className="h-3 w-3" />
            Qualifier
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Qualifier le cadre contractuel
            </DialogTitle>
            <DialogDescription>
              Déterminez si ce dossier relève d'un contrat ou d'une convention de formation.
            </DialogDescription>
          </DialogHeader>

          {data.autoDetection.certainty === "certain" && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-sm">
                <strong>Suggestion auto :</strong> {data.autoDetection.reason}
                <br />
                <span className="text-xs text-muted-foreground">
                  {data.autoDetection.legalBasis}
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 py-2">
            <button
              onClick={() => handleQualify("contrat")}
              disabled={qualifyMutation.isPending}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
                "hover:bg-primary/5 hover:border-primary/30",
                data.autoDetection.recommendedType === "contrat" && "border-primary/40 bg-primary/5"
              )}
            >
              <span className="font-medium text-sm">Contrat de formation</span>
              <span className="text-xs text-muted-foreground">
                Personne physique finançant elle-même sa formation
              </span>
              <span className="text-[10px] text-muted-foreground/70 mt-1">
                Art. L6353-3 Code du travail
              </span>
            </button>

            <button
              onClick={() => handleQualify("convention")}
              disabled={qualifyMutation.isPending}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
                "hover:bg-accent/5 hover:border-accent/30",
                data.autoDetection.recommendedType === "convention" && "border-accent/40 bg-accent/5"
              )}
            >
              <span className="font-medium text-sm">Convention de formation</span>
              <span className="text-xs text-muted-foreground">
                Financement par entreprise, OPCO, CPF ou autre organisme
              </span>
              <span className="text-[10px] text-muted-foreground/70 mt-1">
                Art. L6353-1 Code du travail
              </span>
            </button>
          </div>

          {qualifyMutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Qualification en cours...
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
