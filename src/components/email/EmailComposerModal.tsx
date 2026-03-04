import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createAutoNote, type ActionCategory } from "@/lib/aujourdhui-actions";

export interface EmailRecipient {
  id: string;
  email: string;
  prenom: string;
  nom: string;
}

export interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single recipient or multiple for bulk */
  recipients: EmailRecipient[];
  /** Pre-filled subject */
  defaultSubject?: string;
  /** Pre-filled body (plain text) */
  defaultBody?: string;
  /** Action category for [AUTO] notes */
  autoNoteCategory?: ActionCategory;
  /** Extra info for [AUTO] notes */
  autoNoteExtra?: string;
  /** Callback after all sends complete */
  onSuccess?: () => void;
}

const BULK_WARN_THRESHOLD = 10;
const FROM_ADDRESS = "Ecole T3P Montrouge <montrouge@ecolet3p.fr>";

export function EmailComposerModal({
  open,
  onOpenChange,
  recipients,
  defaultSubject = "",
  defaultBody = "",
  autoNoteCategory,
  autoNoteExtra,
  onSuccess,
}: EmailComposerProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bulkMode, setBulkMode] = useState<"individual" | "bcc">("individual");

  const isBulk = recipients.length > 1;

  // Reset form when opening with new defaults
  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setBody(defaultBody);
      setProgress(0);
      setSending(false);
    }
  }, [open, defaultSubject, defaultBody]);

  const sendSingleEmail = async (to: string, recipientName: string) => {
    const htmlBody = body.replace(/\n/g, "<br>");
    const { error } = await supabase.functions.invoke("send-automated-emails", {
      body: {
        to,
        subject,
        html: htmlBody,
        type: "crm_composer",
        recipientName,
      },
    });
    if (error) throw error;
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Sujet et contenu requis");
      return;
    }
    const validRecipients = recipients.filter(r => r.email);
    if (validRecipients.length === 0) {
      toast.error("Aucun destinataire avec email");
      return;
    }

    setSending(true);
    setProgress(0);

    try {
      if (!isBulk || bulkMode === "individual") {
        // Send individual emails one by one
        let successCount = 0;
        let failCount = 0;
        for (let i = 0; i < validRecipients.length; i++) {
          const r = validRecipients[i];
          try {
            await sendSingleEmail(r.email, `${r.prenom} ${r.nom}`);
            successCount++;
            // Log [AUTO] note on success
            if (autoNoteCategory) {
              await createAutoNote(
                r.id,
                autoNoteCategory,
                `${autoNoteExtra || ""} — Email envoyé`.trim()
              );
            }
          } catch (err: any) {
            failCount++;
            console.error(`Failed to send to ${r.email}:`, err);
            // Log failure note
            if (autoNoteCategory) {
              await createAutoNote(
                r.id,
                autoNoteCategory,
                `${autoNoteExtra || ""} — ÉCHEC: ${err.message || "erreur"}`.trim()
              );
            }
          }
          setProgress(Math.round(((i + 1) / validRecipients.length) * 100));
        }

        if (failCount === 0) {
          toast.success(`${successCount} email${successCount > 1 ? "s" : ""} envoyé${successCount > 1 ? "s" : ""}`);
        } else {
          toast.warning(`${successCount} envoyé${successCount > 1 ? "s" : ""}, ${failCount} échoué${failCount > 1 ? "s" : ""}`);
        }
      } else {
        // BCC mode: single email with all recipients in BCC
        const htmlBody = body.replace(/\n/g, "<br>");
        const { error } = await supabase.functions.invoke("send-automated-emails", {
          body: {
            to: validRecipients[0].email,
            bcc: validRecipients.slice(1).map(r => r.email),
            subject,
            html: htmlBody,
            type: "crm_composer_bcc",
          },
        });
        if (error) throw error;

        // Log [AUTO] for all recipients
        for (const r of validRecipients) {
          if (autoNoteCategory) {
            await createAutoNote(
              r.id,
              autoNoteCategory,
              `${autoNoteExtra || ""} — Email envoyé (BCC)`.trim()
            );
          }
        }
        toast.success(`Email groupé envoyé à ${validRecipients.length} destinataires`);
        setProgress(100);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Email send error:", err);
      toast.error("Erreur lors de l'envoi", { description: err.message || "Veuillez réessayer" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {isBulk ? `Email groupé (${recipients.length})` : "Envoyer un email"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {/* From */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">De</Label>
            <div className="text-sm font-medium px-3 py-2 rounded-md bg-muted/50 border">
              {FROM_ADDRESS}
            </div>
          </div>

          {/* To / Recipients */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {isBulk ? `Destinataires (${recipients.length})` : "À"}
            </Label>
            {isBulk ? (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto p-2 border rounded-md bg-muted/30">
                {recipients.map(r => (
                  <Badge key={r.id} variant="secondary" className="text-xs">
                    {r.prenom} {r.nom}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm px-3 py-2 rounded-md bg-muted/50 border">
                {recipients[0]?.prenom} {recipients[0]?.nom} &lt;{recipients[0]?.email}&gt;
              </div>
            )}
          </div>

          {/* Bulk mode toggle */}
          {isBulk && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Mode d'envoi</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Individuels</span>
                  <Switch
                    checked={bulkMode === "bcc"}
                    onCheckedChange={(v) => setBulkMode(v ? "bcc" : "individual")}
                  />
                  <span className="text-xs text-muted-foreground">BCC groupé</span>
                </div>
              </div>
              {bulkMode === "individual" && (
                <p className="text-[10px] text-muted-foreground">
                  Chaque destinataire reçoit un email individuel. Plus sûr RGPD.
                </p>
              )}
              {bulkMode === "bcc" && (
                <p className="text-[10px] text-muted-foreground">
                  Un seul email envoyé, tous en copie cachée (BCC).
                </p>
              )}
              {recipients.length > BULK_WARN_THRESHOLD && (
                <div className="flex items-center gap-1.5 text-warning text-xs mt-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>⚠️ {recipients.length} destinataires — vérifiez avant d'envoyer</span>
                </div>
              )}
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="email-subject" className="text-xs">Sujet *</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de votre email..."
              disabled={sending}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="email-body" className="text-xs">Contenu *</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Contenu de votre email..."
              className="min-h-[200px] resize-none"
              disabled={sending}
            />
          </div>

          {/* Progress */}
          {sending && isBulk && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Envoi en cours...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer{isBulk ? ` (${recipients.length})` : ""}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
