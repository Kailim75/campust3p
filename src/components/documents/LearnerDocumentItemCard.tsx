// ═══════════════════════════════════════════════════════════════
// LearnerDocumentItemCard — Individual document card within a block
// ═══════════════════════════════════════════════════════════════

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Lock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { DocumentQuickActions } from "./DocumentQuickActions";
import type { DocumentWorkflowItem } from "@/lib/document-workflow/types";

interface LearnerDocumentItemCardProps {
  item: DocumentWorkflowItem;
  contactEmail?: string | null;
  contactPhone?: string | null;
  onPreview?: () => void;
  onDownload?: () => void;
  onEmail?: () => void;
  onWhatsApp?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  className?: string;
}

export function LearnerDocumentItemCard({
  item,
  contactEmail,
  contactPhone,
  onPreview,
  onDownload,
  onEmail,
  onWhatsApp,
  onRegenerate,
  isRegenerating,
  className,
}: LearnerDocumentItemCardProps) {
  const isPlaceholder = item.id.startsWith("placeholder-");
  const hasFile = !!item.storagePath;
  
  // Visual states
  const isBlocked = item.isBlocked && item.isRequired;
  const isError = item.businessStatus === "erreur";
  const isSuccess = ["genere", "envoye", "signe"].includes(item.businessStatus);
  const isPending = ["a_generer", "incomplet"].includes(item.businessStatus);

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-sm",
        isBlocked && "border-orange-200 bg-orange-50/30",
        isError && "border-destructive/30 bg-destructive/5",
        isSuccess && !isPlaceholder && "border-green-200/50",
        isPending && !isBlocked && "border-amber-200/50 bg-amber-50/20",
        className
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          {/* Left: icon + info */}
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div
              className={cn(
                "p-1.5 rounded-md flex-shrink-0 mt-0.5",
                isBlocked ? "bg-orange-100" :
                isError ? "bg-destructive/10" :
                isSuccess ? "bg-green-100" :
                isPending ? "bg-amber-100" :
                "bg-primary/10"
              )}
            >
              {isBlocked ? (
                <Lock className="h-4 w-4 text-orange-600" />
              ) : isError ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <FileText
                  className={cn(
                    "h-4 w-4",
                    isSuccess ? "text-green-600" :
                    isPending ? "text-amber-600" :
                    "text-primary"
                  )}
                />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm truncate">{item.templateName}</p>
                {item.isRequired && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">Requis</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <DocumentStatusBadge status={item.businessStatus} size="sm" />
                
                {item.generatedAt && !isPlaceholder && (
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(item.generatedAt), "dd/MM/yy", { locale: fr })}
                  </span>
                )}
                
                {item.sendStatus === "sent" && item.sentAt && (
                  <span className="text-[11px] text-indigo-600">
                    Envoyé {format(new Date(item.sentAt), "dd/MM", { locale: fr })}
                  </span>
                )}
                
                {item.signatureStatus === "signed" && item.signedAt && (
                  <span className="text-[11px] text-green-600">
                    Signé {format(new Date(item.signedAt), "dd/MM", { locale: fr })}
                  </span>
                )}
              </div>

              {/* Missing fields warning */}
              {isBlocked && item.missingRequiredFields.length > 0 && (
                <div className="mt-1.5 text-[11px] text-orange-700 bg-orange-50 rounded px-2 py-1">
                  <span className="font-medium">Manquant :</span>{" "}
                  {item.missingRequiredFields.slice(0, 2).join(", ")}
                  {item.missingRequiredFields.length > 2 && (
                    <span> (+{item.missingRequiredFields.length - 2})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <DocumentQuickActions
            item={item}
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            onPreview={hasFile ? onPreview : undefined}
            onDownload={hasFile ? onDownload : undefined}
            onEmail={hasFile ? onEmail : undefined}
            onWhatsApp={hasFile ? onWhatsApp : undefined}
            onRegenerate={onRegenerate}
            isRegenerating={isRegenerating}
            compact={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}
