// ═══════════════════════════════════════════════════════════════
// DocumentStatusBadge — Unified status badge for document workflow
// ═══════════════════════════════════════════════════════════════

import { Badge } from "@/components/ui/badge";
import {
  Minus, FilePlus, AlertTriangle, FileCheck, Eye,
  Send, BookOpen, CheckCircle, Archive, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentBusinessStatus } from "@/lib/document-workflow/types";

interface DocumentStatusBadgeProps {
  status: DocumentBusinessStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const STATUS_META: Record<DocumentBusinessStatus, {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: typeof CheckCircle;
}> = {
  non_requis: {
    label: "Non requis",
    bgClass: "bg-muted/50",
    textClass: "text-muted-foreground",
    borderClass: "border-muted",
    icon: Minus,
  },
  a_generer: {
    label: "À générer",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
    icon: FilePlus,
  },
  incomplet: {
    label: "Incomplet",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
    icon: AlertTriangle,
  },
  genere: {
    label: "Généré",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
    icon: FileCheck,
  },
  a_verifier: {
    label: "À vérifier",
    bgClass: "bg-yellow-50",
    textClass: "text-yellow-700",
    borderClass: "border-yellow-200",
    icon: Eye,
  },
  envoye: {
    label: "Envoyé",
    bgClass: "bg-indigo-50",
    textClass: "text-indigo-700",
    borderClass: "border-indigo-200",
    icon: Send,
  },
  consulte: {
    label: "Consulté",
    bgClass: "bg-teal-50",
    textClass: "text-teal-700",
    borderClass: "border-teal-200",
    icon: BookOpen,
  },
  signe: {
    label: "Signé",
    bgClass: "bg-green-50",
    textClass: "text-green-700",
    borderClass: "border-green-200",
    icon: CheckCircle,
  },
  archive: {
    label: "Archivé",
    bgClass: "bg-muted/30",
    textClass: "text-muted-foreground",
    borderClass: "border-muted",
    icon: Archive,
  },
  erreur: {
    label: "Erreur",
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
    borderClass: "border-destructive/30",
    icon: XCircle,
  },
};

export function DocumentStatusBadge({
  status,
  size = "sm",
  showIcon = true,
  className,
}: DocumentStatusBadgeProps) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        meta.bgClass,
        meta.textClass,
        meta.borderClass,
        size === "sm" ? "text-[10px] h-5 gap-0.5 px-1.5" : "text-xs h-6 gap-1 px-2",
        className
      )}
    >
      {showIcon && (
        <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      )}
      {meta.label}
    </Badge>
  );
}

export function getStatusPriority(status: DocumentBusinessStatus): number {
  const priority: Record<DocumentBusinessStatus, number> = {
    erreur: 1,
    incomplet: 2,
    a_generer: 3,
    a_verifier: 4,
    genere: 5,
    envoye: 6,
    signe: 7,
    consulte: 8,
    archive: 9,
    non_requis: 10,
  };
  return priority[status];
}
