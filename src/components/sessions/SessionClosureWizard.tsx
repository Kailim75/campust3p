import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Award,
  Star,
  FileDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionQualiopi } from "@/hooks/useSessionQualiopi";
import { useCurrentUserRole } from "@/hooks/useUsers";

interface SessionClosureWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onSendDocuments?: (scope?: string) => void;
  onSendEmail?: (template?: string) => void;
  onOpenPackAudit?: () => void;
}

type WizardStep = "prechecks" | "attestations" | "satisfaction" | "export";

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "prechecks", label: "Préchecks", icon: ShieldCheck },
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
  const { data: role } = useCurrentUserRole();
  const [currentStep, setCurrentStep] = useState<WizardStep>("prechecks");
  const [adminConfirmed, setAdminConfirmed] = useState(false);
  const [justification, setJustification] = useState("");

  const criteria = qualiopi?.criteria || [];
  const attestation = criteria.find(c => c.id === "attestations");
  const satisfaction = criteria.find(c => c.id === "satisfaction");
  const emargement = criteria.find(c => c.id === "emargements" || c.id === "emargement");
  const paiements = criteria.find(c => c.id === "paiements");

  const attestationDone = attestation?.status === "conforme" || attestation?.status === "na";
  const satisfactionDone = satisfaction?.status === "conforme" || satisfaction?.status === "na";
  const emargementBlocking = emargement?.required && emargement?.status === "non_conforme";
  const paiementsWarning = paiements?.status === "non_conforme" || paiements?.status === "partiel";
  const attestationsWarning = !attestationDone;
  const satisfactionWarning = !satisfactionDone;

  const isAdmin = role === "admin" || role === "super_admin";

  // Précheck pass condition : émargement obligatoire OK, et si alertes non bloquantes
  // → admin confirme + justification renseignée si besoin.
  const hasAnyWarning = paiementsWarning || attestationsWarning || satisfactionWarning;
  const precheckPass = useMemo(() => {
    if (emargementBlocking) return false;
    if (!isAdmin) return false;
    if (!adminConfirmed) return false;
    if (hasAnyWarning && justification.trim().length < 5) return false;
    return true;
  }, [emargementBlocking, isAdmin, adminConfirmed, hasAnyWarning, justification]);

  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  const handleNext = () => {
    if (currentStep === "prechecks" && !precheckPass) return;
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
    if (key === "prechecks") return precheckPass;
    if (key === "attestations") return attestationDone;
    if (key === "satisfaction") return satisfactionDone;
    return false;
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
          {currentStep === "prechecks" && (
            <>
              <p className="text-sm font-medium">Vérifications avant clôture</p>

              {/* Bloquant : émargements obligatoires */}
              <div className={cn(
                "p-2.5 rounded-md border text-xs flex items-start gap-2",
                emargementBlocking
                  ? "bg-destructive/5 border-destructive/30 text-destructive"
                  : "bg-success/5 border-success/30 text-success"
              )}>
                {emargementBlocking ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold">Émargements obligatoires</p>
                  <p className="text-[11px] opacity-90">
                    {emargementBlocking
                      ? "Bloquant : feuilles d'émargement manquantes. Compléter avant clôture."
                      : (emargement?.detail || "Émargement conforme")}
                  </p>
                </div>
              </div>

              {/* Non bloquants */}
              {paiementsWarning && (
                <div className="p-2.5 rounded-md border border-warning/30 bg-warning/5 text-xs flex items-start gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Paiements non soldés — justifier ci-dessous.</p>
                </div>
              )}
              {attestationsWarning && (
                <div className="p-2.5 rounded-md border border-warning/30 bg-warning/5 text-xs flex items-start gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Attestations non générées — sera proposée à l'étape suivante.</p>
                </div>
              )}
              {satisfactionWarning && (
                <div className="p-2.5 rounded-md border border-warning/30 bg-warning/5 text-xs flex items-start gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Enquête de satisfaction non envoyée.</p>
                </div>
              )}

              {hasAnyWarning && !emargementBlocking && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Justification (obligatoire pour passer outre les alertes)
                  </label>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Ex. paiement OPCO en attente, attestations à générer ensuite…"
                    className="text-xs min-h-16"
                  />
                </div>
              )}

              {/* Confirmation rôle admin */}
              {!emargementBlocking && (
                <label className={cn(
                  "flex items-start gap-2 p-2.5 rounded-md border cursor-pointer",
                  isAdmin ? "border-primary/30 bg-primary/5" : "border-muted bg-muted/30 opacity-60 cursor-not-allowed"
                )}>
                  <Checkbox
                    checked={adminConfirmed}
                    onCheckedChange={(v) => setAdminConfirmed(v === true)}
                    disabled={!isAdmin}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-medium">
                      Je confirme la clôture en tant qu'administrateur
                    </p>
                    {!isAdmin && (
                      <p className="text-[10px] text-muted-foreground">
                        Seul un administrateur peut valider la clôture.
                      </p>
                    )}
                  </div>
                </label>
              )}
            </>
          )}

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
