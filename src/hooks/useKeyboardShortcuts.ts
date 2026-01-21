import { useEffect, useCallback } from "react";

type ShortcutHandler = () => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description: string;
}

const shortcuts: Shortcut[] = [];

/**
 * Register a keyboard shortcut
 */
export function useKeyboardShortcut(
  key: string,
  handler: ShortcutHandler,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean; description?: string } = {}
) {
  const { ctrl = false, shift = false, alt = false, description = "" } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const ctrlMatch = ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
      const altMatch = alt ? e.altKey : !e.altKey;
      const keyMatch = e.key.toLowerCase() === key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrl, shift, alt, handler]);
}

/**
 * Global shortcuts registry for help display
 */
export const globalShortcuts = [
  { keys: ["Ctrl", "N"], description: "Nouveau contact" },
  { keys: ["Ctrl", "S"], description: "Nouvelle session" },
  { keys: ["Ctrl", "P"], description: "Nouveau paiement" },
  { keys: ["Ctrl", "K"], description: "Recherche globale" },
  { keys: ["?"], description: "Aide raccourcis" },
  { keys: ["Esc"], description: "Fermer le modal" },
];

/**
 * Hook for common global shortcuts
 */
export function useGlobalShortcuts(actions: {
  onNewContact?: () => void;
  onNewSession?: () => void;
  onNewPayment?: () => void;
  onSearch?: () => void;
  onHelp?: () => void;
}) {
  useKeyboardShortcut("n", actions.onNewContact || (() => {}), { 
    ctrl: true, 
    description: "Nouveau contact" 
  });
  
  useKeyboardShortcut("s", actions.onNewSession || (() => {}), { 
    ctrl: true, 
    description: "Nouvelle session" 
  });
  
  useKeyboardShortcut("p", actions.onNewPayment || (() => {}), { 
    ctrl: true, 
    description: "Nouveau paiement" 
  });
  
  useKeyboardShortcut("k", actions.onSearch || (() => {}), { 
    ctrl: true, 
    description: "Recherche globale" 
  });
  
  useKeyboardShortcut("?", actions.onHelp || (() => {}), { 
    shift: true, 
    description: "Aide raccourcis" 
  });
}
