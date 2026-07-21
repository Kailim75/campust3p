import { Button } from "@/components/ui/button";
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
import type { DocumentType } from "@/hooks/useDocumentGenerator";

/**
 * Menu de génération en lot des documents de session. Historiquement rangé
 * dans l'onglet Finances (audit du 21/07/2026 : convocations et fiches
 * pédagogiques n'y avaient rien à faire) — déplacé dans l'onglet Documents.
 */
interface SessionDocumentsGenerateMenuProps {
  onGenerateBulkDocuments: (type: DocumentType) => void;
  onGenerateBatchChevalets: () => void;
  onGenerateBatchPedagogicalDocs: (docType: "entree_sortie" | "test_positionnement") => void;
  isBatchCheveletsPending: boolean;
  isBatchPedagogicalPending: boolean;
}

export function SessionDocumentsGenerateMenu({
  onGenerateBulkDocuments,
  onGenerateBatchChevalets,
  onGenerateBatchPedagogicalDocs,
  isBatchCheveletsPending,
  isBatchPedagogicalPending,
}: SessionDocumentsGenerateMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <FileDown className="h-4 w-4 mr-2" />
          Générer les documents en lot
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
        <DropdownMenuItem onClick={onGenerateBatchChevalets} disabled={isBatchCheveletsPending}>
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
  );
}
