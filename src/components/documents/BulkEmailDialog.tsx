// ═══════════════════════════════════════════════════════════════
// BulkEmailDialog — Secure batch email with validation
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Mail, CheckCircle2, XCircle, Loader2, AlertTriangle, Send, Eye,
  UserX, FileX, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SessionDocumentMatrixRow } from "@/lib/document-workflow/types";

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionName?: string;
  rows: SessionDocumentMatrixRow[];
  selectedContactIds: Set<string>;
  onComplete: () => void;
}

type EmailPhase = "compose" | "preview" | "sending" | "done";

interface SendResult {
  contactId: string;
  contactName: string;
  email: string | null;
  status: "sent" | "skipped" | "failed" | "no_email" | "no_document";
  documentsSent: number;
  error?: string;
}

const DEFAULT_SUBJECT = "Vos documents de formation";
const DEFAULT_BODY = `Bonjour {prenom},

Veuillez trouver ci-joint vos documents relatifs à la formation {formation}.

Cordialement,
L'équipe pédagogique`;

export function BulkEmailDialog({
  open,
  onOpenChange,
  sessionId,
  sessionName,
  rows,
  selectedContactIds,
  onComplete,
}: BulkEmailDialogProps) {
  const [phase, setPhase] = useState<EmailPhase>("compose");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [results, setResults] = useState<SendResult[]>([]);
  const [previewData, setPreviewData] = useState<{
    ready: SendResult[];
    noEmail: SendResult[];
    noDocument: SendResult[];
  } | null>(null);

  // Selected rows
  const selectedRows = useMemo(
    () => rows.filter(r => selectedContactIds.has(r.contactId)),
    [rows, selectedContactIds]
  );

  // Validate recipients
  const validation = useMemo(() => {
    const withEmail = selectedRows.filter(r => r.contactEmail);
    const withoutEmail = selectedRows.filter(r => !r.contactEmail);
    const withDocs = selectedRows.filter(r => r.generatedCount > 0);
    const withoutDocs = selectedRows.filter(r => r.generatedCount === 0);
    const blocked = selectedRows.filter(r => !r.contactEmail || r.generatedCount === 0);
    
    return {
      total: selectedRows.length,
      withEmail: withEmail.length,
      withoutEmail: withoutEmail.length,
      withDocs: withDocs.length,
      withoutDocs: withoutDocs.length,
      readyToSend: selectedRows.filter(r => r.contactEmail && r.generatedCount > 0).length,
      blocked: blocked.length,
    };
  }, [selectedRows]);

  const handlePreview = useCallback(async () => {
    setPhase("preview");
    
    try {
      const response = await supabase.functions.invoke("bulk-send-documents", {
        body: {
          sessionId,
          contactIds: Array.from(selectedContactIds),
          subject,
          bodyTemplate: body,
          dryRun: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      const allResults = data.results as SendResult[];
      
      setPreviewData({
        ready: allResults.filter(r => r.status === "skipped" && r.documentsSent > 0),
        noEmail: allResults.filter(r => r.status === "no_email"),
        noDocument: allResults.filter(r => r.status === "no_document"),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de prévisualisation";
      toast.error(message);
      setPhase("compose");
    }
  }, [sessionId, selectedContactIds, subject, body]);

  const handleSend = useCallback(async () => {
    setPhase("sending");
    setResults([]);

    try {
      const response = await supabase.functions.invoke("bulk-send-documents", {
        body: {
          sessionId,
          contactIds: Array.from(selectedContactIds),
          subject,
          bodyTemplate: body,
          dryRun: false,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      setResults(data.results as SendResult[]);
      setPhase("done");

      const { sent, failed } = data.summary;
      if (failed === 0) {
        toast.success(`${sent} email(s) envoyé(s) avec succès`);
      } else {
        toast.warning(`${sent} envoyé(s), ${failed} échoué(s)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'envoi";
      toast.error(message);
      setPhase("compose");
    }
  }, [sessionId, selectedContactIds, subject, body]);

  const handleClose = () => {
    if (phase !== "sending") {
      setPhase("compose");
      setSubject(DEFAULT_SUBJECT);
      setBody(DEFAULT_BODY);
      setResults([]);
      setPreviewData(null);
      onOpenChange(false);
      if (phase === "done") onComplete();
    }
  };

  const sentCount = results.filter(r => r.status === "sent").length;
  const failedCount = results.filter(r => r.status === "failed").length;
  const skippedCount = results.filter(
    (result) => result.status === "skipped" || result.status === "no_email" || result.status === "no_document"
  ).length;

  return (
    <Dialog open={open} onOpenChange={phase === "sending" ? undefined : handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {phase === "compose" && "Envoi groupé de documents"}
            {phase === "preview" && "Prévisualisation"}
            {phase === "sending" && "Envoi en cours…"}
            {phase === "done" && "Résultats de l'envoi"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {phase === "compose" && `${selectedRows.length} apprenant(s) sélectionné(s)`}
            {phase === "preview" && `${previewData?.ready.length || 0} envoi(s) prêt(s)`}
            {phase === "sending" && "Patientez…"}
            {phase === "done" && `${sentCount} envoyé(s), ${failedCount} échoué(s)`}
          </DialogDescription>
        </DialogHeader>

        {/* Compose phase */}
        {phase === "compose" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Session</p>
                <p className="text-sm font-semibold">{sessionName || "Session en cours"}</p>
                <p className="text-xs text-muted-foreground">{validation.total} apprenant(s) sélectionné(s)</p>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Prêts à envoyer</p>
                <p className="text-lg font-semibold">{validation.readyToSend}</p>
                <p className="text-xs text-muted-foreground">Avec email et documents générés</p>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">À corriger</p>
                <p className="text-lg font-semibold">{validation.blocked}</p>
                <p className="text-xs text-muted-foreground">Email manquant ou aucun document prêt</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                La prévisualisation vérifie qui peut recevoir les documents maintenant. Les apprenants bloqués seront exclus de l'envoi final.
              </span>
            </div>

            {/* Validation warnings */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                {validation.readyToSend} prêt(s)
              </Badge>
              {validation.withoutEmail > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 bg-orange-50 text-orange-700 border-orange-200">
                  <UserX className="h-2.5 w-2.5 mr-0.5" />
                  {validation.withoutEmail} sans email
                </Badge>
              )}
              {validation.withoutDocs > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 bg-orange-50 text-orange-700 border-orange-200">
                  <FileX className="h-2.5 w-2.5 mr-0.5" />
                  {validation.withoutDocs} sans document
                </Badge>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs">Objet</Label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Objet de l'email"
                className="h-9 text-sm"
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Corps du message..."
                rows={6}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Variables: {"{prenom}"}, {"{nom}"}, {"{session}"}, {"{formation}"}
              </p>
            </div>

            <div className="bg-blue-50 rounded p-2 text-[11px] text-blue-700">
              <p className="font-medium mb-1">Documents joints automatiquement :</p>
              <p>Tous les documents générés pour chaque apprenant seront attachés à leur email.</p>
            </div>
          </div>
        )}

        {/* Preview phase */}
        {phase === "preview" && previewData && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Prêts</p>
                <p className="text-lg font-semibold">{previewData.ready.length}</p>
                <p className="text-xs text-muted-foreground">Envoi(s) possibles maintenant</p>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sans email</p>
                <p className="text-lg font-semibold">{previewData.noEmail.length}</p>
                <p className="text-xs text-muted-foreground">Contact(s) à compléter</p>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sans document</p>
                <p className="text-lg font-semibold">{previewData.noDocument.length}</p>
                <p className="text-xs text-muted-foreground">Génération requise avant envoi</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                Cette étape confirme exactement quels apprenants partiront dans l'envoi final et lesquels resteront à traiter manuellement.
              </span>
            </div>

            {previewData.ready.length > 0 && (
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-0.5 pr-2">
                  {previewData.ready.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="truncate font-medium">{r.contactName}</span>
                      <span className="text-muted-foreground truncate">{r.email}</span>
                      <Badge variant="outline" className="text-[9px] h-4 ml-auto">
                        {r.documentsSent} doc(s)
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {(previewData.noEmail.length > 0 || previewData.noDocument.length > 0) && (
              <>
                <Separator />
                <div className="space-y-2">
                  {previewData.noEmail.length > 0 && (
                    <div className="bg-orange-50 rounded p-2">
                      <p className="text-[10px] font-medium text-orange-700 mb-1">
                        <UserX className="h-3 w-3 inline mr-1" />
                        Sans email ({previewData.noEmail.length})
                      </p>
                      {previewData.noEmail.slice(0, 3).map((r, i) => (
                        <p key={i} className="text-[10px] text-orange-600">• {r.contactName}</p>
                      ))}
                    </div>
                  )}
                  {previewData.noDocument.length > 0 && (
                    <div className="bg-orange-50 rounded p-2">
                      <p className="text-[10px] font-medium text-orange-700 mb-1">
                        <FileX className="h-3 w-3 inline mr-1" />
                        Sans document ({previewData.noDocument.length})
                      </p>
                      {previewData.noDocument.slice(0, 3).map((r, i) => (
                        <p key={i} className="text-[10px] text-orange-600">• {r.contactName}</p>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Sending phase */}
        {phase === "sending" && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm font-medium">Envoi des emails…</p>
            <p className="text-xs text-muted-foreground">
              Cette opération peut prendre quelques instants
            </p>
            <Progress value={50} className="h-1.5 w-32 mx-auto" />
          </div>
        )}

        {/* Done phase */}
        {phase === "done" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-6 py-4">
              {sentCount > 0 && (
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-1" />
                  <p className="text-lg font-semibold text-green-700">{sentCount}</p>
                  <p className="text-[10px] text-muted-foreground">envoyé(s)</p>
                </div>
              )}
              {skippedCount > 0 && (
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-1" />
                  <p className="text-lg font-semibold text-warning">{skippedCount}</p>
                  <p className="text-[10px] text-muted-foreground">ignoré(s)</p>
                </div>
              )}
              {failedCount > 0 && (
                <div className="text-center">
                  <XCircle className="h-8 w-8 text-destructive mx-auto mb-1" />
                  <p className="text-lg font-semibold text-destructive">{failedCount}</p>
                  <p className="text-[10px] text-muted-foreground">échoué(s)</p>
                </div>
              )}
            </div>

            {skippedCount > 0 && (
              <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Les envois ignorés correspondent aux contacts sans email ou sans document prêt au moment de l'envoi.
              </div>
            )}

            {failedCount > 0 && (
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-0.5 pr-2">
                  {results.filter(r => r.status === "failed").map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-destructive py-0.5">
                      <XCircle className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{r.contactName}</span>
                      {r.error && <span className="text-[10px] text-muted-foreground">({r.error})</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          {phase === "compose" && (
            <>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handlePreview}
                disabled={validation.readyToSend === 0 || !subject.trim()}
                className="gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                Prévisualiser
              </Button>
            </>
          )}
          {phase === "preview" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPhase("compose")}>
                Modifier
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!previewData || previewData.ready.length === 0}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Envoyer ({previewData?.ready.length || 0})
              </Button>
            </>
          )}
          {phase === "done" && (
            <Button size="sm" onClick={handleClose}>
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
