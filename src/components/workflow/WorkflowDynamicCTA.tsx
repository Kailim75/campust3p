import { Button } from "@/components/ui/button";
import {
  UserCheck, FolderOpen, GraduationCap, FileText, CreditCard, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep =
  | "convert"
  | "complete-profile"
  | "assign-session"
  | "generate-invoice"
  | "record-payment"
  | "finalized";

interface WorkflowDynamicCTAProps {
  currentStep: WorkflowStep;
  onAction: () => void;
}

const stepConfig: Record<WorkflowStep, {
  label: string;
  icon: typeof UserCheck;
  variant: "default" | "outline" | "secondary";
  className: string;
}> = {
  convert: {
    label: "Convertir en stagiaire",
    icon: UserCheck,
    variant: "default",
    className: "bg-primary hover:bg-primary/90",
  },
  "complete-profile": {
    label: "Compléter le dossier",
    icon: FolderOpen,
    variant: "default",
    className: "bg-warning text-warning-foreground hover:bg-warning/90",
  },
  "assign-session": {
    label: "Assigner à une session",
    icon: GraduationCap,
    variant: "default",
    className: "bg-primary hover:bg-primary/90",
  },
  "generate-invoice": {
    label: "Générer facture",
    icon: FileText,
    variant: "default",
    className: "bg-primary hover:bg-primary/90",
  },
  "record-payment": {
    label: "Enregistrer paiement",
    icon: CreditCard,
    variant: "default",
    className: "bg-primary hover:bg-primary/90",
  },
  finalized: {
    label: "Dossier finalisé",
    icon: CheckCircle2,
    variant: "outline",
    className: "border-success/30 text-success hover:bg-success/5 cursor-default",
  },
};

export function WorkflowDynamicCTA({ currentStep, onAction }: WorkflowDynamicCTAProps) {
  const config = stepConfig[currentStep];
  const Icon = config.icon;
  const isFinalized = currentStep === "finalized";

  return (
    <Button
      size="sm"
      variant={config.variant}
      className={cn("w-full h-9 text-[13px] font-semibold gap-2 transition-all", config.className)}
      onClick={isFinalized ? undefined : onAction}
      disabled={isFinalized}
    >
      <Icon className="h-4 w-4" />
      {config.label}
    </Button>
  );
}
