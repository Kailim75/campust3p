import { describe, it, expect } from "vitest";
import { legendeSignature } from "@/lib/documentSigne";

describe("legendeSignature — légende d'incrustation de la signature", () => {
  it("nom + date → phrase complète avec la date", () => {
    const s = legendeSignature("Jean Dupont", "2026-09-13T10:00:00Z");
    expect(s).toMatch(/^Signé électroniquement par Jean Dupont le .*2026/);
  });

  it("nom vide → « le signataire »", () => {
    expect(legendeSignature("", null)).toBe("Signé électroniquement par le signataire");
    expect(legendeSignature(null, null)).toBe("Signé électroniquement par le signataire");
  });

  it("nom entouré d'espaces → nettoyé", () => {
    expect(legendeSignature("  Bob Martin  ", null)).toBe("Signé électroniquement par Bob Martin");
  });

  it("date invalide → pas de suffixe de date", () => {
    expect(legendeSignature("Alice", "pas-une-date")).toBe("Signé électroniquement par Alice");
  });

  it("sans date → pas de suffixe de date", () => {
    expect(legendeSignature("Alice", undefined)).toBe("Signé électroniquement par Alice");
  });
});
