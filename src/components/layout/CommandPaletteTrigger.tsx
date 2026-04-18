import { Search } from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

/**
 * Discrete trigger button shown in headers.
 * Opens the global Command Palette via the zustand store.
 */
export function CommandPaletteTrigger() {
  const open = useCommandPalette((s) => s.open);

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Ouvrir la recherche globale (Ctrl+K)"
      className="hidden md:flex items-center gap-2 px-3 h-8 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="text-[13px]">Rechercher...</span>
      <kbd className="ml-4 text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
    </button>
  );
}
