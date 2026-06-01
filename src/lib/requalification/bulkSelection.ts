import type { RequalificationContact } from "@/hooks/useRequalificationContacts";

export const BULK_MAX = 200;

export interface BulkCounts {
  total: number;
  withFacture: number;
  withPaiement: number;
  withDocument: number;
  withExamen: number;
  withoutEmail: number;
  withoutPhone: number;
  withoutFormation: number;
}

/** Contacts éligibles : non supprimés, non déjà SmartOF. */
export function filterEligibleForSmartOF(
  contacts: RequalificationContact[],
): { eligible: RequalificationContact[]; skipped: RequalificationContact[] } {
  const eligible: RequalificationContact[] = [];
  const skipped: RequalificationContact[] = [];
  for (const c of contacts) {
    if (
      c.is_historical_import ||
      c.requalification_category === "apprenant_historique_smartof"
    ) {
      skipped.push(c);
    } else {
      eligible.push(c);
    }
  }
  return { eligible, skipped };
}

export function computeBulkCounts(contacts: RequalificationContact[]): BulkCounts {
  return {
    total: contacts.length,
    withFacture: contacts.filter((c) => c.hasFacture).length,
    withPaiement: contacts.filter((c) => c.hasPaiement).length,
    withDocument: contacts.filter((c) => c.hasDocument).length,
    withExamen: contacts.filter((c) => c.hasExamen).length,
    withoutEmail: contacts.filter((c) => !c.email).length,
    withoutPhone: contacts.filter((c) => !c.telephone).length,
    withoutFormation: contacts.filter((c) => !c.formation).length,
  };
}

export interface BulkRowResult {
  contactId: string;
  nom: string;
  email: string | null;
  status: "success" | "skipped" | "error";
  message?: string;
}

export function resultsToCSV(rows: BulkRowResult[]): string {
  const header = "id,nom,email,statut,message\n";
  const escape = (v: string | null | undefined) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const body = rows
    .map(
      (r) =>
        `${escape(r.contactId)},${escape(r.nom)},${escape(r.email)},${escape(r.status)},${escape(r.message ?? "")}`,
    )
    .join("\n");
  return header + body;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
