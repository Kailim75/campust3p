/** Format a number as French currency: "1 200 €" */
export function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a delta as "+12 %" or "-3 %" */
export function formatDelta(current: number, previous: number): { text: string; positive: boolean } {
  if (previous === 0 && current === 0) return { text: "=", positive: true };
  if (previous === 0) return { text: "+∞", positive: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    text: `${pct >= 0 ? "+" : ""}${pct} %`,
    positive: pct >= 0,
  };
}

/** Format a count delta: "+3" or "-2" */
export function formatCountDelta(current: number, previous: number): { text: string; positive: boolean } {
  const diff = current - previous;
  if (diff === 0) return { text: "=", positive: true };
  return {
    text: `${diff > 0 ? "+" : ""}${diff}`,
    positive: diff >= 0,
  };
}
