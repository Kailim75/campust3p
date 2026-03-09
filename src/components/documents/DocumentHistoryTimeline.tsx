// ═══════════════════════════════════════════════════════════════
// DocumentHistoryTimeline — Chronological audit trail for a document
// ═══════════════════════════════════════════════════════════════

import { Badge } from "@/components/ui/badge";
import {
  FileCheck, Send, CheckCircle, XCircle, Archive, Eye, MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DocumentHistoryEntry } from "@/lib/document-workflow/types";

interface DocumentHistoryTimelineProps {
  history: DocumentHistoryEntry[];
  className?: string;
}

const ACTION_META: Record<DocumentHistoryEntry["action"], {
  label: string;
  icon: typeof FileCheck;
  color: string;
}> = {
  generated: { label: "Généré", icon: FileCheck, color: "text-blue-600 bg-blue-100" },
  sent: { label: "Envoyé", icon: Send, color: "text-indigo-600 bg-indigo-100" },
  signed: { label: "Signé", icon: CheckCircle, color: "text-green-600 bg-green-100" },
  refused: { label: "Refusé", icon: XCircle, color: "text-destructive bg-destructive/10" },
  failed: { label: "Échec", icon: XCircle, color: "text-destructive bg-destructive/10" },
  archived: { label: "Archivé", icon: Archive, color: "text-muted-foreground bg-muted" },
  viewed: { label: "Consulté", icon: Eye, color: "text-teal-600 bg-teal-100" },
  shared_whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-green-600 bg-green-100" },
};

export function DocumentHistoryTimeline({
  history,
  className,
}: DocumentHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <div className={cn("text-center py-4 text-xs text-muted-foreground", className)}>
        Aucun historique disponible
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {history.map((entry, i) => {
        const meta = ACTION_META[entry.action];
        const Icon = meta.icon;
        const isLast = i === history.length - 1;

        return (
          <div key={`${entry.action}-${entry.at}-${i}`} className="flex gap-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={cn("p-1 rounded-full flex-shrink-0", meta.color)}>
                <Icon className="h-3 w-3" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border min-h-[16px]" />}
            </div>

            {/* Content */}
            <div className="pb-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium">{meta.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(entry.at), "dd MMM yyyy à HH:mm", { locale: fr })}
                </span>
              </div>
              {entry.by && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  par {entry.by}
                </p>
              )}
              {entry.details && (
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                  {entry.details}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
