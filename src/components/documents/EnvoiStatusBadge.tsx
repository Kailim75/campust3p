// ═══════════════════════════════════════════════════════════════
// EnvoiStatusBadge — Shared badge for document send statuses
// Source of truth for envoi status display across the app
// Supports only real DB statuses: envoyé, livré, echec, généré
// ═══════════════════════════════════════════════════════════════

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Inbox, XCircle, FileText, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EnvoiStatusConfig {
  label: string;
  icon: typeof CheckCircle2;
  className: string;
}

/**
 * Canonical envoi status config — DB values only, no fictional statuses.
 * Handles accented and non-accented variants.
 */
const ENVOI_STATUS_CONFIG: Record<string, EnvoiStatusConfig> = {
  "envoyé":  { label: "Envoyé",  icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  "envoye":  { label: "Envoyé",  icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  "livré":   { label: "Livré",   icon: Inbox,        className: "bg-info/10 text-info border-info/20" },
  "livre":   { label: "Livré",   icon: Inbox,        className: "bg-info/10 text-info border-info/20" },
  "echec":   { label: "Échec",   icon: XCircle,      className: "bg-destructive/10 text-destructive border-destructive/20" },
  "généré":  { label: "Généré",  icon: FileText,     className: "bg-muted text-muted-foreground border-muted" },
  "genere":  { label: "Généré",  icon: FileText,     className: "bg-muted text-muted-foreground border-muted" },
};

/** Resolve config for a given envoi status string */
export function getEnvoiStatusConfig(statut: string): EnvoiStatusConfig {
  return ENVOI_STATUS_CONFIG[statut.toLowerCase()] ?? {
    label: statut,
    icon: Clock,
    className: "bg-muted text-muted-foreground border-muted",
  };
}

interface EnvoiStatusBadgeProps {
  statut: string;
  size?: "sm" | "default";
  className?: string;
  showIcon?: boolean;
}

export function EnvoiStatusBadge({
  statut,
  size = "default",
  className,
  showIcon = false,
}: EnvoiStatusBadgeProps) {
  const config = getEnvoiStatusConfig(statut);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      {showIcon && <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}
