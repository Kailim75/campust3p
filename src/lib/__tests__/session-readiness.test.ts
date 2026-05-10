import { describe, expect, it } from "vitest";
import {
  computeSessionReadinessScore,
  getSessionReadinessSeverity,
  isSettledPaymentStatus,
  normalizePaymentStatus,
} from "../session-readiness";

describe("session-readiness", () => {
  it("normalise les statuts de paiement", () => {
    expect(normalizePaymentStatus("non_paye")).toBe("non paye");
    expect(normalizePaymentStatus(" Payee ")).toBe("payee");
  });

  it("reconnait les paiements soldes", () => {
    expect(isSettledPaymentStatus("paye")).toBe(true);
    expect(isSettledPaymentStatus("payee")).toBe(true);
    expect(isSettledPaymentStatus("partiel")).toBe(false);
    expect(isSettledPaymentStatus(null)).toBe(false);
  });

  it("calcule un score lisible selon les anomalies", () => {
    expect(
      computeSessionReadinessScore({
        inscriptionCount: 10,
        missingDocsCount: 0,
        unpaidCount: 0,
        missingContactCount: 0,
        setupIssuesCount: 0,
      }),
    ).toBe(100);

    expect(
      computeSessionReadinessScore({
        inscriptionCount: 2,
        missingDocsCount: 2,
        unpaidCount: 1,
        missingContactCount: 1,
        setupIssuesCount: 1,
      }),
    ).toBeLessThan(60);
  });

  it("classe une session du jour incomplete comme critique", () => {
    expect(getSessionReadinessSeverity({ daysUntil: 0, readinessScore: 88, issueCount: 1 })).toBe("critical");
    expect(getSessionReadinessSeverity({ daysUntil: 1, readinessScore: 88, issueCount: 1 })).toBe("warning");
    expect(getSessionReadinessSeverity({ daysUntil: 1, readinessScore: 100, issueCount: 0 })).toBe("ready");
  });
});

