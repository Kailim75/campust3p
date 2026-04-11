// ═══════════════════════════════════════════════════════════════
// LearnerDocumentBlockList — Full block-based document view
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { useLearnerDocumentBlocks } from "@/hooks/useLearnerDocumentBlocks";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { useGenerateDocument, useDownloadGeneratedDoc, buildVariablesForGeneration } from "@/hooks/useTemplateStudioV2";
import { LearnerDocumentsOverviewCard } from "./LearnerDocumentsOverviewCard";
import { LearnerDocumentBlockCard } from "./LearnerDocumentBlockCard";
import { DocumentPreviewDrawer } from "./DocumentPreviewDrawer";
import { ContractQualificationBadge } from "./ContractQualificationBadge";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import type { DocumentWorkflowItem } from "@/lib/document-workflow/types";

interface LearnerDocumentBlockListProps {
  contactId: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  sessionId?: string | null;
  sessionName?: string | null;
  centreId?: string | null;
  inscriptionId?: string | null;
  className?: string;
}

export function LearnerDocumentBlockList({
  contactId,
  contactName,
  contactEmail,
  contactPhone,
  sessionId,
  sessionName,
  centreId,
  inscriptionId,
  className,
}: LearnerDocumentBlockListProps) {
  // Data
  const { blocks, globalStats, isLoading, error, refetch } = useLearnerDocumentBlocks({
    contactId,
    sessionId,
    centreId,
  });

  // Generation
  const generateDoc = useGenerateDocument();
  const downloadDoc = useDownloadGeneratedDoc();
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());

  // Preview
  const [previewItem, setPreviewItem] = useState<DocumentWorkflowItem | null>(null);

  // Email
  const { composerProps, openComposer } = useEmailComposer();

  // ── Handlers ──

  const handleDownload = useCallback(async (item: DocumentWorkflowItem) => {
    if (!item.storagePath) {
      toast.error("Aucun fichier disponible");
      return;
    }

    try {
      const { downloadPdf } = await import("@/lib/documents/pdfResolver");
      const { blob } = await downloadPdf(item.storagePath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.templateName.replace(/\s+/g, "_") + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Document téléchargé");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Erreur de téléchargement — fichier introuvable");
    }
  }, []);

  const handleEmail = useCallback(async (item: DocumentWorkflowItem) => {
    if (!contactEmail || !item.storagePath) {
      toast.error("Email ou fichier manquant");
      return;
    }

    try {
      const { downloadPdfAsBase64 } = await import("@/lib/documents/pdfResolver");
      const result = await downloadPdfAsBase64(item.storagePath);
      if (!result) {
        toast.error("Impossible de récupérer le document pour l'email");
        return;
      }

      // Parse name from contactName
      const nameParts = contactName.split(" ");
      const prenom = nameParts[0] || "";
      const nom = nameParts.slice(1).join(" ") || contactName;

      openComposer({
        recipients: [{
          id: contactId,
          email: contactEmail,
          prenom,
          nom,
        }],
        defaultSubject: `${item.templateName} - ${contactName}`,
        defaultBody: `Bonjour,\n\nVeuillez trouver ci-joint votre ${item.templateName.toLowerCase()}.\n\nCordialement,`,
        attachments: [{
          filename: item.templateName.replace(/\s+/g, "_") + ".pdf",
          content: result.base64,
          contentType: "application/pdf",
        }],
        autoNoteCategory: "apprenant_demander_docs",
        onSuccess: () => refetch(),
      });
    } catch (err) {
      toast.error("Erreur lors de la préparation de l'email");
    }
  }, [contactEmail, contactId, contactName, openComposer, refetch]);

  const handleWhatsApp = useCallback((item: DocumentWorkflowItem) => {
    if (!contactPhone) return;
    
    const message = `Bonjour, voici votre ${item.templateName.toLowerCase()}.`;
    // Open WhatsApp with pre-filled message
    const formatted = contactPhone.replace(/\s/g, "").replace(/^0/, "33");
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, "_blank");
    
    toast.success("WhatsApp ouvert");
  }, [contactPhone]);

  const handleRegenerate = useCallback(async (item: DocumentWorkflowItem) => {
    if (!item.templateId) {
      toast.error("Template non trouvé");
      return;
    }

    setRegeneratingIds(prev => new Set(prev).add(item.id));

    try {
      const variables = await buildVariablesForGeneration({
        contactId,
        sessionId: sessionId ?? undefined,
      });

      await generateDoc.mutateAsync({
        templateId: item.templateId,
        contactId,
        sessionId: sessionId ?? undefined,
        inscriptionId: inscriptionId ?? undefined,
        variables,
      });

      toast.success("Document régénéré");
      refetch();
    } catch (err) {
      toast.error("Erreur de génération");
    } finally {
      setRegeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [contactId, sessionId, inscriptionId, generateDoc, refetch]);

  const handleGenerateAll = useCallback(async () => {
    // Get all items that need generation
    const toGenerate = blocks
      .flatMap(b => b.items)
      .filter(i => 
        i.businessStatus === "a_generer" && 
        !i.isBlocked && 
        i.templateId &&
        !i.id.startsWith("placeholder-")
      );

    // Also include placeholders that have templateId (resolved from expected docs)
    const placeholders = blocks
      .flatMap(b => b.items)
      .filter(i => i.id.startsWith("placeholder-") && !i.isBlocked);

    if (toGenerate.length === 0 && placeholders.length === 0) {
      toast.info("Tous les documents sont déjà générés");
      return;
    }

    toast.info(`Génération de ${toGenerate.length + placeholders.length} document(s)...`);

    // For now, regenerate existing failed/toGenerate docs
    for (const item of toGenerate) {
      await handleRegenerate(item);
    }

    refetch();
  }, [blocks, handleRegenerate, refetch]);

  // ── Render ──

  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-24 w-full mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Erreur de chargement</p>
          <p className="text-sm mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className={className}>
        <LearnerDocumentsOverviewCard stats={globalStats} />
        <div className="text-center py-10 text-muted-foreground mt-4">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Aucun document</p>
          <p className="text-sm mt-1">
            Les documents seront disponibles une fois l'apprenant inscrit à une session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Overview banner */}
      <LearnerDocumentsOverviewCard
        stats={globalStats}
        onGenerateAll={handleGenerateAll}
        onRetryFailed={globalStats.errors > 0 ? handleGenerateAll : undefined}
        isGenerating={generateDoc.isPending}
        isRetrying={false}
      />

      {/* Contract qualification badge */}
      {inscriptionId && (
        <div className="mt-3">
          <ContractQualificationBadge inscriptionId={inscriptionId} />
        </div>
      )}

      {/* Block list */}
      <div className="space-y-3 mt-4">
        {blocks.map((block) => (
          <LearnerDocumentBlockCard
            key={block.block}
            block={block}
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            defaultOpen={block.missing > 0 || block.blocked > 0 || block.errors > 0}
            onItemPreview={setPreviewItem}
            onItemDownload={handleDownload}
            onItemEmail={handleEmail}
            onItemWhatsApp={handleWhatsApp}
            onItemRegenerate={handleRegenerate}
            regeneratingIds={regeneratingIds}
          />
        ))}
      </div>

      {/* Preview drawer */}
      <DocumentPreviewDrawer
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        item={previewItem}
        contactName={contactName}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        sessionName={sessionName}
        onDownload={previewItem ? () => handleDownload(previewItem) : undefined}
        onEmail={previewItem ? () => handleEmail(previewItem) : undefined}
        onWhatsApp={previewItem ? () => handleWhatsApp(previewItem) : undefined}
        onRegenerate={previewItem ? () => handleRegenerate(previewItem) : undefined}
        isRegenerating={previewItem ? regeneratingIds.has(previewItem.id) : false}
      />

      {/* Email composer */}
      <EmailComposerModal {...composerProps} />
    </div>
  );
}
