import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UndoToastProps {
  message: string;
  durationMs: number;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Custom undo toast — slides up from bottom with a draining progress bar.
 * Esc handling lives at the global level (useGlobalUndoEscListener).
 */
export function UndoToast({ message, durationMs, onUndo, onDismiss }: UndoToastProps) {
  const [remaining, setRemaining] = useState(durationMs);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, durationMs - elapsed);
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [durationMs]);

  const pct = Math.max(0, Math.min(100, (remaining / durationMs) * 100));

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className={cn(
        "relative w-[360px] overflow-hidden rounded-lg border bg-background shadow-lg",
        "border-border"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Trash2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm text-foreground truncate">{message}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs font-medium text-primary hover:text-primary"
          onClick={onUndo}
        >
          Annuler
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground"
          onClick={onDismiss}
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {/* Progress bar */}
      <div
        className="h-0.5 bg-primary transition-[width] ease-linear"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
    </motion.div>
  );
}
