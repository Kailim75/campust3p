import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Receipt, Calendar, AlertCircle, Euro } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type FactureStatut = "brouillon" | "emise" | "payee" | "partiel" | "impayee" | "annulee";
type FinancementType = "personnel" | "entreprise" | "cpf" | "opco";

interface Facture {
  id: string;
  numero_facture: string;
  montant_total: number;
  total_paye: number;
  statut: FactureStatut;
  type_financement: FinancementType;
  date_emission?: string | null;
  date_echeance?: string | null;
}

interface ContactFacturesTabProps {
  factures: Facture[];
  isLoading: boolean;
}

const statutConfig: Record<FactureStatut, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  emise: { label: "Émise", class: "bg-info/10 text-info" },
  payee: { label: "Payée", class: "bg-success text-success-foreground" },
  partiel: { label: "Partiel", class: "bg-warning text-warning-foreground" },
  impayee: { label: "Impayée", class: "bg-destructive text-destructive-foreground" },
  annulee: { label: "Annulée", class: "bg-muted text-muted-foreground" },
};

const financementLabels: Record<FinancementType, string> = {
  personnel: "Personnel",
  entreprise: "Entreprise",
  cpf: "CPF",
  opco: "OPCO",
};

export function ContactFacturesTab({ factures, isLoading }: ContactFacturesTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (factures.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucune facture</p>
      </div>
    );
  }

  const totalFacture = factures.reduce((sum, f) => sum + Number(f.montant_total), 0);
  const totalEncaisse = factures.reduce((sum, f) => sum + f.total_paye, 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Total facturé</p>
          <p className="text-lg font-bold">
            {totalFacture.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
          </p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Encaissé</p>
          <p className="text-lg font-bold text-success">
            {totalEncaisse.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
          </p>
        </div>
      </div>

      {/* Factures list */}
      {factures.map((facture) => {
        const paidPercentage = (facture.total_paye / Number(facture.montant_total)) * 100;
        const montantRestant = Number(facture.montant_total) - facture.total_paye;

        return (
          <div key={facture.id} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-sm font-medium">{facture.numero_facture}</p>
                <p className="text-xs text-muted-foreground">
                  {financementLabels[facture.type_financement]}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn("text-xs", statutConfig[facture.statut]?.class)}
              >
                {statutConfig[facture.statut]?.label}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payé</span>
                <span className="font-medium">
                  {facture.total_paye.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€ / {Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    paidPercentage >= 100 ? "bg-success" : paidPercentage > 0 ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                />
              </div>
            </div>

            {montantRestant > 0 && (
              <p className="text-xs text-destructive">
                Reste : {montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {facture.date_emission && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(facture.date_emission), "dd/MM/yyyy")}
                </span>
              )}
              {facture.date_echeance && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Éch. {format(new Date(facture.date_echeance), "dd/MM/yyyy")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}