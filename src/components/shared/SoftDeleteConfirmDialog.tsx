import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, AlertTriangle, Info } from "lucide-react";
import { useDeleteImpact } from "@/hooks/useSoftDelete";

interface ImpactLine {
  label: string;
  count: number;
}

interface SoftDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => void;
  isPending?: boolean;
  /** The type of entity being deleted */
  entityType: string;
  /** Human-readable label, e.g. "Session mars soir 2026" */
  entityLabel: string;
  /** Table name for impact check */
  tableName?: string;
  /** Record id for impact check */
  recordId?: string;
  /** Require typing entity name to confirm (for sensitive entities) */
  requireTypedConfirmation?: boolean;
  /** Allow specifying a reason */
  showReasonField?: boolean;
}

const entityTypeLabels: Record<string, string> = {
  sessions: "la session",
  contacts: "l'apprenant",
  prospects: "le prospect",
  factures: "la facture",
  devis: "le devis",
  paiements: "le paiement",
  contact_documents: "le document",
  session_inscriptions: "l'inscription",
  catalogue_formations: "la formation",
  email_templates: "le modèle email",
};

const impactLabels: Record<string, string> = {
  inscriptions: "Inscriptions liées",
  emargements: "Émargements liés",
  factures: "Factures liées",
  documents: "Documents liés",
  paiements: "Paiements liés",
};

export function SoftDeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  entityType,
  entityLabel,
  tableName,
  recordId,
  requireTypedConfirmation = false,
  showReasonField = false,
}: SoftDeleteConfirmDialogProps) {
  const [typedName, setTypedName] = useState("");
  const [reason, setReason] = useState("");
  const deleteImpact = useDeleteImpact();

  useEffect(() => {
    if (open && tableName && recordId) {
      deleteImpact.mutate({ table: tableName, id: recordId });
    }
    if (!open) {
      setTypedName("");
      setReason("");
    }
  }, [open, tableName, recordId]);

  const impacts: ImpactLine[] = [];
  if (deleteImpact.data && typeof deleteImpact.data === "object") {
    Object.entries(deleteImpact.data).forEach(([key, value]) => {
      if (typeof value === "number" && value > 0) {
        impacts.push({ label: impactLabels[key] || key, count: value });
      }
    });
  }

  const typeLabel = entityTypeLabels[entityType] || "l'élément";
  const canConfirm = requireTypedConfirmation
    ? typedName.trim().toLowerCase() === entityLabel.trim().toLowerCase()
    : true;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Envoyer à la corbeille
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Vous êtes sur le point d'envoyer {typeLabel}{" "}
                <span className="font-semibold text-foreground">
                  « {entityLabel} »
                </span>{" "}
                dans la corbeille.
              </p>

              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  L'élément ne sera pas supprimé définitivement. Vous pourrez le
                  restaurer depuis la corbeille à tout moment.
                </p>
              </div>

              {/* Impact preview */}
              {impacts.length > 0 && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-xs font-medium text-foreground">
                      Éléments liés qui seront aussi envoyés à la corbeille :
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {impacts.map((imp) => (
                      <Badge key={imp.label} variant="secondary" className="text-xs">
                        {imp.count} {imp.label.toLowerCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {deleteImpact.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyse des dépendances...
                </div>
              )}

              {/* Reason field */}
              {showReasonField && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Raison (optionnel)
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Pourquoi cet élément est-il supprimé ?"
                    className="h-16 text-sm"
                  />
                </div>
              )}

              {/* Typed confirmation */}
              {requireTypedConfirmation && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Tapez{" "}
                    <span className="font-bold text-destructive">
                      {entityLabel}
                    </span>{" "}
                    pour confirmer
                  </label>
                  <Input
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder={entityLabel}
                    className="text-sm"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!canConfirm || isPending}
            onClick={() => onConfirm(reason || undefined)}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Envoyer à la corbeille
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
