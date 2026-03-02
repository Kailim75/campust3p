import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, FolderOpen, LayoutDashboard, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  sessionName: string;
  onGenerateFacture: () => void;
  onAddDocuments: () => void;
  onReturnDashboard: () => void;
}

export function PostAssignmentDialog({
  open,
  onOpenChange,
  contactName,
  sessionName,
  onGenerateFacture,
  onAddDocuments,
  onReturnDashboard,
}: PostAssignmentDialogProps) {
  const actions = [
    {
      id: "facture",
      icon: FileText,
      label: "Générer la facture",
      description: "Créer la facture pré-remplie pour cette inscription",
      primary: true,
      onClick: onGenerateFacture,
    },
    {
      id: "documents",
      icon: FolderOpen,
      label: "Ajouter des documents",
      description: "Compléter le dossier administratif",
      primary: false,
      onClick: onAddDocuments,
    },
    {
      id: "dashboard",
      icon: LayoutDashboard,
      label: "Retour au dashboard",
      description: "Revenir à la vue d'ensemble",
      primary: false,
      onClick: onReturnDashboard,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 p-3 rounded-full bg-success/10 w-fit">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <DialogTitle className="text-xl">Inscription confirmée !</DialogTitle>
          <DialogDescription className="text-base">
            <span className="font-medium text-foreground">{contactName}</span> est inscrit à{" "}
            <span className="font-medium text-foreground">{sessionName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center mb-3">
            Que faire ensuite ?
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
      </DialogContent>
    </Dialog>
  );
}
