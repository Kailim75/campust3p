import { create } from "zustand";

interface ShortcutsDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

/**
 * Global store for the Keyboard Shortcuts help dialog.
 * Lets the Header "?" button open the dialog without prop drilling.
 */
export const useShortcutsDialog = create<ShortcutsDialogState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setOpen: (isOpen) => set({ isOpen }),
}));
