import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ActionCategory } from "@/lib/aujourdhui-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  FileDown,
  Loader2,
  Mail,
  Send,
  CheckCircle2,
  FileText,
  Award,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateAttachmentsForContact,
  getDocTypeLabel,
  isPersonalizedDoc,
  isAttachmentTooLarge,
  type SessionDocumentType,
  type EmailAttachment,
} from "@/lib/session-document-helpers";
import { fetchTodayAutoNotes, isHandledToday } from "@/lib/aujourdhui-actions";
import type { EmailRecipient } from "@/components/email/EmailComposerModal";
import type { ContactInfo, SessionInfo, CompanyInfo } from "@/lib/pdf-generator";

const DOC_ICONS: Record<SessionDocumentType, typeof Send> = {
  convocation: Send,
  programme: FileText,
  attestation: Award,
  pack: Package,
};

const ACTION_CATEGORY_MAP: Record<SessionDocumentType, ActionCategory> = {
  convocation: "session_envoi_convocation",
  programme: "session_envoi_programme",
  attestation: "session_envoi_attestation",
  pack: "session_envoi_pack",
};

const ANTI_DOUBLE_KEYWORDS: Record<SessionDocumentType, string[]> = {
  convocation: ["Convocation envoyée", "session_envoi_convocation"],
  programme: ["Programme envoyé", "session_envoi_programme"],
  attestation: ["Attestation envoyée", "session_envoi_attestation"],
  pack: ["Pack envoyé", "session_envoi_pack"],
};

interface InscritInfo {
  contact_id: string;
  contact?: {
    id: string;
    nom: string;
    prenom: string;
    email?: string | null;
    civilite?: string | null;
    telephone?: string | null;
    rue?: string | null;
    code_postal?: string | null;
    ville?: string | null;
    date_naissance?: string | null;
    ville_naissance?: string | null;
    pays_naissance?: string | null;
    formation?: string | null;
    [key: string]: any;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscrits: InscritInfo[];
  sessionInfo: SessionInfo;
  sessionName: string;
  company: CompanyInfo | undefined;
  selectedIds?: string[];
  openComposer: (opts: {
    recipients: EmailRecipient[];
    defaultSubject: string;
    defaultBody: string;
    autoNoteCategory: ActionCategory;
    autoNoteExtra?: string;
    attachments?: EmailAttachment[];
  }) => void;
}

export function SessionDocumentsSendModal({
  open,
  onOpenChange,
  inscrits,
  sessionInfo,
  sessionName,
  company,
  selectedIds,
  openComposer,
}: Props) {
  const [docType, setDocType] = useState<SessionDocumentType | "">("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [todayNotes, setTodayNotes] = useState<
    Array<{ contact_id: string; titre: string }>
  >([]);

  // Scope: use selectedIds if provided, otherwise all
  const scope = selectedIds && selectedIds.length > 0
    ? inscrits.filter((i) => selectedIds.includes(i.contact_id))
    : inscrits;

  const recipientsWithEmail = scope.filter((i) => i.contact?.email);

  // Anti-double-send: fetch today's notes
  useEffect(() => {
    if (open) {
      fetchTodayAutoNotes().then(setTodayNotes);
      setDocType("");
      setProgress(0);
      setIsGenerating(false);
    }
  }, [open]);

  const getAlreadySent = () => {
    if (!docType) return [];
    const keywords = ANTI_DOUBLE_KEYWORDS[docType] || [];
    return recipientsWithEmail.filter((i) =>
      isHandledToday(i.contact_id, todayNotes, keywords)
    );
  };

  const alreadySent = docType ? getAlreadySent() : [];
  const toSend = recipientsWithEmail.filter(
    (i) => !alreadySent.some((a) => a.contact_id === i.contact_id)
  );

  const handlePrepareAndSend = async () => {
    if (!docType || !company) {
      toast.error("Sélectionnez un type de document");
      return;
    }

    if (toSend.length === 0) {
      toast.error("Tous les destinataires ont déjà reçu ce document aujourd'hui");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const isGeneric = !isPersonalizedDoc(docType);

      // For generic docs (programme), generate once
      let sharedAttachments: EmailAttachment[] | undefined;
      if (isGeneric) {
        const dummyContact: ContactInfo = {
          nom: "",
          prenom: "",
        };
        sharedAttachments = await generateAttachmentsForContact(
          docType,
          dummyContact,
          sessionInfo,
          company,
        );

        if (isAttachmentTooLarge(sharedAttachments)) {
          toast.warning("Document trop volumineux (>5Mo). Envoi sans pièce jointe.");
          sharedAttachments = undefined;
        }
      }

      // Build recipients
      const recipients: EmailRecipient[] = [];

      for (let i = 0; i < toSend.length; i++) {
        const inscrit = toSend[i];
        const c = inscrit.contact!;

        let perRecipientAttachments: EmailAttachment[] | undefined;

        if (!isGeneric) {
          const contactInfo: ContactInfo = {
            nom: c.nom || "",
            prenom: c.prenom || "",
            civilite: c.civilite || undefined,
            email: c.email || undefined,
            telephone: c.telephone || undefined,
            rue: c.rue || undefined,
            code_postal: c.code_postal || undefined,
            ville: c.ville || undefined,
            date_naissance: c.date_naissance || undefined,
            ville_naissance: c.ville_naissance || undefined,
          };

          try {
            perRecipientAttachments = await generateAttachmentsForContact(
              docType,
              contactInfo,
              sessionInfo,
              company,
            );

            if (isAttachmentTooLarge(perRecipientAttachments)) {
              toast.warning(
                `Document trop volumineux pour ${c.prenom} ${c.nom}. Envoi sans PJ.`
              );
              perRecipientAttachments = undefined;
            }
          } catch (err) {
            console.error(`PDF generation failed for ${c.nom}:`, err);
            toast.error(`Erreur génération PDF pour ${c.prenom} ${c.nom}`);
          }
        }

        recipients.push({
          id: inscrit.contact_id,
          email: c.email!,
          prenom: c.prenom || "",
          nom: c.nom || "",
          attachments: perRecipientAttachments || sharedAttachments,
        });

        setProgress(Math.round(((i + 1) / toSend.length) * 100));
      }

      // Build default subject/body
      const label = getDocTypeLabel(docType);
      const defaultSubject = `${label} — ${sessionName}`;
      const defaultBody = docType === "pack"
        ? `Bonjour {{prenom}},\n\nVeuillez trouver ci-joint votre convocation et le programme de la session "${sessionName}".\n\nBien cordialement,\nL'équipe pédagogique`
        : `Bonjour {{prenom}},\n\nVeuillez trouver ci-joint votre ${label.toLowerCase()} pour la session "${sessionName}".\n\nBien cordialement,\nL'équipe pédagogique`;

      onOpenChange(false);

      openComposer({
        recipients,
        defaultSubject,
        defaultBody,
        autoNoteCategory: ACTION_CATEGORY_MAP[docType],
        autoNoteExtra: `Session: ${sessionName}`,
        attachments: isGeneric ? sharedAttachments : undefined,
      });
    } catch (err: any) {
      console.error("Document generation error:", err);
      toast.error("Erreur lors de la génération des documents");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer des documents
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scope info */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm">
              <strong>{recipientsWithEmail.length}</strong> destinataire
              {recipientsWithEmail.length > 1 ? "s" : ""} avec email
              {selectedIds && selectedIds.length > 0 && (
                <span className="text-muted-foreground">
                  {" "}(sur {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""})
                </span>
              )}
            </p>
            {scope.length > recipientsWithEmail.length && (
              <p className="text-xs text-warning mt-1">
                ⚠️ {scope.length - recipientsWithEmail.length} contact(s) sans email
              </p>
            )}
          </div>

          {/* Document type selector */}
          <div className="space-y-2">
            <Label>Type de document</Label>
            <Select
              value={docType}
              onValueChange={(v) => setDocType(v as SessionDocumentType)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un document..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="convocation">
                  <div className="flex items-center gap-2">
                    <Send className="h-3.5 w-3.5" />
                    Convocation (personnalisée)
                  </div>
                </SelectItem>
                <SelectItem value="programme">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Programme (générique)
                  </div>
                </SelectItem>
                <SelectItem value="attestation">
                  <div className="flex items-center gap-2">
                    <Award className="h-3.5 w-3.5" />
                    Attestation (personnalisée)
                  </div>
                </SelectItem>
                <SelectItem value="pack">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    Pack Session (Convocation + Programme)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Anti-double-send warning */}
          {docType && alreadySent.length > 0 && (
            <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-warning">
                    Déjà envoyé aujourd'hui ({alreadySent.length})
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {alreadySent.map((s) => (
                      <Badge
                        key={s.contact_id}
                        variant="outline"
                        className="text-[10px] border-warning/30 text-warning"
                      >
                        {s.contact?.prenom} {s.contact?.nom}
                      </Badge>
                    ))}
                  </div>
                  {toSend.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Seuls les {toSend.length} autre(s) recevront l'envoi.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personalized doc info */}
          {docType && isPersonalizedDoc(docType) && (
            <p className="text-xs text-muted-foreground">
              📄 Document personnalisé → envoi en mode <strong>Individuel</strong> (1 email par contact avec sa PJ)
            </p>
          )}

          {docType === "programme" && (
            <p className="text-xs text-muted-foreground">
              📄 Document générique → envoi en mode <strong>BCC</strong> possible (1 seul email, même PJ pour tous)
            </p>
          )}

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Génération des documents...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Annuler
          </Button>
          <Button
            onClick={handlePrepareAndSend}
            disabled={!docType || isGenerating || toSend.length === 0 || !company}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Préparer l'envoi ({toSend.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
