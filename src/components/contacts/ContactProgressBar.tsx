import { 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  User,
  FileText,
  Calendar,
  CreditCard,
  Award,
  GraduationCap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Contact } from "@/hooks/useContacts";

interface Step {
  id: string;
  label: string;
  icon: React.ElementType;
  isComplete: boolean;
  isBlocking?: boolean;
  tooltip?: string;
}

interface ContactProgressBarProps {
  contact: Contact;
  inscriptions: any[];
  documents: any[];
  factures: any[];
  examens?: { t3p: any[]; pratique: any[] };
}

export function ContactProgressBar({ 
  contact, 
  inscriptions, 
  documents, 
  factures,
  examens,
}: ContactProgressBarProps) {
  // Calculate step completion
  const hasRequiredDocs = documents.some(d => 
    d.type_document === "CNI" || d.type_document === "Passeport"
  );
  const hasPermis = !!contact.numero_permis;
  const isInscribed = inscriptions.length > 0;
  const hasPaidInvoice = factures.some(f => f.statut === "payee" || f.statut === "partiel");
  const hasPassedExam = examens?.t3p?.some(e => e.resultat === "admis") || 
                         examens?.pratique?.some(e => e.resultat === "admis");
  const hasCartePro = !!contact.numero_carte_professionnelle;

  const steps: Step[] = [
    {
      id: "profile",
      label: "Profil complet",
      icon: User,
      isComplete: !!(contact.email && contact.telephone && contact.date_naissance),
      tooltip: contact.email && contact.telephone 
        ? "Profil complété" 
        : "Email, téléphone et date de naissance requis",
    },
    {
      id: "documents",
      label: "Documents",
      icon: FileText,
      isComplete: hasRequiredDocs && hasPermis,
      isBlocking: !hasRequiredDocs,
      tooltip: hasRequiredDocs 
        ? "Documents validés" 
        : "CNI/Passeport et permis requis",
    },
    {
      id: "inscription",
      label: "Inscrit",
      icon: Calendar,
      isComplete: isInscribed,
      tooltip: isInscribed 
        ? `Inscrit à ${inscriptions.length} session(s)` 
        : "Aucune inscription à une session",
    },
    {
      id: "paiement",
      label: "Paiement",
      icon: CreditCard,
      isComplete: hasPaidInvoice,
      isBlocking: isInscribed && !hasPaidInvoice,
      tooltip: hasPaidInvoice 
        ? "Paiement effectué" 
        : "Aucun paiement enregistré",
    },
    {
      id: "examen",
      label: "Examen",
      icon: Award,
      isComplete: hasPassedExam,
      tooltip: hasPassedExam 
        ? "Examen réussi" 
        : "Aucun examen réussi",
    },
    {
      id: "carte_pro",
      label: "Carte pro",
      icon: GraduationCap,
      isComplete: hasCartePro,
      tooltip: hasCartePro 
        ? `Carte n°${contact.numero_carte_professionnelle}` 
        : "Carte professionnelle non obtenue",
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);
  const hasBlockingStep = steps.some(s => s.isBlocking);

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground tracking-tight">
            Progression du dossier
          </span>
          {hasBlockingStep && (
            <Badge variant="outline" className="text-warning border-warning/20 bg-warning/10 text-[11px] font-semibold">
              <AlertCircle className="h-3 w-3 mr-1" />
              Action requise
            </Badge>
          )}
        </div>
        <span className="text-lg font-bold font-mono text-primary tabular-nums">
          {progressPercent}%
        </span>
      </div>

      {/* Progress bar */}
      <Progress value={progressPercent} className="h-2.5 rounded-full" />

      {/* Steps */}
      <TooltipProvider>
        <div className="flex items-center justify-between pt-1">
          {steps.map((step, index) => {
            const Icon = step.isComplete ? CheckCircle2 : step.isBlocking ? AlertCircle : Circle;
            
            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1.5 cursor-help group">
                    <div className={cn(
                      "p-2 rounded-xl transition-all duration-150 group-hover:scale-110",
                      step.isComplete 
                        ? "bg-success/10" 
                        : step.isBlocking 
                          ? "bg-warning/10" 
                          : "bg-muted/60"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4",
                        step.isComplete 
                          ? "text-success" 
                          : step.isBlocking 
                            ? "text-warning" 
                            : "text-muted-foreground"
                      )} strokeWidth={step.isComplete ? 2.5 : 1.5} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold text-center max-w-[60px] leading-tight",
                      step.isComplete 
                        ? "text-success" 
                        : step.isBlocking 
                          ? "text-warning" 
                          : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{step.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
