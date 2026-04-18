// ═══════════════════════════════════════════════════════════════
// useContactSheetNavigation — Keyboard navigation between contacts
// inside the side Sheet. Arrows ↑/↓ or J/K, disabled in inputs.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useCallback } from "react";

interface NavOptions {
  ids: string[];
  currentId: string | null;
  enabled: boolean;
  onChange: (nextId: string) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  // Inside a Radix Select / Combobox listbox
  if (target.closest("[role='listbox'], [role='combobox']")) return true;
  return false;
}

export function useContactSheetNavigation({ ids, currentId, enabled, onChange }: NavOptions) {
  const currentIndex = useMemo(
    () => (currentId ? ids.indexOf(currentId) : -1),
    [ids, currentId],
  );
  const total = ids.length;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < total - 1;

  const goPrevious = useCallback(() => {
    if (hasPrevious) onChange(ids[currentIndex - 1]);
  }, [hasPrevious, ids, currentIndex, onChange]);

  const goNext = useCallback(() => {
    if (hasNext) onChange(ids[currentIndex + 1]);
  }, [hasNext, ids, currentIndex, onChange]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      // Avoid clashing with browser shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "arrowdown" || key === "j") {
        if (hasNext) {
          e.preventDefault();
          goNext();
        }
      } else if (key === "arrowup" || key === "k") {
        if (hasPrevious) {
          e.preventDefault();
          goPrevious();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, hasNext, hasPrevious, goNext, goPrevious]);

  return {
    currentIndex: currentIndex >= 0 ? currentIndex + 1 : 0, // 1-based for display
    total,
    hasPrevious,
    hasNext,
    goPrevious,
    goNext,
  };
}
