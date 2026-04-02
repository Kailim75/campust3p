import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText } from "lucide-react";
import { FactureWithDetails } from "@/hooks/useFactures";
import { cn } from "@/lib/utils";

interface BulkEmitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brouillons: FactureWithDetails[];
  onConfirm: () => void;
  isPending: boolean;
}

export function BulkEmitConfirmDialog({
  open,
  onOpenChange,
  brouillons,
  onConfirm,
  isPending,
}: BulkEmitConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const isConfirmed = confirmText === "CONFIRMER";
  const needsConfirmText = brouillons.length >= 5;

  const totalMontant = brouillons.reduce((s, f) => s + Number(f.montant_total), 0);

  const handleConfirm = () => {
    if (needsConfirmText && !isConfirmed) return;
    onConfirm();
    setConfirmText("");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setConfirmText("");
    onOpenChange(v);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Émettre {brouillons.length} facture{brouillons.length > 1 ? "s" : ""} brouillon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Cette action va passer {brouillons.length} facture{brouillons.length > 1 ? "s" : ""} du statut
              {" "}<Badge variant="secondary" className="text-xs">Brouillon</Badge> au statut
              {" "}<Badge variant="secondary" className="bg-info/10 text-info text-xs">Émise</Badge>.
            </p>
            <p className="text-xs text-muted-foreground">
              Une fois émises, les factures deviennent visibles et ne peuvent plus être supprimées — uniquement annulées.
            </p>

            {/* Preview */}
            <div className="rounded-lg border bg-muted/30 max-h-[180px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="text-left p-2 font-medium">N° Facture</th>
                    <th className="text-left p-2 font-medium">Stagiaire</th>
                    <th className="text-right p-2 font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {brouillons.slice(0, 10).map((f) => (
                    <tr key={f.id} className="border-t border-border/50">
                      <td className="p-2 font-mono">{f.numero_facture}</td>
                      <td className="p-2 truncate max-w-[150px]">
                        {f.contact ? `${f.contact.prenom} ${f.contact.nom}` : "—"}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {Number(f.montant_total).toLocaleString("fr-FR")} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {brouillons.length > 10 && (
                <p className="text-[11px] text-center text-muted-foreground py-1.5 border-t">
                  … et {brouillons.length - 10} autre{brouillons.length - 10 > 1 ? "s" : ""} facture{brouillons.length - 10 > 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-muted-foreground">Montant total</span>
              <span className="font-bold">{totalMontant.toLocaleString("fr-FR")} €</span>
            </div>

            {/* Confirmation input for large batches */}
            {needsConfirmText && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-medium text-foreground">
                  Saisissez <span className="font-mono font-bold">CONFIRMER</span> pour valider
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="CONFIRMER"
                  className="font-mono h-9"
                  autoFocus
                />
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-medium">Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending || (needsConfirmText && !isConfirmed)}
            className={cn(
              "bg-warning text-warning-foreground hover:bg-warning/90",
              (isPending || (needsConfirmText && !isConfirmed)) && "opacity-50"
            )}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            {isPending ? "Émission…" : "Émettre les factures"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
