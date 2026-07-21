import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { creerFactureExpress, listerInscritsSansFacture } from "@/lib/facture-express";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileDown,
  FileText,
  FileSignature,
  Award,
  CreditCard,
  ClipboardList,
  Send,
  Zap,
} from "lucide-react";
import { SessionFinancialSummary } from "./SessionFinancialSummary";
import type { DocumentType } from "@/hooks/useDocumentGenerator";

interface SessionFinancesTabContentProps {
  sessionId: string;
  onGenerateBulkDocuments: (type: DocumentType) => void;
  onGenerateBatchChevalets: () => void;
  onGenerateBatchPedagogicalDocs: (docType: "entree_sortie" | "test_positionnement") => void;
  isBatchCheveletsPending: boolean;
  isBatchPedagogicalPending: boolean;
}

export function SessionFinancesTabContent({
  sessionId,
  onGenerateBulkDocuments,
  onGenerateBatchChevalets,
  onGenerateBatchPedagogicalDocs,
  isBatchCheveletsPending,
  isBatchPedagogicalPending,
}: SessionFinancesTabContentProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [facturationPending, setFacturationPending] = useState(false);

  // Facturation groupée (règles du 21/07) : facture chaque inscrit sans
  // facture au prix de la session, échéance = date de début. Sans envoi
  // d'email en lot — les envois se font depuis chaque fiche.
  const { data: aFacturer = [] } = useQuery({
    queryKey: ["session-inscrits-sans-facture", sessionId],
    queryFn: () => listerInscritsSansFacture(sessionId),
  });
  const { data: sessionInfo } = useQuery({
    queryKey: ["session-facturation-info", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("nom, prix, date_debut")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const facturerTous = async () => {
    if (!sessionInfo?.prix) { toast.error("La session n'a pas de prix renseigné"); return; }
    setFacturationPending(true);
    let ok = 0;
    const echecs: string[] = [];
    for (const inscrit of aFacturer) {
      try {
        await creerFactureExpress({
          contactId: inscrit.contactId,
          sessionInscriptionId: inscrit.sessionInscriptionId,
          montant: Number(sessionInfo.prix),
          description: sessionInfo.nom,
          dateEcheance: sessionInfo.date_debut || null,
        });
        ok++;
      } catch {
        echecs.push(`${inscrit.prenom} ${inscrit.nom}`);
      }
    }
    setFacturationPending(false);
    setConfirmOpen(false);
    queryClient.invalidateQueries({ queryKey: ["factures"] });
    queryClient.invalidateQueries({ queryKey: ["session-inscrits-sans-facture", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
    if (echecs.length === 0) {
      toast.success(`${ok} facture${ok > 1 ? "s" : ""} créée${ok > 1 ? "s" : ""}`);
    } else {
      toast.warning(`${ok} créée${ok > 1 ? "s" : ""}, ${echecs.length} en échec`, { description: echecs.join(", ") });
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <SessionFinancialSummary sessionId={sessionId} />

      {aFacturer.length > 0 && (
        <Button className="w-full justify-start" onClick={() => setConfirmOpen(true)} disabled={facturationPending}>
          <Zap className="h-4 w-4 mr-2" />
          Facturer les non-facturés ({aFacturer.length})
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Facturer {aFacturer.length} inscrit{aFacturer.length > 1 ? "s" : ""} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une facture de {sessionInfo?.prix != null ? Number(sessionInfo.prix).toLocaleString("fr-FR") : "—"} € sera créée pour chacun
              ({aFacturer.map((i) => `${i.prenom} ${i.nom}`).join(", ")}),
              échéance au début de la session. Aucun email n'est envoyé — les
              envois se font ensuite depuis chaque fiche.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={facturationPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); facturerTous(); }} disabled={facturationPending}>
              {facturationPending ? "Facturation…" : "Créer les factures"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Separator />
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Générer les documents financiers</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <FileDown className="h-4 w-4 mr-2" />
              Générer les documents
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem onClick={() => onGenerateBulkDocuments("convocation")}>
              <Send className="h-4 w-4 mr-2" />
              Toutes les convocations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGenerateBulkDocuments("convention")}>
              <FileText className="h-4 w-4 mr-2" />
              Toutes les conventions (tiers payeur)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGenerateBulkDocuments("contrat")}>
              <FileSignature className="h-4 w-4 mr-2" />
              Tous les contrats (paiement direct)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGenerateBulkDocuments("attestation")}>
              <Award className="h-4 w-4 mr-2" />
              Toutes les attestations
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onGenerateBatchChevalets}
              disabled={isBatchCheveletsPending}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Tous les chevalets
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onGenerateBatchPedagogicalDocs("entree_sortie")}
              disabled={isBatchPedagogicalPending}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Fiches entrée/sortie
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onGenerateBatchPedagogicalDocs("test_positionnement")}
              disabled={isBatchPedagogicalPending}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Tests de positionnement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
