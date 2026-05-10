export type SessionReadinessSeverity = "ready" | "warning" | "critical";

const SETTLED_PAYMENT_STATUSES = new Set([
  "paye",
  "payee",
  "paid",
  "solde",
  "soldé",
  "regle",
  "réglé",
]);

export function normalizePaymentStatus(status: string | null | undefined): string {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");
}

export function isSettledPaymentStatus(status: string | null | undefined): boolean {
  const normalized = normalizePaymentStatus(status);
  if (!normalized) return false;
  return SETTLED_PAYMENT_STATUSES.has(normalized);
}

export function computeSessionReadinessScore({
  inscriptionCount,
  missingDocsCount,
  unpaidCount,
  missingContactCount,
  setupIssuesCount,
}: {
  inscriptionCount: number;
  missingDocsCount: number;
  unpaidCount: number;
  missingContactCount: number;
  setupIssuesCount: number;
}): number {
  const controlPoints = Math.max(inscriptionCount * 3 + 3, 1);
  const issues = missingDocsCount + unpaidCount + missingContactCount + setupIssuesCount;
  return Math.max(0, Math.min(100, Math.round(((controlPoints - issues) / controlPoints) * 100)));
}

export function getSessionReadinessSeverity({
  daysUntil,
  readinessScore,
  issueCount,
}: {
  daysUntil: number;
  readinessScore: number;
  issueCount: number;
}): SessionReadinessSeverity {
  if (issueCount === 0 && readinessScore >= 95) return "ready";
  if (daysUntil <= 0 && issueCount > 0) return "critical";
  if (readinessScore < 70) return "critical";
  return "warning";
}

