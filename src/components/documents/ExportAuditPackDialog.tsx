// ═══════════════════════════════════════════════════════════════
// ExportAuditPackDialog — UI for backend audit ZIP export
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Download, FileArchive, CheckCircle2, XCircle, Loader2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_BLOCKS } from "@/lib/document-workflow/documentBlockConfig";
import type { DocumentBlock } from "@/lib/document-workflow/types";

interface ExportAuditPackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "session" | "learner";
  sessionId?: string;
  contactId?: string;
  sessionName?: string;
  contactName?: string;
  documentsCount?: number;
}

type ExportPhase = "config" | "exporting" | "done" | "error";

interface ExportResult {
  success: boolean;
  documentsCount?: number;
  downloadUrl?: string | null;
  filename?: string;
  errors?: string[];
  error?: string;
}

export function ExportAuditPackDialog({
  open,
  onOpenChange,
  type,
  sessionId,
  contactId,
  sessionName,
  contactName,
  documentsCount = 0,
}: ExportAuditPackDialogProps) {
  const [phase, setPhase] = useState<ExportPhase>("config");
  const [selectedBlocks, setSelectedBlocks] = useState<Set<DocumentBlock>>(new Set());
  const [result, setResult] = useState<ExportResult | null>(null);

  const blockOptions = Object.entries(DOCUMENT_BLOCKS) as [DocumentBlock, { label: string }][];

  const toggleBlock = (block: DocumentBlock) => {
    setSelectedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(block)) next.delete(block);
      else next.add(block);
      return next;
    });
  };

  const selectAllBlocks = () => {
    if (selectedBlocks.size === blockOptions.length) {
      setSelectedBlocks(new Set());
    } else {
      setSelectedBlocks(new Set(blockOptions.map(([b]) => b)));
    }
  };

  const handleExport = useCallback(async () => {
    setPhase("exporting");
    setResult(null);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        throw new Error("Non authentifié");
      }

      const response = await supabase.functions.invoke("export-audit-pack", {
        body: {
          type,
          sessionId: type === "session" ? sessionId : undefined,
          contactId: type === "learner" ? contactId : undefined,
          includeBlocks: selectedBlocks.size > 0 ? Array.from(selectedBlocks) : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erreur d'export");
      }

      const data = response.data as ExportResult;
      setResult(data);

      if (data.success && data.downloadUrl) {
        setPhase("done");
        toast.success(`Export prêt: ${data.documentsCount} document(s)`);
      } else if (data.success && data.documentsCount === 0) {
        setPhase("error");
        toast.warning("Aucun document à exporter");
      } else {
        setPhase("error");
        toast.error(data.error || "Erreur d'export");
      }
    } catch (err: any) {
      console.error("Export audit pack error:", err);
      setResult({ success: false, error: err.message });
      setPhase("error");
      toast.error(err.message || "Erreur d'export");
    }
  }, [type, sessionId, contactId, selectedBlocks]);

  const handleDownload = () => {
    if (result?.downloadUrl) {
      window.open(result.downloadUrl, "_blank");
    }
  };

  const handleClose = () => {
    if (phase !== "exporting") {
      setPhase("config");
      setResult(null);
      setSelectedBlocks(new Set());
      onOpenChange(false);
    }
  };

  const entityLabel = type === "session" ? sessionName : contactName;

  return (
    <Dialog open={open} onOpenChange={phase === "exporting" ? undefined : handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileArchive className="h-4 w-4" />
            Export Pack Audit
          </DialogTitle>
          <DialogDescription className="text-xs">
            {type === "session" ? "Session" : "Apprenant"}: {entityLabel || "—"}
          </DialogDescription>
        </DialogHeader>

        {/* Config phase */}
        {phase === "config" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Documents disponibles: <span className="font-medium">{documentsCount}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={selectAllBlocks}
              >
                {selectedBlocks.size === blockOptions.length ? "Désélectionner tout" : "Tout sélectionner"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Filtrer par bloc (optionnel)</Label>
              <div className="grid grid-cols-2 gap-2">
                {blockOptions.map(([block, meta]) => (
                  <label
                    key={block}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors",
                      selectedBlocks.has(block)
                        ? "bg-primary/5 border-primary/30"
                        : "hover:bg-muted/30"
                    )}
                  >
                    <Checkbox
                      checked={selectedBlocks.has(block)}
                      onCheckedChange={() => toggleBlock(block)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs">{meta.label}</span>
                  </label>
                ))}
              </div>
              {selectedBlocks.size === 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Aucun filtre = tous les documents inclus
                </p>
              )}
            </div>

            <div className="bg-muted/30 rounded p-2 text-[11px] text-muted-foreground">
              <p className="font-medium mb-1">Le pack contiendra :</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Les PDF générés (versions actives)</li>
                <li>Un manifeste JSON avec métadonnées</li>
                <li>Un index CSV pour Excel</li>
              </ul>
            </div>
          </div>
        )}

        {/* Exporting phase */}
        {phase === "exporting" && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm font-medium">Génération du pack audit…</p>
            <p className="text-xs text-muted-foreground">
              Téléchargement et compression des documents
            </p>
            <Progress value={50} className="h-1.5 w-32 mx-auto" />
          </div>
        )}

        {/* Done phase */}
        {phase === "done" && result?.success && (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-700">Export prêt !</p>
              <p className="text-xs text-muted-foreground mt-1">
                {result.documentsCount} document(s) inclus
              </p>
            </div>
            {result.filename && (
              <Badge variant="outline" className="text-[10px]">
                {result.filename}
              </Badge>
            )}
            {result.errors && result.errors.length > 0 && (
              <div className="text-left bg-orange-50 rounded p-2 text-[10px] text-orange-700">
                <p className="font-medium mb-1">Avertissements :</p>
                {result.errors.slice(0, 3).map((e, i) => (
                  <p key={i}>• {e}</p>
                ))}
                {result.errors.length > 3 && (
                  <p>…et {result.errors.length - 3} autre(s)</p>
                )}
              </div>
            )}
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger le pack
            </Button>
          </div>
        )}

        {/* Error phase */}
        {phase === "error" && (
          <div className="py-6 text-center space-y-4">
            {result?.documentsCount === 0 ? (
              <>
                <AlertTriangle className="h-10 w-10 mx-auto text-orange-500" />
                <p className="text-sm font-medium text-orange-700">Aucun document à exporter</p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez que des documents ont été générés.
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-10 w-10 mx-auto text-destructive" />
                <p className="text-sm font-medium text-destructive">Erreur d'export</p>
                <p className="text-xs text-muted-foreground">
                  {result?.error || "Une erreur inattendue s'est produite"}
                </p>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {phase === "config" && (
            <>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Annuler
              </Button>
              <Button 
                size="sm" 
                onClick={handleExport}
                disabled={documentsCount === 0}
                className="gap-1.5"
              >
                <FileArchive className="h-3.5 w-3.5" />
                Générer le pack
              </Button>
            </>
          )}
          {(phase === "done" || phase === "error") && (
            <Button size="sm" onClick={handleClose}>
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
