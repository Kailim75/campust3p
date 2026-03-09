// ═══════════════════════════════════════════════════════════════
// BulkGenerationDialog — Secure progressive bulk generation
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, CheckCircle2, XCircle, Loader2, Play, Square, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SessionDocumentMatrixRow, DocumentWorkflowItem } from "@/lib/document-workflow/types";

interface BulkGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: SessionDocumentMatrixRow[];
  selectedContactIds: Set<string>;
  onGenerate: (contactId: string, item: DocumentWorkflowItem) => Promise<boolean>;
  onComplete: () => void;
}

interface BulkResult {
  contactId: string;
  contactName: string;
  documentType: string;
  templateName: string;
  success: boolean;
  error?: string;
}

type BulkPhase = "preview" | "running" | "done";

export function BulkGenerationDialog({
  open,
  onOpenChange,
  rows,
  selectedContactIds,
  onGenerate,
  onComplete,
}: BulkGenerationDialogProps) {
  const [phase, setPhase] = useState<BulkPhase>("preview");
  const [results, setResults] = useState<BulkResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const abortRef = useRef(false);

  // Filter selected rows
  const selectedRows = rows.filter(r => selectedContactIds.has(r.contactId));

  // Collect eligible items
  const eligibleItems: { row: SessionDocumentMatrixRow; item: DocumentWorkflowItem }[] = [];
  const blockedItems: { row: SessionDocumentMatrixRow; item: DocumentWorkflowItem }[] = [];

  for (const row of selectedRows) {
    for (const block of row.blocks) {
      for (const item of block.items) {
        if (item.businessStatus === "a_generer" && !item.isBlocked && item.templateId) {
          eligibleItems.push({ row, item });
        } else if (item.isBlocked && item.isRequired && item.businessStatus !== "genere") {
          blockedItems.push({ row, item });
        }
      }
    }
  }

  const totalEligible = eligibleItems.length;
  const progressPct = totalEligible > 0 ? Math.round((currentIndex / totalEligible) * 100) : 0;

  const handleStart = useCallback(async () => {
    if (totalEligible === 0) return;
    setPhase("running");
    setResults([]);
    setCurrentIndex(0);
    abortRef.current = false;

    const newResults: BulkResult[] = [];

    for (let i = 0; i < eligibleItems.length; i++) {
      if (abortRef.current) break;

      const { row, item } = eligibleItems[i];
      setCurrentIndex(i + 1);

      try {
        const success = await onGenerate(row.contactId, item);
        newResults.push({
          contactId: row.contactId,
          contactName: row.contactName,
          documentType: item.documentType,
          templateName: item.templateName,
          success,
        });
      } catch (err: any) {
        newResults.push({
          contactId: row.contactId,
          contactName: row.contactName,
          documentType: item.documentType,
          templateName: item.templateName,
          success: false,
          error: err?.message ?? "Erreur inconnue",
        });
      }

      setResults([...newResults]);

      // Small delay to avoid overwhelming the system
      if (i < eligibleItems.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    setPhase("done");
    const successes = newResults.filter(r => r.success).length;
    const failures = newResults.filter(r => !r.success).length;
    if (failures === 0) {
      toast.success(`${successes} document(s) généré(s) avec succès`);
    } else {
      toast.warning(`${successes} réussi(s), ${failures} échoué(s)`);
    }
  }, [eligibleItems, onGenerate, totalEligible]);

  const handleStop = () => {
    abortRef.current = true;
  };

  const handleClose = () => {
    if (phase === "done" || phase === "preview") {
      setPhase("preview");
      setResults([]);
      setCurrentIndex(0);
      onOpenChange(false);
      if (phase === "done") onComplete();
    }
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={phase === "running" ? undefined : handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {phase === "preview" && "Génération groupée"}
            {phase === "running" && "Génération en cours…"}
            {phase === "done" && "Résultats de la génération"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {phase === "preview" && `${selectedRows.length} apprenant(s) sélectionné(s)`}
            {phase === "running" && `Document ${currentIndex}/${totalEligible}`}
            {phase === "done" && `${successCount} réussi(s), ${failCount} échoué(s)`}
          </DialogDescription>
        </DialogHeader>

        {/* Preview phase */}
        {phase === "preview" && (
          <div className="space-y-3">
            {/* Eligible */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                {totalEligible} à générer
              </Badge>
              {blockedItems.length > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 bg-orange-50 text-orange-700 border-orange-200">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                  {blockedItems.length} bloqué(s)
                </Badge>
              )}
            </div>

            {totalEligible === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Aucun document éligible à la génération
              </div>
            ) : (
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-1 pr-2">
                  {eligibleItems.map(({ row, item }, i) => (
                    <div key={`${row.contactId}-${item.id}-${i}`} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/30">
                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate flex-1">{row.contactName}</span>
                      <span className="text-muted-foreground truncate">{item.templateName}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Blocked items warning */}
            {blockedItems.length > 0 && (
              <>
                <Separator />
                <div className="text-xs text-orange-700 bg-orange-50 rounded p-2">
                  <p className="font-medium mb-1">Documents bloqués (non inclus) :</p>
                  {blockedItems.slice(0, 5).map(({ row, item }, i) => (
                    <p key={i} className="text-[10px]">
                      • {row.contactName} — {item.templateName}
                      {item.missingRequiredFields.length > 0 && (
                        <span className="text-orange-500"> ({item.missingRequiredFields[0]})</span>
                      )}
                    </p>
                  ))}
                  {blockedItems.length > 5 && (
                    <p className="text-[10px] mt-0.5">…et {blockedItems.length - 5} autre(s)</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Running phase */}
        {phase === "running" && (
          <div className="space-y-3">
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {currentIndex}/{totalEligible} — {progressPct}%
            </p>
            {results.length > 0 && (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-0.5 pr-2">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                      {r.success ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                      )}
                      <span className="truncate">{r.contactName}</span>
                      <span className="text-muted-foreground truncate">{r.templateName}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Done phase */}
        {phase === "done" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4 py-2">
              {successCount > 0 && (
                <div className="text-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-green-700">{successCount}</p>
                  <p className="text-[10px] text-muted-foreground">réussi(s)</p>
                </div>
              )}
              {failCount > 0 && (
                <div className="text-center">
                  <XCircle className="h-6 w-6 text-destructive mx-auto mb-1" />
                  <p className="text-sm font-semibold text-destructive">{failCount}</p>
                  <p className="text-[10px] text-muted-foreground">échoué(s)</p>
                </div>
              )}
            </div>

            {failCount > 0 && (
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-0.5 pr-2">
                  {results.filter(r => !r.success).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-destructive py-0.5">
                      <XCircle className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{r.contactName} — {r.templateName}</span>
                      {r.error && <span className="text-[10px] text-muted-foreground">({r.error})</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          {phase === "preview" && (
            <>
              <Button variant="outline" size="sm" onClick={handleClose}>Annuler</Button>
              <Button size="sm" onClick={handleStart} disabled={totalEligible === 0} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Lancer ({totalEligible})
              </Button>
            </>
          )}
          {phase === "running" && (
            <Button variant="destructive" size="sm" onClick={handleStop} className="gap-1.5">
              <Square className="h-3.5 w-3.5" />
              Arrêter
            </Button>
          )}
          {phase === "done" && (
            <Button size="sm" onClick={handleClose}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
