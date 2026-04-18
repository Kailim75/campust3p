import { create } from "zustand";
import { toast } from "sonner";
import { useEffect } from "react";

export interface UndoableAction {
  id: string;
  description: string;
  undo: () => Promise<void>;
  commit?: () => Promise<void>;
  timestamp: number;
  toastId?: string | number;
}

interface UndoState {
  // FIFO queue, newest at the end. Max 3 concurrent.
  queue: UndoableAction[];
  enqueue: (action: UndoableAction) => void;
  remove: (id: string) => void;
  undoLast: () => Promise<void>;
}

const MAX_QUEUE = 3;

export const useUndoStore = create<UndoState>((set, get) => ({
  queue: [],

  enqueue: (action) => {
    set((state) => {
      let next = [...state.queue, action];
      // Drop oldest if exceeding max — auto-commit dropped action
      while (next.length > MAX_QUEUE) {
        const dropped = next.shift();
        if (dropped) {
          dropped.commit?.().catch(() => {});
          if (dropped.toastId) toast.dismiss(dropped.toastId);
        }
      }
      return { queue: next };
    });
  },

  remove: (id) => {
    set((state) => ({ queue: state.queue.filter((a) => a.id !== id) }));
  },

  undoLast: async () => {
    const { queue } = get();
    const last = queue[queue.length - 1];
    if (!last) {
      toast.info("Aucune action à annuler");
      return;
    }
    try {
      await last.undo();
      if (last.toastId) toast.dismiss(last.toastId);
      set((state) => ({ queue: state.queue.filter((a) => a.id !== last.id) }));
      toast.success(`Annulé : ${last.description}`);
    } catch (err) {
      console.error("Undo error:", err);
      toast.error("Impossible d'annuler cette action");
    }
  },
}));

/**
 * Mounts a global Esc listener that triggers undoLast() when an undo action is pending.
 * Should be mounted once at app root.
 */
export function useGlobalUndoEscListener() {
  const undoLast = useUndoStore((s) => s.undoLast);
  const queue = useUndoStore((s) => s.queue);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (queue.length === 0) return;
      // Don't intercept when typing in inputs/textareas/contenteditable
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      e.preventDefault();
      undoLast();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [queue.length, undoLast]);
}

/**
 * Legacy hook kept for backward compatibility — registers a single undoable toast.
 */
export function useUndoAction() {
  const enqueue = useUndoStore((s) => s.enqueue);

  const registerUndo = (description: string, undoFn: () => Promise<void>) => {
    const id = crypto.randomUUID();
    const toastId = toast.success(description, {
      action: {
        label: "Annuler",
        onClick: async () => {
          try {
            await undoFn();
            useUndoStore.getState().remove(id);
            toast.success(`Annulé : ${description}`);
          } catch {
            toast.error("Impossible d'annuler cette action");
          }
        },
      },
      duration: 8000,
    });

    enqueue({
      id,
      description,
      undo: undoFn,
      timestamp: Date.now(),
      toastId,
    });

    setTimeout(() => useUndoStore.getState().remove(id), 8000);
  };

  return { registerUndo };
}
