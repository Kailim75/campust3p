import { describe, expect, it } from "vitest";
import { computeCrmQuality } from "../crm-quality";
import type { Prospect } from "@/hooks/useProspects";

function prospect(overrides: Partial<Prospect>): Prospect {
  return {
    id: "p1",
    nom: "Martin",
    prenom: "Sarah",
    telephone: null,
    email: null,
    formation_souhaitee: null,
    source: null,
    statut: "nouveau",
    priorite: "normale",
    notes: null,
    converted_contact_id: null,
    is_active: true,
    date_prochaine_relance: null,
    next_action_at: null,
    next_action_type: null,
    assigned_to: null,
    last_contacted_at: null,
    created_at: "2026-05-01",
    updated_at: "2026-05-01",
    created_by: null,
    ...overrides,
  };
}

describe("crm-quality", () => {
  it("detecte les doublons par email ou telephone", () => {
    const { items, summary } = computeCrmQuality({
      contacts: [
        { id: "c1", prenom: "Ali", nom: "Dia", email: "ali@example.com", telephone: null, formation: "VTC" },
        { id: "c2", prenom: "Ali", nom: "Dia", email: "ALI@example.com", telephone: null, formation: "VTC" },
      ],
      prospects: [],
    });

    expect(items.some((item) => item.type === "duplicate")).toBe(true);
    expect(summary.duplicateGroups).toBe(1);
  });

  it("remonte les fiches injoignables et sans formation", () => {
    const { items, summary } = computeCrmQuality({
      contacts: [{ id: "c1", prenom: "Nora", nom: "Ben", email: null, telephone: null, formation: null }],
      prospects: [],
    });

    expect(items.map((item) => item.type)).toContain("missing_channel");
    expect(items.map((item) => item.type)).toContain("missing_formation");
    expect(summary.criticalCount).toBeGreaterThan(0);
  });

  it("signale les prospects actifs sans prochaine action", () => {
    const { items } = computeCrmQuality({
      contacts: [],
      prospects: [prospect({ priorite: "urgente" })],
    });

    expect(items.find((item) => item.type === "prospect_without_next_action")?.severity).toBe("critical");
  });
});
