import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HintBubbleProps {
  /** Stable identifier — once dismissed, this hint will never reappear */
  id: string;
  title?: string;
  children: React.ReactNode;
  /** Optional CTA shown on the right of the bubble */
  action?: { label: string; onClick: () => void };
  /** Visual variant */
  variant?: "info" | "tip" | "warning";
  className?: string;
  /** Delay (ms) before showing — avoids flashing on initial mount */
  delay?: number;
}

const STORAGE_PREFIX = "hint-dismissed:";

/**
 * One-shot contextual coach. The user sees it once, dismisses it, and never again.
 * State is stored in localStorage so it survives reloads but is per-device.
 *
 * Use sparingly — these bubbles should reveal non-obvious affordances or
 * shortcuts, not restate what's already on screen.
 */
export function HintBubble({
  id,
  title,
  children,
  action,
  variant = "tip",
  className,
  delay = 300,
}: HintBubbleProps) {
  const storageKey = `${STORAGE_PREFIX}${id}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(storageKey) === "1";
    if (dismissed) return;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [storageKey, delay]);

  const dismiss = () => {
    window.localStorage.setItem(storageKey, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const variantClasses = {
    info: "bg-primary/5 border-primary/20 text-primary",
    tip: "bg-accent/40 border-accent text-accent-foreground",
    warning: "bg-destructive/5 border-destructive/20 text-destructive",
  }[variant];

  return (
    <div
      role="status"
      className={cn(
        "relative flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm animate-fade-in",
        variantClasses,
        className,
      )}
    >
      <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 opacity-80" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium leading-tight mb-0.5">{title}</p>}
        <div className="text-[12.5px] leading-snug opacity-90">{children}</div>
      </div>
      {action && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => {
            action.onClick();
            dismiss();
          }}
        >
          {action.label}
        </Button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Masquer cette astuce"
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
