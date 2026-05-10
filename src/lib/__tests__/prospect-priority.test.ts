import { describe, expect, it } from "vitest";
import { getProspectPriority, getProspectPrioritySortValue } from "../prospect-priority";

function localDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

describe("prospect-priority", () => {
  it("utilise date_prochaine_relance quand next_action_at est absent", () => {
    expect(getProspectPriority({ date_prochaine_relance: localDate(-1), statut: "relance" }).level).toBe("high");
    expect(getProspectPriority({ date_prochaine_relance: localDate(0), statut: "relance" }).label).toBe("Aujourd'hui");
  });

  it("fait remonter les priorites manuelles urgentes", () => {
    expect(getProspectPriority({ priorite: "urgente", statut: "nouveau" }).level).toBe("high");
    expect(getProspectPriority({ priorite: "haute", statut: "nouveau" }).level).toBe("medium");
  });

  it("classe les prospects urgents avant les prospects moins prioritaires", () => {
    const urgent = getProspectPrioritySortValue({ priorite: "urgente", statut: "nouveau" });
    const normal = getProspectPrioritySortValue({ priorite: "normale", statut: "nouveau" });

    expect(urgent).toBeLessThan(normal);
  });
});
