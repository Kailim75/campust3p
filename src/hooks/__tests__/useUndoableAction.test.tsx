import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * F3 (11/09/2026) — runUndoable avalait l'échec de l'action : l'appelant ne
 * pouvait pas distinguer une suppression refusée d'une suppression réussie.
 */

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), custom: vi.fn(() => "toast-1"), dismiss: vi.fn() },
}));
vi.mock("@/components/ui/undo-toast", () => ({ UndoToast: () => null }));

import { toast } from "sonner";
import { useSoftDeleteWithUndo, useUndoableAction } from "@/hooks/useUndoableAction";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const REFUS =
  "Mise à la corbeille refusée : la facture FAC-2026-0502 est émise (statut « Émise »). Une facture émise ne se supprime pas.";

describe("useSoftDeleteWithUndo / runUndoable", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.custom).mockClear();
  });

  it("résout false quand la base refuse, affiche le motif, ne propose pas d'annuler", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: REFUS, code: "P0001" } });
    const { result } = renderHook(() => useSoftDeleteWithUndo(), { wrapper });

    const resultat = await result.current({ table: "factures", id: "f1", message: "Facture supprimée" });

    expect(resultat).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Mise à la corbeille refusée"));
    expect(toast.custom).not.toHaveBeenCalled();
  });

  it("résout true quand l'élément part à la corbeille", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const { result } = renderHook(() => useSoftDeleteWithUndo(), { wrapper });

    const resultat = await result.current({ table: "factures", id: "f1", message: "Facture supprimée" });

    expect(resultat).toBe(true);
    expect(toast.custom).toHaveBeenCalled();
  });

  it("runUndoable résout false si l'action lève", async () => {
    const { result } = renderHook(() => useUndoableAction(), { wrapper });
    const rollback = vi.fn();
    const resultat = await result.current.runUndoable({
      successMessage: "ok",
      action: async () => {
        throw new Error("Refusé par la base");
      },
      undo: async () => {},
      rollback,
    });
    expect(resultat).toBe(false);
    expect(rollback).toHaveBeenCalled();
  });
});
