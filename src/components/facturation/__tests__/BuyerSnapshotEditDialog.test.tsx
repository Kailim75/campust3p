import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * F9 (11/09/2026) — les coordonnées acheteur ne s'enregistrent que sur un
 * brouillon. Le bouton était désactivé hors brouillon, mais l'écriture ne
 * vérifiait rien : une facture émise entre l'ouverture et le clic recevait de
 * nouvelles coordonnées « figées ».
 */

const { etat } = vi.hoisted(() => ({
  etat: { statutLu: "brouillon", statutReel: "emise", ecritures: 0 },
}));

vi.mock("@/components/ui/select", () => import("@/test/select-natif"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: "f1",
                numero_facture: "FAC-2026-0518",
                statut: etat.statutLu,
                buyer_type: "b2c",
                buyer_name_snapshot: "Jean Dupont",
                buyer_siren: null,
                buyer_siret: null,
                buyer_tva_intracom: null,
                buyer_country: "FR",
                buyer_email_facturation: null,
                buyer_address_snapshot: null,
                buyer_routing_code: null,
              },
              error: null,
            }),
        }),
      }),
      update: () => {
        const filtres: Record<string, unknown> = {};
        // La base n'écrit la ligne que si tous les filtres correspondent.
        const resultat = () => {
          const refusee = filtres.statut === "brouillon" && etat.statutReel !== "brouillon";
          if (!refusee) etat.ecritures++;
          return { data: refusee ? [] : [{ id: "f1" }], error: null };
        };
        const chaine: Record<string, unknown> = {
          eq: (colonne: string, valeur: unknown) => {
            filtres[colonne] = valeur;
            return chaine;
          },
          select: () => Promise.resolve(resultat()),
          then: (resoudre: (v: unknown) => unknown) => resoudre(resultat()),
        };
        return chaine;
      },
    }),
  },
}));

import { toast } from "sonner";
import { BuyerSnapshotEditDialog } from "../BuyerSnapshotEditDialog";

function afficher() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BuyerSnapshotEditDialog factureId="f1" open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

describe("BuyerSnapshotEditDialog", () => {
  beforeEach(() => {
    etat.ecritures = 0;
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });

  it("facture émise depuis l'ouverture : enregistrement refusé, rien d'écrit", async () => {
    etat.statutLu = "brouillon";
    etat.statutReel = "emise";
    afficher();

    const bouton = await screen.findByRole("button", { name: "Enregistrer" });
    await waitFor(() => expect(bouton).toBeEnabled());
    fireEvent.click(bouton);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/n'est plus un brouillon/)));
    expect(toast.success).not.toHaveBeenCalled();
    expect(etat.ecritures).toBe(0);
  });

  it("brouillon : l'enregistrement passe", async () => {
    etat.statutLu = "brouillon";
    etat.statutReel = "brouillon";
    afficher();

    const bouton = await screen.findByRole("button", { name: "Enregistrer" });
    await waitFor(() => expect(bouton).toBeEnabled());
    fireEvent.click(bouton);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Données acheteur mises à jour"));
    expect(etat.ecritures).toBe(1);
  });

  it("facture émise à l'ouverture : bouton désactivé", async () => {
    etat.statutLu = "emise";
    etat.statutReel = "emise";
    afficher();
    expect(await screen.findByText(/Cette facture est déjà émise/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  });
});
