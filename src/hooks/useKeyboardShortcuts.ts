import { useEffect, useCallback, useRef } from "react";
import { useShortcutSequence } from "@/hooks/useShortcutSequence";

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

/** Returns true if the keyboard event originated from an editable element. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Register a single keyboard shortcut (with modifiers).
 * Skips when focus is in an editable element.
 */
export function useKeyboardShortcut(
  key: string,
  handler: ShortcutHandler,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean; description?: string } = {}
) {
  const { ctrl = false, shift = false, alt = false } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

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
 * Hook for two-key sequences (e.g. "G" then "D" for Go Dashboard).
 * Each prefix → map of secondary key → handler.
 * Skips entirely when focus is in an editable element so typing isn't intercepted.
 */
export function useSequenceShortcuts(
  sequences: Record<string, Record<string, ShortcutHandler>>
) {
  const setPrefix = useShortcutSequence((s) => s.setPrefix);
  const prefixRef = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearPrefix = useCallback(() => {
    prefixRef.current = null;
    setPrefix(null);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [setPrefix]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never intercept while typing
      if (isEditableTarget(e.target)) return;
      // Ignore modifier-prefixed combos (let other handlers deal with them)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // If a prefix is pending, look up the secondary action
      if (prefixRef.current) {
        const map = sequences[prefixRef.current];
        const handler = map?.[key];
        if (handler) {
          e.preventDefault();
          handler();
        }
        clearPrefix();
        return;
      }

      // Otherwise, check if this key is a known prefix
      if (sequences[key]) {
        e.preventDefault();
        prefixRef.current = key;
        setPrefix(key);
        timeoutRef.current = window.setTimeout(clearPrefix, 1500);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [sequences, setPrefix, clearPrefix]);
}

/**
 * Global shortcuts registry for help dialog.
 * Grouped by category for the ShortcutsDialog.
 */
export const shortcutGroups: Array<{
  title: string;
  items: Array<{ keys: string[]; description: string }>;
}> = [
  {
    title: "Général",
    items: [
      { keys: ["⌘", "K"], description: "Ouvrir la recherche globale" },
      { keys: ["?"], description: "Afficher les raccourcis" },
      { keys: ["Esc"], description: "Fermer / annuler la dernière action" },
      { keys: ["⌘", "Z"], description: "Annuler la dernière action" },
    ],
  },
  {
    title: "Navigation (G puis…)",
    items: [
      { keys: ["G", "D"], description: "Tableau de bord" },
      { keys: ["G", "A"], description: "Apprenants" },
      { keys: ["G", "P"], description: "Prospects" },
      { keys: ["G", "S"], description: "Sessions" },
      { keys: ["G", "F"], description: "Finances" },
      { keys: ["G", "C"], description: "Catalogue formations" },
      { keys: ["G", "I"], description: "Inbox emails" },
      { keys: ["G", "R"], description: "Réglages" },
    ],
  },
  {
    title: "Création (N puis…)",
    items: [
      { keys: ["N", "A"], description: "Nouvel apprenant" },
      { keys: ["N", "P"], description: "Nouveau prospect" },
      { keys: ["N", "S"], description: "Nouvelle session" },
      { keys: ["N", "F"], description: "Nouvelle facture" },
      { keys: ["N", "C"], description: "Nouvelle formation" },
    ],
  },
];

/**
 * Legacy flat list — kept for backward compatibility with the old dialog.
 * @deprecated Use `shortcutGroups` instead.
 */
export const globalShortcuts = shortcutGroups.flatMap((g) => g.items);

/**
 * Legacy hook (Ctrl+letter shortcuts). Kept for backward compatibility.
 * @deprecated Prefer `useGlobalShortcutsV2` (sequence-based).
 */
export function useGlobalShortcuts(actions: {
  onNewContact?: () => void;
  onNewSession?: () => void;
  onNewPayment?: () => void;
  onSearch?: () => void;
  onHelp?: () => void;
  onExport?: () => void;
  onDashboard?: () => void;
  onFilters?: () => void;
  onGoContacts?: () => void;
  onGoSessions?: () => void;
  onGoFacturation?: () => void;
}) {
  useKeyboardShortcut("k", actions.onSearch || (() => {}), { ctrl: true });
  useKeyboardShortcut("?", actions.onHelp || (() => {}), { shift: true });
}

/**
 * Modern global shortcuts: Cmd/Ctrl+K, ?, and G/N sequences.
 * Skips all single-letter shortcuts while focus is in an editable element.
 */
export function useGlobalShortcutsV2(actions: {
  // General
  onSearch: () => void;
  onHelp: () => void;
  // Navigation
  onGoDashboard?: () => void;
  onGoApprenants?: () => void;
  onGoProspects?: () => void;
  onGoSessions?: () => void;
  onGoFinances?: () => void;
  onGoFormations?: () => void;
  onGoInbox?: () => void;
  onGoSettings?: () => void;
  // Creation
  onNewApprenant?: () => void;
  onNewProspect?: () => void;
  onNewSession?: () => void;
  onNewFacture?: () => void;
  onNewFormation?: () => void;
}) {
  // ⌘K / Ctrl+K → Command Palette
  useKeyboardShortcut("k", actions.onSearch, { ctrl: true });
  // Shift + ? → help dialog
  useKeyboardShortcut("?", actions.onHelp, { shift: true });

  // Memoized sequence map — handlers can change between renders, so we rebuild each call
  const noop = () => {};
  useSequenceShortcuts({
    g: {
      d: actions.onGoDashboard || noop,
      a: actions.onGoApprenants || noop,
      p: actions.onGoProspects || noop,
      s: actions.onGoSessions || noop,
      f: actions.onGoFinances || noop,
      c: actions.onGoFormations || noop,
      i: actions.onGoInbox || noop,
      r: actions.onGoSettings || noop,
    },
    n: {
      a: actions.onNewApprenant || noop,
      p: actions.onNewProspect || noop,
      s: actions.onNewSession || noop,
      f: actions.onNewFacture || noop,
      c: actions.onNewFormation || noop,
    },
  });
}
