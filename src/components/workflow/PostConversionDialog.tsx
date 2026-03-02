import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, GraduationCap, Bell, FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  onAssignSession: () => void;
  onPlanRappel: () => void;
  onCreateFacture: () => void;
}

export function PostConversionDialog({
  open,
  onOpenChange,
  contactName,
  onAssignSession,
  onPlanRappel,
  onCreateFacture,
}: PostConversionDialogProps) {
  const actions = [
    {
      id: "session",
      icon: GraduationCap,
      label: "Assigner à une session",
      description: "Inscrire directement à une formation disponible",
      primary: true,
      onClick: onAssignSession,
    },
    {
      id: "rappel",
      icon: Bell,
      label: "Planifier un rappel",
      description: "Programmer un suivi pour plus tard",
      primary: false,
      onClick: onPlanRappel,
    },
    {
      id: "facture",
      icon: FileText,
      label: "Créer une facture",
      description: "Générer la facture immédiatement",
      primary: false,
      onClick: onCreateFacture,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 p-3 rounded-full bg-success/10 w-fit">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <DialogTitle className="text-xl">Conversion réussie !</DialogTitle>
          <DialogDescription className="text-base">
            <span className="font-medium text-foreground">{contactName}</span> est maintenant un stagiaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center mb-3">
            Prochaine étape
          </p>

          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => {
                  onOpenChange(false);
                  action.onClick();
                }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group",
                  action.primary
                    ? "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40"
                    : "bg-card border-border hover:bg-muted/50 hover:border-border"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-lg flex-shrink-0",
                  action.primary ? "bg-primary/10" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    action.primary ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-semibold",
                    action.primary ? "text-primary" : "text-foreground"
                  )}>
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className={cn(
                  "h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  action.primary ? "text-primary" : "text-muted-foreground"
                )} />
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          className="w-full mt-2 text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          Retour à la liste
        </Button>
      </DialogContent>
    </Dialog>
  );
}
