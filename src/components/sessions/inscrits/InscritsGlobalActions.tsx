import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FileDown, FileText, Mail, Send, Award, CheckSquare, Loader2,
} from "lucide-react";
import type { DocumentType } from "@/hooks/useDocumentGenerator";
import type { EmailRecipient } from "@/components/email/EmailComposerModal";

/* ── Global actions (all inscrits) ── */

interface InscritsGlobalActionsProps {
  totalInscrits: number;
  emailsCount: number;
  onPreviewBulk: (type: DocumentType) => void;
  onOpenDocSendAll: () => void;
}

export function InscritsGlobalActions({ totalInscrits, emailsCount, onPreviewBulk, onOpenDocSendAll }: InscritsGlobalActionsProps) {
  if (totalInscrits === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Générer documents
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onPreviewBulk("convocation")}>
            <Send className="h-4 w-4 mr-2" /> Convocations ({totalInscrits})
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPreviewBulk("convention")}>
            <FileText className="h-4 w-4 mr-2" /> Conventions ({totalInscrits})
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPreviewBulk("attestation")}>
            <Award className="h-4 w-4 mr-2" /> Attestations ({totalInscrits})
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="outline" onClick={onOpenDocSendAll} disabled={emailsCount === 0}>
        <Mail className="h-4 w-4 mr-2" />
        Envoyer documents ({emailsCount})
      </Button>
    </div>
  );
}

/* ── Selection actions bar ── */

interface InscritsSelectionActionsProps {
  selectedCount: number;
  isEmargement: boolean;
  isEnvoi: boolean;
  onEmarger: () => void;
  onTracerEnvoi: () => void;
  onOpenDocSendSelected: () => void;
  onEmailConvocation: () => void;
  onEmailRelanceCma: () => void;
  onEmailFelicTheorie: () => void;
  onEmailFelicPratique: () => void;
}

export function InscritsSelectionActions({
  selectedCount,
  isEmargement,
  isEnvoi,
  onEmarger,
  onTracerEnvoi,
  onOpenDocSendSelected,
  onEmailConvocation,
  onEmailRelanceCma,
  onEmailFelicTheorie,
  onEmailFelicPratique,
}: InscritsSelectionActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
      <span className="text-sm text-muted-foreground">{selectedCount} sélectionné(s)</span>
      <Button size="sm" variant="outline" onClick={onEmarger} disabled={isEmargement}>
        {isEmargement && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        <CheckSquare className="h-3 w-3 mr-1" /> Émarger
      </Button>
      <Button size="sm" variant="outline" onClick={onTracerEnvoi} disabled={isEnvoi}>
        <Send className="h-3 w-3 mr-1" /> Tracer envoi
      </Button>
      <Button size="sm" variant="outline" onClick={onOpenDocSendSelected}>
        <FileDown className="h-3 w-3 mr-1" /> Envoyer documents
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            <Mail className="h-3 w-3 mr-1" /> Actions email
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onEmailConvocation}>
            <Send className="h-4 w-4 mr-2" /> Envoyer Convocation
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEmailRelanceCma}>
            <FileText className="h-4 w-4 mr-2" /> Relancer CMA
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEmailFelicTheorie}>
            <Award className="h-4 w-4 mr-2" /> Félicitations théorie
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEmailFelicPratique}>
            <Award className="h-4 w-4 mr-2" /> Félicitations pratique + Carte Pro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
