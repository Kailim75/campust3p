import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  count: number;
  /** What kind of items are selected (e.g. "apprenant", "facture") */
  itemLabel?: { singular: string; plural: string };
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Floating action bar that appears at the bottom of the viewport when
 * one or more items are selected via useBulkSelection.
 *
 * Children should be the actual action buttons (Email, Export, Archive, …)
 * supplied by each list page so the bar stays decoupled from business logic.
 */
export function BulkActionBar({
  count,
  itemLabel = { singular: "élément", plural: "éléments" },
  onClear,
  children,
  className,
}: BulkActionBarProps) {
  if (count === 0) return null;

  const label = count === 1 ? itemLabel.singular : itemLabel.plural;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 pl-4 pr-2 py-2",
        "rounded-full border border-border bg-card shadow-lg",
        "animate-fade-in",
        className,
      )}
      role="region"
      aria-label="Barre d'actions groupées"
    >
      <button
        type="button"
        onClick={onClear}
        className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-muted transition-colors"
        aria-label="Désélectionner tout"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <span className="text-sm font-medium whitespace-nowrap">
        <span className="text-primary">{count}</span>{" "}
        <span className="text-muted-foreground">{label} sélectionné{count > 1 ? "s" : ""}</span>
      </span>

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

/** Convenience inner button matching the bar's compact style */
export function BulkActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "ghost",
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: "ghost" | "destructive";
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant === "destructive" ? "ghost" : "ghost"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 gap-1.5 text-xs rounded-full",
        variant === "destructive" && "text-destructive hover:text-destructive hover:bg-destructive/10",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
