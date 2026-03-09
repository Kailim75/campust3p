// ═══════════════════════════════════════════════════════════════
// LearnerDocumentBlockCard — Collapsible block with documents
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  LogIn,
  ClipboardList,
  GraduationCap,
  Receipt,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LearnerDocumentItemCard } from "./LearnerDocumentItemCard";
import type { DocumentBlockSummary, DocumentWorkflowItem, DocumentBlock } from "@/lib/document-workflow/types";

interface LearnerDocumentBlockCardProps {
  block: DocumentBlockSummary;
  contactEmail?: string | null;
  contactPhone?: string | null;
  defaultOpen?: boolean;
  onItemPreview?: (item: DocumentWorkflowItem) => void;
  onItemDownload?: (item: DocumentWorkflowItem) => void;
  onItemEmail?: (item: DocumentWorkflowItem) => void;
  onItemWhatsApp?: (item: DocumentWorkflowItem) => void;
  onItemRegenerate?: (item: DocumentWorkflowItem) => void;
  regeneratingIds?: Set<string>;
  className?: string;
}

const BLOCK_ICONS: Record<DocumentBlock, typeof LogIn> = {
  entree: LogIn,
  suivi: ClipboardList,
  fin: GraduationCap,
  finances: Receipt,
  specifiques: FolderOpen,
};

export function LearnerDocumentBlockCard({
  block,
  contactEmail,
  contactPhone,
  defaultOpen = false,
  onItemPreview,
  onItemDownload,
  onItemEmail,
  onItemWhatsApp,
  onItemRegenerate,
  regeneratingIds = new Set(),
  className,
}: LearnerDocumentBlockCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || block.missing > 0 || block.blocked > 0);

  const Icon = BLOCK_ICONS[block.block] ?? FolderOpen;
  const progressPercent = block.totalExpected > 0
    ? Math.round((block.generated / block.totalExpected) * 100)
    : 0;

  const isComplete = block.missing === 0 && block.blocked === 0 && block.errors === 0;
  const hasIssues = block.blocked > 0 || block.errors > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("overflow-hidden", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors p-3">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div
                className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  isComplete ? "bg-green-100" :
                  hasIssues ? "bg-orange-100" :
                  "bg-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isComplete ? "text-green-600" :
                    hasIssues ? "text-orange-600" :
                    "text-primary"
                  )}
                />
              </div>

              {/* Title + stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{block.label}</span>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-1.5">
                    {isComplete && (
                      <Badge variant="outline" className="text-[10px] h-5 gap-0.5 bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Complet
                      </Badge>
                    )}
                    {block.blocked > 0 && (
                      <Badge variant="outline" className="text-[10px] h-5 gap-0.5 bg-orange-50 text-orange-700 border-orange-200">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {block.blocked} bloqué{block.blocked > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {block.errors > 0 && (
                      <Badge variant="outline" className="text-[10px] h-5 gap-0.5 bg-destructive/10 text-destructive border-destructive/30">
                        {block.errors} erreur{block.errors > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mt-1.5">
                  <Progress value={progressPercent} className="h-1.5 flex-1 max-w-[120px]" />
                  <span className="text-[11px] text-muted-foreground">
                    {block.generated}/{block.totalExpected}
                  </span>
                </div>
              </div>

              {/* Chevron */}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-3 pt-0 space-y-2">
            {block.items.map((item) => (
              <LearnerDocumentItemCard
                key={item.id}
                item={item}
                contactEmail={contactEmail}
                contactPhone={contactPhone}
                onPreview={onItemPreview ? () => onItemPreview(item) : undefined}
                onDownload={onItemDownload ? () => onItemDownload(item) : undefined}
                onEmail={onItemEmail ? () => onItemEmail(item) : undefined}
                onWhatsApp={onItemWhatsApp ? () => onItemWhatsApp(item) : undefined}
                onRegenerate={onItemRegenerate ? () => onItemRegenerate(item) : undefined}
                isRegenerating={regeneratingIds.has(item.id)}
              />
            ))}

            {block.items.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Aucun document dans ce bloc
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
