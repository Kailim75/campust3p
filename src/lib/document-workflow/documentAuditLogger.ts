// ═══════════════════════════════════════════════════════════════
// Document Audit Logger — Track bulk operations client-side
// ═══════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 
  | "BULK_GENERATE_START"
  | "BULK_GENERATE_COMPLETE"
  | "BULK_SEND_START"
  | "BULK_SEND_COMPLETE"
  | "EXPORT_AUDIT_START"
  | "EXPORT_AUDIT_COMPLETE"
  | "DOCUMENT_PREVIEW"
  | "DOCUMENT_DOWNLOAD"
  | "DOCUMENT_REGENERATE";

interface AuditLogEntry {
  action: AuditAction;
  entityType: "session" | "contact" | "document";
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a document-related audit event.
 * Fires and forgets - doesn't block the UI.
 */
export async function logDocumentAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's primary centre
    const { data: userCentre } = await supabase
      .from("user_centres")
      .select("centre_id")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .single();

    await (supabase as any).from("audit_logs").insert({
      table_name: `document_${entry.entityType}`,
      record_id: entry.entityId,
      action: entry.action,
      user_id: user.id,
      user_email: user.email,
      centre_id: userCentre?.centre_id ?? "",
      new_data: entry.metadata ?? null,
    });
  } catch (err) {
    // Silent fail - audit should never block operations
    console.warn("Audit log failed:", err);
  }
}

/**
 * Log bulk generation audit entry
 */
export function logBulkGeneration(
  sessionId: string,
  contactCount: number,
  success: number,
  failed: number
): void {
  logDocumentAudit({
    action: "BULK_GENERATE_COMPLETE",
    entityType: "session",
    entityId: sessionId,
    metadata: {
      contactCount,
      success,
      failed,
      completedAt: new Date().toISOString(),
    },
  });
}

/**
 * Log bulk email audit entry
 */
export function logBulkEmail(
  sessionId: string,
  sent: number,
  skipped: number,
  failed: number
): void {
  logDocumentAudit({
    action: "BULK_SEND_COMPLETE",
    entityType: "session",
    entityId: sessionId,
    metadata: {
      sent,
      skipped,
      failed,
      completedAt: new Date().toISOString(),
    },
  });
}

/**
 * Log export audit entry
 */
export function logExportAudit(
  type: "session" | "contact",
  entityId: string,
  documentsCount: number
): void {
  logDocumentAudit({
    action: "EXPORT_AUDIT_COMPLETE",
    entityType: type === "session" ? "session" : "contact",
    entityId,
    metadata: {
      documentsCount,
      exportedAt: new Date().toISOString(),
    },
  });
}
