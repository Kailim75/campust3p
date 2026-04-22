import { create } from "zustand";

/**
 * Global handlers for the unified Header creation menu (Chantier 1).
 * Registered once by the root <Index /> page; consumed by every <Header />
 * instance without prop drilling through 18+ pages.
 */
interface GlobalCreateState {
  onNewContact: (() => void) | null;
  onNewProspect: (() => void) | null;
  onNavigate: ((section: string) => void) | null;
  register: (handlers: {
    onNewContact: () => void;
    onNewProspect: () => void;
    onNavigate: (section: string) => void;
  }) => void;
  clear: () => void;
}

export const useGlobalCreate = create<GlobalCreateState>((set) => ({
  onNewContact: null,
  onNewProspect: null,
  onNavigate: null,
  register: (handlers) => set(handlers),
  clear: () => set({ onNewContact: null, onNewProspect: null, onNavigate: null }),
}));
