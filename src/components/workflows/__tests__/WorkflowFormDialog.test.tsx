import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

/**
 * F7 (11/09/2026) — un workflow ne propose plus « brouillon » comme nouveau
 * statut d'une facture : une facture émise ne redevient jamais brouillon.
 */

const { create, update } = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));

vi.mock("@/components/ui/select", () => import("@/test/select-natif"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock("@/hooks/useEmailTemplates", () => ({ useEmailTemplates: () => ({ data: [] }) }));
vi.mock("@/hooks/useWorkflows", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/useWorkflows")>()),
  useWorkflows: () => ({ createWorkflow: { mutate: create }, updateWorkflow: { mutate: update } }),
}));

import { toast } from "sonner";
import { WorkflowFormDialog } from "../WorkflowFormDialog";
import type { Workflow } from "@/hooks/useWorkflows";

function workflow(newStatus: string): Workflow {
  return {
    id: "w1",
    nom: "Relance",
    description: "",
    actif: true,
    trigger_type: "facture_overdue",
    trigger_conditions: {},
    actions: [{ type: "update_status", config: { table: "factures", new_status: newStatus } }],
  } as unknown as Workflow;
}

function selectStatut(): HTMLSelectElement {
  const trouve = screen.getAllByTestId("select-natif").find((s) => within(s).queryByText("Impayée"));
  if (!trouve) throw new Error("sélecteur de statut de facture introuvable");
  return trouve as HTMLSelectElement;
}

describe("WorkflowFormDialog — statut de facture", () => {
  beforeEach(() => {
    create.mockClear();
    update.mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("ne propose ni Brouillon ni Annulée, et refuse d'enregistrer un ancien « brouillon »", () => {
    render(<WorkflowFormDialog open onOpenChange={() => {}} workflow={workflow("brouillon")} />);

    const select = selectStatut();
    expect(within(select).queryByText("Brouillon")).toBeNull();
    expect(within(select).queryByText("Annulée")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(toast.error).toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("enregistre un statut autorisé", () => {
    render(<WorkflowFormDialog open onOpenChange={() => {}} workflow={workflow("brouillon")} />);

    fireEvent.change(selectStatut(), { target: { value: "payee" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].actions[0].config.new_status).toBe("payee");
  });
});
