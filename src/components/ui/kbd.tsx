import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
  className?: string;
}

/**
 * Stylized keyboard key component (shadcn-like).
 * Usage: <Kbd>⌘</Kbd><Kbd>K</Kbd>
 */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5",
        "text-[10px] font-mono font-semibold text-muted-foreground",
        "bg-muted border border-border rounded",
        "shadow-[0_1px_0_0_hsl(var(--border))]",
        className
      )}
    >
      {children}
    </kbd>
  );
}

/** Detects if the user is on a Mac (for ⌘ vs Ctrl display). */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent);
}

/** Returns the display string for the meta key based on OS. */
export function metaKeyLabel(): string {
  return isMac() ? "⌘" : "Ctrl";
}
