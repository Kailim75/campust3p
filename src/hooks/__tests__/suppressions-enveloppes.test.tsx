import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * F3, suite (relecture du 11/09/2026) : trois enveloppes de
 * `useSoftDeleteWithUndo` avalaient encore le booléen et annonçaient
 * `Promise<void>`. Le prochain appelant qui écrirait
 * `await deleteFormation.mutateAsync(id); toast.success(…)` reproduirait
 * exactement la panne que F3 vient de corriger pour les factures, sans que le
 * type ne l'avertisse.
 */

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    from: () => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is", "order", "in", "limit"]) c[m] = () => c;
      c.then = (resoudre: (v: unknown) => unknown) => resoudre({ data: [], error: null });
      return c;
    },
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
  },
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), custom: vi.fn(() => "toast-1"), dismiss: vi.fn() },
}));
vi.mock("@/components/ui/undo-toast", () => ({ UndoToast: () => null }));

import { useDeleteCatalogueFormation } from "@/hooks/useCatalogueFormations";
import { useDeleteEmailTemplate } from "@/hooks/useEmailTemplates";
import { useDeleteDocument } from "@/hooks/useContactDocuments";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("enveloppes de suppression : l'échec remonte à l'appelant", () => {
  beforeEach(() => rpc.mockReset());

  it("useDeleteCatalogueFormation : false si la base refuse, true sinon", async () => {
    const { result } = renderHook(() => useDeleteCatalogueFormation(), { wrapper });

    rpc.mockResolvedValue({ data: null, error: { message: "Refusé", code: "P0001" } });
    expect(await result.current.mutateAsync("cf1")).toBe(false);

    rpc.mockResolvedValue({ data: null, error: null });
    expect(await result.current.mutateAsync("cf1")).toBe(true);
  });

  it("useDeleteEmailTemplate : false si la base refuse", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Refusé", code: "P0001" } });
    const { result } = renderHook(() => useDeleteEmailTemplate(), { wrapper });
    expect(await result.current.mutateAsync("t1")).toBe(false);
  });

  it("useDeleteDocument : false si la base refuse", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Refusé", code: "P0001" } });
    const { result } = renderHook(() => useDeleteDocument(), { wrapper });
    expect(await result.current.mutateAsync({ id: "d1", filePath: "x", contactId: "c1" })).toBe(false);
  });
});
