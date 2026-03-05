import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Award,
  Star,
  FileDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionQualiopi } from "@/hooks/useSessionQualiopi";

interface SessionClosureWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onSendDocuments?: (scope?: string) => void;
  onSendEmail?: (template?: string) => void;
  onOpenPackAudit?: () => void;
}

type WizardStep = "attestations" | "satisfaction" | "export";

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "attestations", label: "Attestations", icon: Award },
  { key: "satisfaction", label: "Enquête satisfaction", icon: Star },
  { key: "export", label: "Export Pack Audit", icon: FileDown },
];

export function SessionClosureWizard({
  open,
  onOpenChange,
  sessionId,
  onSendDocuments,
  onSendEmail,
  onOpenPackAudit,
}: SessionClosureWizardProps) {
  const { data: qualiopi } = useSessionQualiopi(sessionId);
  const [currentStep, setCurrentStep] = useState<WizardStep>("attestations");

  const criteria = qualiopi?.criteria || [];
  const attestation = criteria.find(c => c.id === "attestations");
  const satisfaction = criteria.find(c => c.id === "satisfaction");

  const attestationDone = attestation?.status === "conforme" || attestation?.status === "na";
  const satisfactionDone = satisfaction?.status === "conforme" || satisfaction?.status === "na";

  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  const handleNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].key);
    }
  };

  const handleAction = () => {
    switch (currentStep) {
      case "attestations":
        onSendDocuments?.("attestation");
        break;
      case "satisfaction":
        onSendEmail?.("satisfaction");
        break;
      case "export":
        onOpenPackAudit?.();
        onOpenChange(false);
        break;
    }
  };

  const getStepStatus = (key: WizardStep) => {
    if (key === "attestations") return attestationDone;
    if (key === "satisfaction") return satisfactionDone;
    return false; // export is always actionable
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Clôture de session — Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 justify-center py-2">
          {STEPS.map((step, i) => {
            const done = getStepStatus(step.key);
            const isCurrent = step.key === currentStep;
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentStep(step.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    isCurrent ? "bg-primary/10 text-primary border border-primary/30" :
                    done ? "bg-success/10 text-success" :
                    "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" />
                  )}
                  {step.label}
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* Current step content */}
        <div className="p-4 rounded-lg border bg-card space-y-3">
          {currentStep === "attestations" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Attestations de formation</p>
                <Badge variant="outline" className={cn("text-[10px]",
                  attestationDone ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  {attestationDone ? "✅ Fait" : "⚠️ À faire"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {attestation?.detail || "Émettre et envoyer les attestations de fin de formation à tous les stagiaires."}
              </p>
              {!attestationDone && (
                <Button size="sm" className="w-full" onClick={handleAction}>
                  <Award className="h-4 w-4 mr-2" />
                  Émettre attestations
                </Button>
              )}
            </>
          )}

          {currentStep === "satisfaction" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Enquête de satisfaction</p>
                <Badge variant="outline" className={cn("text-[10px]",
                  satisfactionDone ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  {satisfactionDone ? "✅ Fait" : "⚠️ À faire"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {satisfaction?.detail || "Envoyer les enquêtes de satisfaction et relancer les non-répondants."}
              </p>
              {!satisfactionDone && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleAction}>
                    <Star className="h-4 w-4 mr-2" />
                    {satisfaction?.status === "partiel" ? "Relancer" : "Envoyer enquête"}
                  </Button>
                </div>
              )}
            </>
          )}

          {currentStep === "export" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Export Pack Audit</p>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                  Disponible
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Générer le pack audit complet (CSV détaillé + rapport PDF 1 page) pour archivage et audit.
              </p>
              <Button size="sm" className="w-full" onClick={handleAction}>
                <FileDown className="h-4 w-4 mr-2" />
                Exporter Pack Audit
              </Button>
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {currentIndex < STEPS.length - 1 && (
            <Button variant="ghost" onClick={handleNext}>
              Étape suivante <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
