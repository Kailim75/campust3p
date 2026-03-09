// ═══════════════════════════════════════════════════════════════
// DocumentQuickActions — Action buttons/dropdown for a document
// ═══════════════════════════════════════════════════════════════

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eye, Download, Mail, RefreshCw, MoreHorizontal,
  MessageCircle, AlertCircle, ExternalLink,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import type { DocumentWorkflowItem } from "@/lib/document-workflow/types";

interface DocumentQuickActionsProps {
  item: DocumentWorkflowItem;
  contactPhone?: string | null;
  contactEmail?: string | null;
  onPreview?: () => void;
  onDownload?: () => void;
  onEmail?: () => void;
  onWhatsApp?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  compact?: boolean;
  className?: string;
}

export function DocumentQuickActions({
  item,
  contactPhone,
  contactEmail,
  onPreview,
  onDownload,
  onEmail,
  onWhatsApp,
  onRegenerate,
  isRegenerating = false,
  compact = false,
  className,
}: DocumentQuickActionsProps) {
  const hasFile = !!item.fileUrl || !!item.storagePath;
  const canRegenerate = item.businessStatus !== "signe" && !item.isBlocked;
  const isPlaceholder = item.id.startsWith("placeholder-");

  if (isPlaceholder) {
    // Show generate action for placeholders
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {item.isBlocked ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" disabled>
                  <AlertCircle className="h-3.5 w-3.5" />
                  Bloqué
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs font-medium mb-1">Données manquantes :</p>
                <ul className="text-xs space-y-0.5">
                  {item.missingRequiredFields.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : onRegenerate ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Générer"
            )}
          </Button>
        ) : null}
      </div>
    );
  }

  if (compact) {
    // Compact mode: single dropdown with all actions
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", className)}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {hasFile && onPreview && (
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-3.5 w-3.5 mr-2" />
              Visualiser
            </DropdownMenuItem>
          )}
          {hasFile && onDownload && (
            <DropdownMenuItem onClick={onDownload}>
              <Download className="h-3.5 w-3.5 mr-2" />
              Télécharger PDF
            </DropdownMenuItem>
          )}
          {hasFile && onEmail && contactEmail && (
            <DropdownMenuItem onClick={onEmail}>
              <Mail className="h-3.5 w-3.5 mr-2" />
              Envoyer par email
            </DropdownMenuItem>
          )}
          {hasFile && onWhatsApp && contactPhone && (
            <DropdownMenuItem onClick={onWhatsApp}>
              <SiWhatsapp className="h-3.5 w-3.5 mr-2" />
              Partager WhatsApp
            </DropdownMenuItem>
          )}
          {canRegenerate && onRegenerate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRegenerate} disabled={isRegenerating}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isRegenerating && "animate-spin")} />
                Régénérer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Expanded mode: visible buttons + dropdown for less common actions
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {hasFile && onPreview && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPreview}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Visualiser</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {hasFile && onDownload && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDownload}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Télécharger</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {hasFile && onEmail && contactEmail && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEmail}>
                <Mail className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Email</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {hasFile && onWhatsApp && contactPhone && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700"
                onClick={onWhatsApp}
              >
                <SiWhatsapp className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">WhatsApp</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {canRegenerate && onRegenerate && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRegenerate} disabled={isRegenerating}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isRegenerating && "animate-spin")} />
              Régénérer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
