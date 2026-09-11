import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * F4 (11/09/2026) — les toasts d'erreur des lignes de facture affichaient un
 * texte fixe (« Erreur lors de l'ajout des lignes ») qui cachait le motif du
 * refus de la garde ; la suppression groupée n'affichait rien du tout.
 */

const { reponse } = vi.hoisted(() => ({ reponse: { error: null as unknown } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => Object.assign(Promise.resolve({ data: null, error: reponse.error }), {
          single: () => Promise.resolve({ data: null, error: reponse.error }),
        }),
      }),
      update: () => ({
        eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: reponse.error }) }) }),
      }),
      delete: () => ({ eq: () => Promise.resolve({ error: reponse.error }) }),
    }),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import {
  useCreateFactureLignes,
  useDeleteFactureLignesByFacture,
  useUpdateFactureLigne,
} from "@/hooks/useFactureLignes";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const refus = (message: string) => ({ message, code: "P0001" });

describe("useFactureLignes — motif du refus affiché", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
  });

  it("ajout de lignes refusé", async () => {
    reponse.error = refus("Ajout de ligne refusé : la facture FAC-2026-9001 est émise et ses lignes sont figées.");
    const { result } = renderHook(() => useCreateFactureLignes(), { wrapper });
    result.current.mutate([{ facture_id: "f1", description: "L3", prix_unitaire_ht: 1 }]);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Ajout de ligne refusé : la facture FAC-2026-9001")),
    );
  });

  it("modification de ligne refusée", async () => {
    reponse.error = refus("Modification de ligne refusée : la facture FAC-2026-0502 est émise et ses lignes sont figées (prix unitaire HT).");
    const { result } = renderHook(() => useUpdateFactureLigne(), { wrapper });
    result.current.mutate({ id: "l1", factureId: "f1", prix_unitaire_ht: 1 });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Modification de ligne refusée")),
    );
  });

  it("suppression groupée refusée", async () => {
    reponse.error = refus("Suppression de ligne refusée : la facture FAC-2026-0502 est émise et ses lignes sont figées.");
    const { result } = renderHook(() => useDeleteFactureLignesByFacture(), { wrapper });
    result.current.mutate("f1");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Suppression de ligne refusée")),
    );
  });
});
