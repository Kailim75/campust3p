// ═══════════════════════════════════════════════════════════════
// SessionDocumentDetailPanel — Drawer showing docs for one learner/block
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { LearnerDocumentItemCard } from "./LearnerDocumentItemCard";
import { DocumentPreviewDrawer } from "./DocumentPreviewDrawer";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DocumentBlockSummary, DocumentWorkflowItem } from "@/lib/document-workflow/types";

interface SessionDocumentDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  sessionName?: string | null;
  /** If set, show only this block. Otherwise show all blocks. */
  block: DocumentBlockSummary | null;
  /** All blocks for this learner (used when block is null) */
  allBlocks?: DocumentBlockSummary[];
  onRefetch?: () => void;
}

export function SessionDocumentDetailPanel({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactEmail,
  contactPhone,
  sessionName,
  block,
  allBlocks = [],
  onRefetch,
}: SessionDocumentDetailPanelProps) {
  const [previewItem, setPreviewItem] = useState<DocumentWorkflowItem | null>(null);

  const items = block ? block.items : allBlocks.flatMap(b => b.items);
  const label = block ? block.label : "Tous les documents";

  // ── Handlers ──
  const handleDownload = useCallback(async (item: DocumentWorkflowItem) => {
    if (!item.storagePath) return;
    try {
      const { data, error } = await supabase.storage.from("generated-docs").download(item.storagePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.templateName.replace(/\s+/g, "_") + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Document téléchargé");
    } catch {
      toast.error("Erreur de téléchargement");
    }
  }, []);

  const handleWhatsApp = useCallback((item: DocumentWorkflowItem) => {
    if (!contactPhone) return;
    const message = `Bonjour, voici votre ${item.templateName.toLowerCase()}.`;
    const formatted = contactPhone.replace(/\s/g, "").replace(/^0/, "33");
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, "_blank");
  }, [contactPhone]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[520px] sm:max-w-[90vw] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold truncate">
                  {contactName}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] h-5">{label}</Badge>
                  {block && (
                    <span className="text-[11px] text-muted-foreground">
                      {block.generated}/{block.totalExpected} générés
                    </span>
                  )}
                </div>
              </div>
              {contactId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => {
                    // Navigate to learner profile (generic approach)
                    window.open(`/contacts?id=${contactId}`, "_blank");
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Fiche
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Aucun document dans ce bloc
              </div>
            ) : (
              items.map((item) => (
                <LearnerDocumentItemCard
                  key={item.id}
                  item={item}
                  contactEmail={contactEmail}
                  contactPhone={contactPhone}
                  onPreview={() => setPreviewItem(item)}
                  onDownload={item.storagePath ? () => handleDownload(item) : undefined}
                  onWhatsApp={contactPhone ? () => handleWhatsApp(item) : undefined}
                />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview drawer */}
      <DocumentPreviewDrawer
        open={!!previewItem}
        onOpenChange={(o) => !o && setPreviewItem(null)}
        item={previewItem}
        contactName={contactName}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        sessionName={sessionName}
        onDownload={previewItem?.storagePath ? () => handleDownload(previewItem) : undefined}
        onWhatsApp={previewItem && contactPhone ? () => handleWhatsApp(previewItem) : undefined}
      />
    </>
  );
}
