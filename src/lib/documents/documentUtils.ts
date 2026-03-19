import { supabase } from "@/integrations/supabase/client";
import { DocumentGenerationError } from "./documentErrors";

export type DocumentType =
  | "facture"
  | "attestation"
  | "attestation_presence"
  | "convention"
  | "contrat"
  | "convocation"
  | "programme";

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  facture: "Facture",
  attestation: "Attestation",
  attestation_presence: "Attestation de présence",
  convention: "Convention de formation",
  contrat: "Contrat de formation",
  convocation: "Convocation",
  programme: "Programme de formation",
};

export function getDocumentLabel(type: DocumentType): string {
  return DOCUMENT_LABELS[type];
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CertificateInfo {
  numero_certificat: string;
  date_emission: string;
}

/**
 * Crée ou récupère un numéro de certificat unique pour une attestation.
 */
export async function getOrCreateCertificateNumber(
  contactId: string,
  sessionId?: string,
  typeAttestation: string = "formation"
): Promise<CertificateInfo | null> {
  try {
    const { data, error } = await supabase.rpc(
      "create_attestation_certificate",
      {
        p_contact_id: contactId,
        p_session_id: sessionId || null,
        p_type_attestation: typeAttestation,
        p_metadata: {},
      }
    );

    if (error) {
      console.error("Erreur création certificat:", error);
      throw new DocumentGenerationError(
        "Impossible de générer le numéro de certificat",
        "CERTIFICATE_GENERATION_FAILED",
        error.message
      );
    }

    if (data && data.length > 0) {
      return {
        numero_certificat: data[0].numero_certificat,
        date_emission: data[0].date_emission,
      };
    }
    return null;
  } catch (err) {
    if (err instanceof DocumentGenerationError) throw err;
    console.error("Erreur getOrCreateCertificateNumber:", err);
    return null;
  }
}

/**
 * Détermine le type d'attestation selon la formation.
 */
export function getAttestationType(formationType?: string): string {
  const isMobilite =
    formationType?.toLowerCase().includes("mobilite") ||
    formationType?.toLowerCase().includes("mobilité");
  return isMobilite ? "mobilite" : "formation";
}

/**
 * Vérifie si c'est une formation Mobilité.
 */
export function isMobiliteFormation(formationType?: string): boolean {
  return getAttestationType(formationType) === "mobilite";
}
