// ═══════════════════════════════════════════════════════════════
// Audit Export — Generate structured document audit data
// ═══════════════════════════════════════════════════════════════

import type { DocumentWorkflowItem, DocumentBlockSummary, SessionDocumentMatrixRow } from "./types";
import { DOCUMENT_BLOCKS } from "./documentBlockConfig";
import { BUSINESS_STATUS_META } from "./documentBusinessStatus";

/** Single row in CSV export */
interface AuditExportRow {
  apprenant: string;
  email: string;
  bloc: string;
  document: string;
  type: string;
  statut: string;
  requis: string;
  bloque: string;
  champs_manquants: string;
  genere_le: string;
  envoye_le: string;
  signe_le: string;
  source: string;
}

/**
 * Build CSV content from session matrix rows.
 * Returns a string ready for download.
 */
export function buildAuditCSV(rows: SessionDocumentMatrixRow[]): string {
  const headers = [
    "Apprenant", "Email", "Bloc", "Document", "Type", "Statut",
    "Requis", "Bloqué", "Champs manquants", "Généré le",
    "Envoyé le", "Signé le", "Source",
  ];

  const csvRows: string[] = [headers.join(";")];

  for (const row of rows) {
    for (const block of row.blocks) {
      for (const item of block.items) {
        const r: AuditExportRow = {
          apprenant: row.contactName,
          email: row.contactEmail ?? "",
          bloc: DOCUMENT_BLOCKS[block.block]?.label ?? block.block,
          document: item.templateName,
          type: item.documentType,
          statut: BUSINESS_STATUS_META[item.businessStatus]?.label ?? item.businessStatus,
          requis: item.isRequired ? "Oui" : "Non",
          bloque: item.isBlocked ? "Oui" : "Non",
          champs_manquants: item.missingRequiredFields.join(", "),
          genere_le: item.generatedAt ?? "",
          envoye_le: item.sentAt ?? "",
          signe_le: item.signedAt ?? "",
          source: item.sourceSystem,
        };

        csvRows.push(
          Object.values(r)
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(";")
        );
      }
    }
  }

  return csvRows.join("\n");
}

/**
 * Build a learner-level audit CSV (single contact).
 */
export function buildLearnerAuditCSV(
  contactName: string,
  contactEmail: string,
  blocks: DocumentBlockSummary[]
): string {
  // Reuse the session-level function with a single synthetic row
  const syntheticRow: SessionDocumentMatrixRow = {
    contactId: "",
    contactName,
    contactEmail,
    blocks,
    overallStatus: "incomplete",
    totalDocuments: blocks.reduce((s, b) => s + b.items.length, 0),
    generatedCount: blocks.reduce((s, b) => s + b.generated, 0),
    missingCount: blocks.reduce((s, b) => s + b.missing, 0),
    contractFrame: null,
    contractFrameSource: null,
  };

  return buildAuditCSV([syntheticRow]);
}

/**
 * Trigger a CSV download in the browser.
 */
export function downloadCSV(content: string, filename: string): void {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
