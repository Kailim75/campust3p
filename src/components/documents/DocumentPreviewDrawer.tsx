// ═══════════════════════════════════════════════════════════════
// DocumentPreviewDrawer — Reusable PDF preview drawer
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download, Mail, RefreshCw, X, Calendar, User, FileText, Tag,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { DocumentHistoryTimeline } from "./DocumentHistoryTimeline";
import { DocumentVersionBadge } from "./DocumentVersionBadge";
import { downloadPdf } from "@/lib/documents/pdfResolver";
import type { DocumentWorkflowItem } from "@/lib/document-workflow/types";

interface DocumentPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DocumentWorkflowItem | null;
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  sessionName?: string | null;
  onDownload?: () => void;
  onEmail?: () => void;
  onWhatsApp?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function DocumentPreviewDrawer({
  open,
  onOpenChange,
  item,
  contactName,
  contactEmail,
  contactPhone,
  sessionName,
  onDownload,
  onEmail,
  onWhatsApp,
  onRegenerate,
  isRegenerating = false,
}: DocumentPreviewDrawerProps) {
  const [pdfData, setPdfData] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load PDF when item changes
  useEffect(() => {
    if (!open || !item?.storagePath) {
      setPdfData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const { blob } = await downloadPdf(item.storagePath!);
        if (!cancelled) {
          setPdfData(blob);
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
        if (!cancelled) {
          setError("Impossible de charger le document");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [open, item?.storagePath]);

  const canRegenerate = item && item.businessStatus !== "signe" && !item.isBlocked;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[600px] sm:max-w-[90vw] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold truncate">
                {item?.templateName ?? "Document"}
              </SheetTitle>
              {item && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <DocumentStatusBadge status={item.businessStatus} />
                  <DocumentVersionBadge item={item} />
                  {item.isRequired && (
                    <Badge variant="outline" className="text-[10px] h-5">Requis</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Actions bar */}
        {item && (
          <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2 flex-wrap flex-shrink-0">
            {onDownload && item.storagePath && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onDownload}>
                <Download className="h-3.5 w-3.5" />
                Télécharger
              </Button>
            )}
            {onEmail && contactEmail && item.storagePath && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onEmail}>
                <Mail className="h-3.5 w-3.5" />
                Email
              </Button>
            )}
            {onWhatsApp && contactPhone && item.storagePath && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                onClick={onWhatsApp}
              >
                <SiWhatsapp className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
            )}
            {canRegenerate && onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 ml-auto"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                Régénérer
              </Button>
            )}
          </div>
        )}

        {/* Metadata */}
        {item && (
          <div className="px-4 py-3 border-b bg-background flex-shrink-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {contactName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{contactName}</span>
                </div>
              )}
              {sessionName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{sessionName}</span>
                </div>
              )}
              {item.generatedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{format(new Date(item.generatedAt), "dd MMM yyyy à HH:mm", { locale: fr })}</span>
                </div>
              )}
              {item.documentType && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="capitalize">{item.documentType.replace(/_/g, " ")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History timeline */}
        {item && item.historySummary.length > 0 && (
          <div className="px-4 py-3 border-b bg-background flex-shrink-0">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">Historique</p>
            <DocumentHistoryTimeline history={item.historySummary} />
          </div>
        )}

        {/* PDF Viewer */}
        <div className="flex-1 min-h-0 bg-muted/20">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-[400px] w-[300px]" />
                <span className="text-sm text-muted-foreground">Chargement...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          ) : !item?.storagePath ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Aucun document à afficher</p>
                {item?.businessStatus === "a_generer" && (
                  <p className="text-xs mt-1">Ce document n'a pas encore été généré</p>
                )}
              </div>
            </div>
          ) : (
            <PDFViewer
              pdfData={pdfData}
              className="h-full"
              onDownload={onDownload}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
