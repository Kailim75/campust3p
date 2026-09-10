import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Le hook, pas la page : le test de RappelsPage mocke `useRappels` et ne peut
 * donc pas voir qu'une requête en échec y était lue en `.data || []`. Une
 * secrétaire lisait alors « Aucun retard » sur une panne réseau.
 */

const etat = vi.hoisted(() => ({
  reponse: { data: [] as unknown[] | null, error: null as unknown },
}));

// postgrest-js : le builder est chaînable ET « thenable » — il résout avec
// { data, error } au lieu de lever, d'où le défaut d'origine.
vi.mock("@/integrations/supabase/client", () => {
  const methodes = ["select", "eq", "neq", "in", "is", "not", "gte", "lte", "like", "or", "order", "limit"];
  const builder = () => {
    const b: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(etat.reponse).then(resolve, reject),
    };
    methodes.forEach((m) => {
      b[m] = () => b;
    });
    return b;
  };
  return { supabase: { from: () => builder() } };
});

// Les requêtes partagées lèvent déjà : on les neutralise pour isoler les
// requêtes directes du hook.
vi.mock("@/lib/shared-queries", () => ({
  fetchSharedContactDocs: () => Promise.resolve([]),
  fetchSharedInscriptions: () => Promise.resolve([]),
  fetchSharedRappelsActifs: () => Promise.resolve([]),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));

import { useRappels } from "../useRappels";

function monter() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRappels(), { wrapper });
}

beforeEach(() => {
  etat.reponse = { data: [], error: null };
});

describe("useRappels", () => {
  it("passe en erreur quand une requête directe échoue", async () => {
    etat.reponse = { data: null, error: { code: "42501", message: "permission denied for table factures" } };

    const { result } = monter();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.rappels).toEqual([]);
    expect(result.current.aDesDonnees).toBe(false);
  });

  it("aboutit quand toutes les requêtes répondent", async () => {
    const { result } = monter();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.aDesDonnees).toBe(true);
    expect(result.current.rappels).toEqual([]);
  });
});
