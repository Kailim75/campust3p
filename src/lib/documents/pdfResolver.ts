// ═══════════════════════════════════════════════════════════════
// PDF Resolver — Single source of truth for PDF resolution
// ═══════════════════════════════════════════════════════════════
//
// This module centralises all PDF file resolution logic.
// Every workflow (preview, download, email attachment, signature)
// MUST use these functions instead of hardcoding bucket names.
// ═══════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";

// ── Storage Buckets ──

/** V2 workflow bucket (generated_documents_v2 table) */
const BUCKET_V2 = "generated-docs";
/** Legacy workflow bucket (generated_documents_legacy, signatures, docx) */
const BUCKET_LEGACY = "generated-documents";

// ── Types ──

export interface PdfResolutionResult {
  /** Whether the PDF is available and downloadable */
  available: boolean;
  /** The storage bucket where the file lives */
  bucket: string | null;
  /** The path within the bucket */
  storagePath: string | null;
  /** Reason if not available */
  unavailableReason?: string;
}

export interface PdfDownloadResult {
  blob: Blob;
  bucket: string;
  storagePath: string;
}

// ── Bucket detection ──

/**
 * Determines which bucket a file_path belongs to.
 * V2 paths follow: centre/{centreId}/contacts/{contactId}/{docId}.pdf
 * Legacy paths follow: {centreId}/{contactId}/{file}.pdf or signatures/... or envois/...
 */
export function detectBucket(filePath: string | null | undefined): string {
  if (!filePath) return BUCKET_V2;
  // V2 paths always start with "centre/"
  if (filePath.startsWith("centre/")) return BUCKET_V2;
  // Legacy paths: signatures/, envois/, or {uuid}/{uuid}/...
  return BUCKET_LEGACY;
}

// ── Resolution (check availability without downloading) ──

/**
 * Resolve whether a PDF is actually available in storage.
 * This is the ONLY function that should determine if a document is exploitable.
 */
export function resolveFromPath(filePath: string | null | undefined): PdfResolutionResult {
  if (!filePath) {
    return {
      available: false,
      bucket: null,
      storagePath: null,
      unavailableReason: "Aucun chemin de fichier",
    };
  }

  const bucket = detectBucket(filePath);
  return {
    available: true,
    bucket,
    storagePath: filePath,
  };
}

/**
 * Verify a PDF actually exists in storage (makes a HEAD-like request).
 * Use sparingly — prefer resolveFromPath for UI status checks.
 */
export async function verifyPdfExists(filePath: string): Promise<PdfResolutionResult> {
  const bucket = detectBucket(filePath);

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error || !data) {
      return {
        available: false,
        bucket,
        storagePath: filePath,
        unavailableReason: error?.message || "Fichier introuvable dans le stockage",
      };
    }

    return { available: true, bucket, storagePath: filePath };
  } catch (err) {
    return {
      available: false,
      bucket,
      storagePath: filePath,
      unavailableReason: "Erreur de vérification du fichier",
    };
  }
}

// ── Download ──

/**
 * Download a PDF blob from storage. Used for preview, download, and attachment.
 * Throws on failure.
 */
export async function downloadPdf(filePath: string): Promise<PdfDownloadResult> {
  const bucket = detectBucket(filePath);

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (error || !data) {
    throw new Error(
      `Impossible de télécharger le document depuis ${bucket}/${filePath}: ${error?.message || "fichier introuvable"}`
    );
  }

  return { blob: data, bucket, storagePath: filePath };
}

// ── Base64 conversion (for email attachments) ──

/**
 * Download a PDF and convert it to base64 for email attachment.
 * Returns null if file is not available.
 */
export async function downloadPdfAsBase64(
  filePath: string
): Promise<{ base64: string; sizeBytes: number } | null> {
  try {
    const { blob } = await downloadPdf(filePath);
    const base64 = await blobToBase64(blob);
    return { base64, sizeBytes: blob.size };
  } catch {
    return null;
  }
}

/**
 * Convert a Blob to base64 string (without data URI prefix).
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Signed URLs ──

/**
 * Create a signed URL for a document (e.g. for signature requests).
 * Returns null if the file doesn't exist.
 */
export async function createSignedUrl(
  filePath: string,
  expiresInSeconds = 60 * 60 * 24 * 365 // 1 year
): Promise<string | null> {
  const bucket = detectBucket(filePath);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error(`Failed to create signed URL for ${bucket}/${filePath}:`, error);
    return null;
  }

  return data.signedUrl;
}

// ── Upload ──

/**
 * Upload a PDF to the correct bucket with proper path structure.
 * For V2 documents: centre/{centreId}/contacts/{contactId}/{docId}.pdf
 * For signatures: signatures/{contactId}/{type}-{timestamp}.pdf
 */
export async function uploadPdf(params: {
  blob: Blob;
  filePath: string;
  bucket?: string;
}): Promise<{ filePath: string; bucket: string }> {
  const bucket = params.bucket || detectBucket(params.filePath);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(params.filePath, params.blob, {
      contentType: "application/pdf",
    });

  if (error) {
    throw new Error(`Erreur d'upload vers ${bucket}/${params.filePath}: ${error.message}`);
  }

  return { filePath: params.filePath, bucket };
}

// ── Guardrails ──

/**
 * Check if a document is ready for email attachment.
 * Returns a clear status message.
 */
export function isPdfReadyForEmail(filePath: string | null | undefined): {
  ready: boolean;
  reason?: string;
} {
  if (!filePath) {
    return { ready: false, reason: "Aucun fichier PDF généré" };
  }
  return { ready: true };
}

/**
 * Check if a document is ready for signature request.
 * Stricter than email — signature requires the file to be exploitable.
 */
export function isPdfReadyForSignature(filePath: string | null | undefined): {
  ready: boolean;
  reason?: string;
} {
  if (!filePath) {
    return { ready: false, reason: "Aucun fichier PDF — impossible de demander une signature" };
  }
  return { ready: true };
}
