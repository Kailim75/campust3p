import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Table, TableBody } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * D1 (11/09/2026) — aucune exception à l'interdiction de supprimer une facture
 * émise.
 *
 * La fiche facture n'était pas le seul chemin : le menu « +N » de la fiche
 * session proposait une corbeille sur CHAQUE facture d'un inscrit qui en a
 * plusieurs, quel que soit son statut, câblée sur `soft_delete_record`. Rejoué
 * au banc SANS la garde (ce volet est publié AVANT elle) : la mise à la
 * corbeille d'une facture émise était acceptée et la facture disparaissait de
 * la comptabilité.
 */

vi.mock("@/components/ui/select", () => import("@/test/select-natif"));
vi.mock("@/components/ui/dropdown-menu", () => import("@/test/dropdown-natif"));

import { InscritTableRow } from "../InscritTableRow";

const inscrit = {
  id: "i1",
  contact_id: "c1",
  statut: "valide",
  contact: { id: "c1", nom: "Dupont", prenom: "Jean" },
};

const facture = (id: string, numero: string, statut: string) =>
  ({
    id,
    numero_facture: numero,
    statut,
    montant_total: 990,
    total_paye: 0,
  }) as never;

function afficher(statuts: string[]) {
  const factures = statuts.map((s, i) => facture(`f${i}`, `FAC-2026-070${i}`, s));
  return render(
    <TooltipProvider>
    <Table>
      <TableBody>
        <InscritTableRow
          inscrit={inscrit as never}
          selected={false}
          onToggleSelect={() => {}}
          facture={factures[0]}
          factures={factures}
          onDeleteFacture={vi.fn()}
          examResult={undefined}
          sessionDateFin={null}
          latestEnvoi={null}
          onStatutChange={() => {}}
          onExamToggle={() => {}}
          onGenerateDocument={() => {}}
          onSendDocs={() => {}}
          onCreateFacture={() => {}}
          onEditFacture={() => {}}
          onViewFacture={() => {}}
          onTransfer={() => {}}
          onViewContact={() => {}}
          onRemove={() => {}}
        />
      </TableBody>
    </Table>
    </TooltipProvider>,
  );
}

/** Le menu « +N » est rendu en place par le double de test. */
function menuDesFactures() {
  const trouve = screen
    .getAllByTestId("dropdown-natif")
    .find((m) => within(m).queryByText("FAC-2026-0701"));
  if (!trouve) throw new Error("menu des factures introuvable");
  return trouve;
}

describe("InscritTableRow — suppression d'une facture depuis la fiche session", () => {
  it("aucune corbeille sur une facture émise (D1)", () => {
    afficher(["emise", "emise"]);

    // Le menu liste bien les deux factures…
    expect(within(menuDesFactures()).getByText("FAC-2026-0701")).toBeInTheDocument();
    // …et n'offre aucune corbeille.
    expect(screen.queryAllByRole("button", { name: "Supprimer cette facture" })).toHaveLength(0);
  });

  it("une seule corbeille quand un brouillon accompagne une facture émise", () => {
    afficher(["emise", "brouillon"]);

    expect(screen.queryAllByRole("button", { name: "Supprimer cette facture" })).toHaveLength(1);
  });
});
