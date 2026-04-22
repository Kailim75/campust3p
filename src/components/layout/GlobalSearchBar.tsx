import { Search } from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

/**
 * Always-visible global search bar in the header.
 * Acts as a discoverable entry point for the Command Palette (⌘K).
 * Click / focus → opens the palette. Keyboard accessible.
 */
export function GlobalSearchBar() {
  const open = useCommandPalette((s) => s.open);

  const handle = () => open();
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      onKeyDown={handleKey}
      aria-label="Rechercher dans le CRM (Ctrl+K)"
      className="hidden md:flex items-center gap-2 w-full max-w-[420px] h-9 px-3 rounded-lg border border-border bg-muted/40 text-muted-foreground text-sm hover:bg-muted hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="text-[13px] truncate flex-1 text-left">
        Rechercher apprenant, session, facture…
      </span>
      <kbd className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono shrink-0">
        ⌘K
      </kbd>
    </button>
  );
}
