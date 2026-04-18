import { create } from "zustand";

/**
 * Tracks an in-progress key sequence (e.g. "G" → "D" for Go to Dashboard).
 * Used to display a small hint indicator in the corner of the screen.
 */
interface SequenceState {
  prefix: string | null;
  setPrefix: (key: string | null) => void;
}

export const useShortcutSequence = create<SequenceState>((set) => ({
  prefix: null,
  setPrefix: (prefix) => set({ prefix }),
}));
