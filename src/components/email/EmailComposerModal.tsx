import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Send, Loader2, Sparkles, FileText, Paperclip, X, ShieldAlert } from "lucide-react";
import type { EmailAttachment } from "@/lib/session-document-helpers";
import { formatFileSize, getAttachmentsTotalSize, isAttachmentTooLarge } from "@/lib/session-document-helpers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createAutoNote, type ActionCategory } from "@/lib/aujourdhui-actions";
import { useEmailTemplates, replaceTemplateVariables } from "@/hooks/useEmailTemplates";

export interface EmailRecipient {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  /** Per-recipient custom body (used in individual mode for CMA personalization) */
  customBody?: string;
  /** Per-recipient attachments (personalized docs) */
  attachments?: EmailAttachment[];
}

export interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: EmailRecipient[];
  defaultSubject?: string;
  defaultBody?: string;
  autoNoteCategory?: ActionCategory;
  autoNoteExtra?: string;
  onSuccess?: () => void;
  /** Shared attachments for all recipients (generic docs / BCC) */
  attachments?: EmailAttachment[];
}

const BULK_WARN_THRESHOLD = 10;
const FROM_ADDRESS = "Ecole T3P Montrouge <montrouge@ecolet3p.fr>";

const CATEGORY_LABELS: Record<string, string> = {
  prospect: "Prospects",
  inscription: "Inscription",
  information: "Information",
  relance: "Relance",
  confirmation: "Confirmation",
  autre: "Autre",
};

export function EmailComposerModal({
  open,
  onOpenChange,
  recipients,
  defaultSubject = "",
  defaultBody = "",
  autoNoteCategory,
  autoNoteExtra,
  onSuccess,
  attachments: sharedAttachments,
}: EmailComposerProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bulkMode, setBulkMode] = useState<"individual" | "bcc">("individual");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: templates = [], isLoading: templatesLoading } = useEmailTemplates();

  const isBulk = recipients.length > 1;
  const hasCustomBodies = recipients.some(r => r.customBody);
  const hasPersonalizedAttachments = recipients.some(r => r.attachments && r.attachments.length > 0);

  // Force individual mode when attachments are personalized (convocation/attestation)
  const forcedIndividual = hasPersonalizedAttachments;

  // Effective bulk mode (respect forced individual)
  const effectiveBulkMode = forcedIndividual ? "individual" : bulkMode;

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setBody(defaultBody);
      setProgress(0);
      setSending(false);
      setConfirmOpen(false);
    }
  }, [open, defaultSubject, defaultBody]);

  // Template selector
  const groupedTemplates = useMemo(() => {
    return templates.reduce((acc, template) => {
      const cat = template.categorie || "autre";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(template);
      return acc;
    }, {} as Record<string, typeof templates>);
  }, [templates]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    // Build variables from first recipient
    const r = recipients[0];
    const variables: Record<string, string> = {
      prenom: r?.prenom || "",
      nom: r?.nom || "",
      email: r?.email || "",
      date: new Date().toLocaleDateString("fr-FR"),
    };
    setSubject(replaceTemplateVariables(template.sujet, variables));
    setBody(replaceTemplateVariables(template.contenu, variables));
  };

  const sendSingleEmail = async (to: string, recipientName: string, htmlBody: string, emailAttachments?: EmailAttachment[]) => {
    const { error } = await supabase.functions.invoke("send-automated-emails", {
      body: {
        to,
        subject,
        html: htmlBody,
        type: "crm_composer",
        recipientName,
        ...(emailAttachments && emailAttachments.length > 0 ? {
          attachments: emailAttachments.map(a => ({
            filename: a.filename,
            content: a.content,
            type: a.contentType,
          })),
        } : {}),
      },
    });
    if (error) throw error;
  };

  const handleSendClick = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Sujet et contenu requis");
      return;
    }
    const validRecipients = recipients.filter(r => r.email);
    if (validRecipients.length === 0) {
      toast.error("Aucun destinataire avec email");
      return;
    }
    // For bulk, show confirmation dialog
    if (isBulk) {
      setConfirmOpen(true);
    } else {
      executeSend();
    }
  };

  const executeSend = async () => {
    setConfirmOpen(false);
    const validRecipients = recipients.filter(r => r.email);
    setSending(true);
    setProgress(0);

    const buildNoteDetail = (mode: string, nbPJ: number) => {
      const parts = [autoNoteExtra || ""];
      parts.push(`Mode: ${mode}`);
      if (nbPJ > 0) parts.push(`${nbPJ} PJ`);
      return parts.filter(Boolean).join(" — ");
    };

    try {
      if (!isBulk || effectiveBulkMode === "individual") {
        let successCount = 0;
        let failCount = 0;
        for (let i = 0; i < validRecipients.length; i++) {
          const r = validRecipients[i];
          const emailBody = (r.customBody || body).replace(/\n/g, "<br>");
          const emailAttachments = r.attachments || sharedAttachments;
          const nbPJ = emailAttachments?.length || 0;
          try {
            await sendSingleEmail(r.email, `${r.prenom} ${r.nom}`, emailBody, emailAttachments);
            successCount++;
            if (autoNoteCategory) {
              await createAutoNote(
                r.id,
                autoNoteCategory,
                `${buildNoteDetail("Individuel", nbPJ)} — Envoyé ✓`
              );
            }
          } catch (err: any) {
            failCount++;
            console.error(`Failed to send to ${r.email}:`, err);
            if (autoNoteCategory) {
              await createAutoNote(
                r.id,
                autoNoteCategory,
                `${buildNoteDetail("Individuel", nbPJ)} — ÉCHEC: ${err.message || "erreur"}`
              );
            }
          }
          setProgress(Math.round(((i + 1) / validRecipients.length) * 100));
        }

        if (failCount === 0) {
          toast.success(`✅ ${successCount} email${successCount > 1 ? "s" : ""} envoyé${successCount > 1 ? "s" : ""}`);
        } else {
          toast.warning(`${successCount} envoyé${successCount > 1 ? "s" : ""}, ${failCount} échoué${failCount > 1 ? "s" : ""}`, {
            description: "Consultez les fiches pour le détail des erreurs.",
          });
        }
      } else {
        const htmlBody = body.replace(/\n/g, "<br>");
        const bccAttachments = sharedAttachments;
        const nbPJ = bccAttachments?.length || 0;
        const { error } = await supabase.functions.invoke("send-automated-emails", {
          body: {
            to: validRecipients[0].email,
            bcc: validRecipients.slice(1).map(r => r.email),
            subject,
            html: htmlBody,
            type: "crm_composer_bcc",
            ...(bccAttachments && bccAttachments.length > 0 ? {
              attachments: bccAttachments.map(a => ({
                filename: a.filename,
                content: a.content,
                type: a.contentType,
              })),
            } : {}),
          },
        });
        if (error) throw error;

        for (const r of validRecipients) {
          if (autoNoteCategory) {
            await createAutoNote(
              r.id,
              autoNoteCategory,
              `${buildNoteDetail("BCC", nbPJ)} — Envoyé ✓`
            );
          }
        }
        toast.success(`✅ Email groupé envoyé à ${validRecipients.length} destinataires`);
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

  const validCount = recipients.filter(r => r.email).length;

  return (
    <>
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
                      disabled={hasCustomBodies || forcedIndividual}
                    />
                    <span className="text-xs text-muted-foreground">BCC groupé</span>
                  </div>
                </div>
                {forcedIndividual && (
                  <div className="flex items-center gap-1.5 text-xs text-warning">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Documents personnalisés → mode Individuel obligatoire</span>
                  </div>
                )}
                {effectiveBulkMode === "individual" && hasCustomBodies && !forcedIndividual && (
                  <p className="text-[10px] text-primary font-medium">
                    ✨ Contenu personnalisé par destinataire activé
                  </p>
                )}
                {effectiveBulkMode === "individual" && !hasCustomBodies && !forcedIndividual && (
                  <p className="text-[10px] text-muted-foreground">
                    Chaque destinataire reçoit un email individuel. Plus sûr RGPD.
                  </p>
                )}
                {effectiveBulkMode === "bcc" && (
                  <p className="text-[10px] text-muted-foreground">
                    Un seul email envoyé, tous en copie cachée (BCC). Pas de personnalisation.
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

            {/* Template selector */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Modèle email
              </Label>
              {templatesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : templates.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  Aucun modèle — créez-en dans Communications.
                </p>
              ) : (
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Sélectionner un modèle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50 uppercase tracking-wide">
                          {CATEGORY_LABELS[category] || category}
                        </div>
                        {categoryTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              {template.nom}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

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
              <Label htmlFor="email-body" className="text-xs">
                Contenu *
                {hasCustomBodies && bulkMode === "individual" && (
                  <span className="ml-2 text-[10px] text-primary font-normal">(texte par défaut — chaque contact a son contenu personnalisé)</span>
                )}
              </Label>
              <Textarea
                id="email-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Contenu de votre email..."
                className="min-h-[200px] resize-none"
                disabled={sending}
              />
              <p className="text-[10px] text-muted-foreground">
                Variables : {`{{prenom}}`}, {`{{nom}}`}, {`{{formation}}`}, {`{{date}}`}
              </p>
            </div>

            {/* Attachments display */}
            {(() => {
              const hasPerRecipient = recipients.some(r => r.attachments && r.attachments.length > 0);
              const hasShared = sharedAttachments && sharedAttachments.length > 0;
              if (!hasPerRecipient && !hasShared) return null;

              const displayAttachments = hasShared
                ? sharedAttachments!
                : recipients[0]?.attachments || [];
              const totalSize = getAttachmentsTotalSize(displayAttachments);
              const tooLarge = isAttachmentTooLarge(displayAttachments);

              return (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    Pièces jointes
                    {hasPerRecipient && !hasShared && (
                      <span className="text-[10px] text-primary font-normal ml-1">(personnalisées par contact)</span>
                    )}
                  </Label>
                  <div className={cn(
                    "space-y-1 p-2 border rounded-md",
                    tooLarge ? "bg-destructive/5 border-destructive/30" : "bg-muted/30"
                  )}>
                    {displayAttachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{att.filename}</span>
                        </div>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {formatFileSize(Math.ceil(att.content.length * 0.75))}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-muted-foreground">
                        Total : {formatFileSize(totalSize)}
                        {hasPerRecipient && !hasShared && ` × ${recipients.length} contacts`}
                      </p>
                      {tooLarge && (
                        <Badge variant="destructive" className="text-[10px]">
                          &gt; 5 Mo
                        </Badge>
                      )}
                    </div>
                    {tooLarge && (
                      <div className="flex items-center gap-1.5 text-destructive text-xs mt-1">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        <span>PJ trop volumineuses — l'envoi pourrait échouer. Préférez le mode individuel.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Progress */}
            {sending && (
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
            <Button onClick={handleSendClick} disabled={sending || !subject.trim() || !body.trim()}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer{isBulk ? ` (${validCount})` : ""}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'envoi groupé</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-sm space-y-1">
                  <p><strong>Destinataires :</strong> {validCount} contact{validCount > 1 ? "s" : ""}</p>
                  <p><strong>Mode :</strong> {effectiveBulkMode === "individual" ? "Emails individuels" : "BCC groupé"}</p>
                  <p><strong>Objet :</strong> {subject}</p>
                  {hasCustomBodies && effectiveBulkMode === "individual" && (
                    <p className="text-primary text-xs">✨ Contenu personnalisé par destinataire</p>
                  )}
                </div>
                {recipients.length > BULK_WARN_THRESHOLD && (
                  <div className="flex items-center gap-2 text-warning text-xs bg-warning/10 p-2 rounded">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Attention : {validCount} destinataires. Vérifiez que la liste est correcte.</span>
                  </div>
                )}
                <div className="max-h-32 overflow-auto">
                  <div className="flex flex-wrap gap-1">
                    {recipients.filter(r => r.email).map(r => (
                      <Badge key={r.id} variant="outline" className="text-[10px]">
                        {r.prenom} {r.nom}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={executeSend}>
              <Send className="h-4 w-4 mr-2" />
              Confirmer l'envoi ({validCount})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
