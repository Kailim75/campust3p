import { create } from "zustand";
import { toast } from "sonner";

export interface UndoableAction {
  id: string;
  description: string;
  undo: () => Promise<void>;
  timestamp: number;
}

interface UndoState {
  lastAction: UndoableAction | null;
  setLastAction: (action: UndoableAction | null) => void;
  undo: () => Promise<void>;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  lastAction: null,
  
  setLastAction: (action) => {
    set({ lastAction: action });
    
    // Auto-clear after 30 seconds
    if (action) {
      setTimeout(() => {
        const current = get().lastAction;
        if (current?.id === action.id) {
          set({ lastAction: null });
        }
      }, 30000);
    }
  },
  
  undo: async () => {
    const { lastAction } = get();
    if (!lastAction) {
      toast.info("Aucune action à annuler");
      return;
    }
    
    try {
      await lastAction.undo();
      toast.success(`Action annulée : ${lastAction.description}`);
      set({ lastAction: null });
    } catch (error) {
      toast.error("Impossible d'annuler cette action");
      console.error("Undo error:", error);
    }
  },
}));

// Hook to create undoable actions
export function useUndoAction() {
  const setLastAction = useUndoStore((state) => state.setLastAction);
  
  const registerUndo = (
    description: string,
    undoFn: () => Promise<void>
  ) => {
    const action: UndoableAction = {
      id: crypto.randomUUID(),
      description,
      undo: undoFn,
      timestamp: Date.now(),
    };
    
    setLastAction(action);
    
    // Show toast with undo button
    toast.success(description, {
      action: {
        label: "Annuler",
        onClick: async () => {
          await undoFn();
          setLastAction(null);
          toast.success(`Annulé : ${description}`);
        },
      },
      duration: 8000,
    });
  };
  
  return { registerUndo };
}
