// ═══════════════════════════════════════════════════════════════
// IA Director — Priority Calculation Engine
// ═══════════════════════════════════════════════════════════════

import type { Anomaly, AnomalySeverity } from "./types";

export function urgenceFromSeverity(severity: AnomalySeverity): number {
  switch (severity) {
    case "critical": return 100;
    case "high": return 75;
    case "medium": return 50;
    case "low": return 25;
  }
}

/**
 * priority_score =
 *   (impact_normalisé × 0.5) +
 *   (urgence_score × 0.3) +
 *   (confidence_score × 0.2)
 * 
 * Impact is normalized to 0-100 scale using log scale
 */
export function computePriorityScore(anomaly: Anomaly): number {
  // Normalize impact to 0-100 using log scale
  // €0 = 0, €100 = 30, €1000 = 60, €10000 = 80, €100000 = 100
  const impactNorm = anomaly.impact_estime_euros > 0
    ? Math.min(100, Math.log10(anomaly.impact_estime_euros) * 25)
    : 0;

  const score =
    impactNorm * 0.5 +
    anomaly.urgence_score * 0.3 +
    anomaly.confidence_score * 0.2;

  return Math.round(Math.min(100, Math.max(0, score)));
}

export function buildAuditSummary(anomalies: Anomaly[]) {
  return {
    critical: anomalies.filter(a => a.severity === "critical").length,
    high: anomalies.filter(a => a.severity === "high").length,
    medium: anomalies.filter(a => a.severity === "medium").length,
    low: anomalies.filter(a => a.severity === "low").length,
    totalImpact: anomalies.reduce((s, a) => s + a.impact_estime_euros, 0),
  };
}
