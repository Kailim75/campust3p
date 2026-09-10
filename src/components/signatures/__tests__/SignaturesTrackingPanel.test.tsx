import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Suivi des signatures : deux relances peuvent se chevaucher (la secrétaire
 * enchaîne les lignes d'une session sans attendre la réponse du serveur).
 * L'état de la mutation étant global, un verrou unique bloquait la ligne B
 * pendant l'envoi de A — et pire, la garde de confirmation fermait le
 * dialogue de B sans rien envoyer ni afficher de toast : envoi cru fait,
 * jamais parti.
 */

const { mutateAsync, ROWS } = vi.hoisted(() => {
  const ligne = (id: string, prenom: string, nom: string, email: string) => ({
    id,
    contact_id: `c-${id}`,
    session_inscription_id: `si-${id}`,
    type_document: "contrat",
    titre: `Contrat de formation ${prenom}`,
    statut: "envoye",
    date_envoi: "2026-09-01T09:00:00.000Z",
    date_signature: null,
    date_expiration: null,
    access_token: `tok-${id}`,
    signature_url: null,
    created_at: "2026-09-01T09:00:00.000Z",
    contact: { id: `c-${id}`, nom, prenom, email },
    session_inscription: {
      id: `si-${id}`,
      session: { id: "s1", nom: "Taxi Septembre", date_debut: "2026-09-14", formation_type: "TAXI" },
    },
  });
  return {
    mutateAsync: vi.fn(),
    ROWS: [
      ligne("sr-a", "Doudou", "MAHDI", "doudou@exemple.fr"),
      ligne("sr-b", "Sofia", "KARAI", "sofia@exemple.fr"),
    ],
  };
});

vi.mock("@/hooks/useSignatures", () => ({
  useSendSignatureEmail: () => ({ mutateAsync, isPending: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: ROWS, error: null }) }),
    }),
  },
}));

import { SignaturesTrackingPanel } from "../SignaturesTrackingPanel";

/** Envois laissés en vol : le test décide quand chacun se termine. */
let terminer: Record<string, () => void>;

async function afficherLesLignes() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SignaturesTrackingPanel />
    </QueryClientProvider>,
  );
  // Le groupe de session est replié par défaut.
  fireEvent.click(await screen.findByRole("button", { name: /Taxi Septembre/ }));
  return screen.getAllByTitle("Renvoyer");
}

function confirmerLenvoi() {
  const envoyer = screen.getByRole("button", { name: "Envoyer" });
  fireEvent.click(envoyer);
}

describe("SignaturesTrackingPanel — relances qui se chevauchent", () => {
  beforeEach(() => {
    terminer = {};
    mutateAsync.mockReset();
    mutateAsync.mockImplementation(
      ({ signatureRequestId }: { signatureRequestId: string }) =>
        new Promise<void>((resolve) => {
          terminer[signatureRequestId] = () => resolve();
        }),
    );
  });

  it("envoie réellement la ligne B alors que la ligne A est encore en vol", async () => {
    const [renvoyerA, renvoyerB] = await afficherLesLignes();

    fireEvent.click(renvoyerA);
    expect(screen.getByText("doudou@exemple.fr", { selector: "strong" })).toBeInTheDocument();
    confirmerLenvoi();

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({ signatureRequestId: "sr-a", type: "signature_request" });
    expect(renvoyerA).toBeDisabled();
    expect(renvoyerB).not.toBeDisabled();

    fireEvent.click(renvoyerB);
    // Le dialogue de B ne doit pas hériter du « Envoi… » de la ligne A.
    expect(screen.getByRole("button", { name: "Envoyer" })).not.toBeDisabled();
    confirmerLenvoi();

    expect(mutateAsync).toHaveBeenCalledTimes(2);
    expect(mutateAsync).toHaveBeenLastCalledWith({ signatureRequestId: "sr-b", type: "signature_request" });
    expect(renvoyerB).toBeDisabled();
  });

  it("la fin de l'envoi A ne déverrouille pas la ligne B encore en vol", async () => {
    const [renvoyerA, renvoyerB] = await afficherLesLignes();

    fireEvent.click(renvoyerA);
    confirmerLenvoi();
    fireEvent.click(renvoyerB);
    confirmerLenvoi();

    await act(async () => {
      terminer["sr-a"]();
    });

    expect(renvoyerA).not.toBeDisabled();
    expect(renvoyerB).toBeDisabled();

    await act(async () => {
      terminer["sr-b"]();
    });
    expect(renvoyerB).not.toBeDisabled();
  });

  it("un double clic sur la même ligne n'envoie qu'une fois", async () => {
    const [renvoyerA] = await afficherLesLignes();

    fireEvent.click(renvoyerA);
    const envoyer = screen.getByRole("button", { name: "Envoyer" });
    fireEvent.click(envoyer);
    fireEvent.click(envoyer);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });
});
