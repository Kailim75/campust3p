import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  return (
    <div className="space-y-4 pt-4">
      <SessionFinancialSummary sessionId={sessionId} />

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
