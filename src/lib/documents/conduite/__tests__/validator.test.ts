import { describe, it, expect } from "vitest";
import { validateContratConduite } from "../contratConduiteValidator";

describe("validateContratConduite", () => {
  it("accepte Taxi au prix catalogue", () => {
    const r = validateContratConduite({ filiere: "taxi", prix_ttc: 249 });
    expect(r.ok).toBe(true);
    expect(r.priceAlert).toBe(false);
  });

  it("accepte VTC au prix catalogue", () => {
    const r = validateContratConduite({ filiere: "vtc", prix_ttc: 190 });
    expect(r.ok).toBe(true);
    expect(r.priceAlert).toBe(false);
  });

  it("alerte si prix différent et exige justification", () => {
    const r = validateContratConduite({ filiere: "taxi", prix_ttc: 200 });
    expect(r.priceAlert).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/justification/i);
  });

  it("valide si justification fournie", () => {
    const r = validateContratConduite({
      filiere: "vtc",
      prix_ttc: 150,
      justification_prix: "Geste commercial validé par direction",
    });
    expect(r.priceAlert).toBe(true);
    expect(r.ok).toBe(true);
  });

  it("refuse prix négatif", () => {
    const r = validateContratConduite({ filiere: "taxi", prix_ttc: -10 });
    expect(r.ok).toBe(false);
  });
});
