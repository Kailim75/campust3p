import {
  generateConvocationPDF,
  generateProgrammePDF,
  generateAttestationPDF,
  preloadCompanyImages,
  type ContactInfo,
  type SessionInfo,
  type CompanyInfo,
} from "@/lib/pdf-generator";

export interface EmailAttachment {
  filename: string;
  content: string; // base64
  contentType: string;
}

export type SessionDocumentType = "convocation" | "programme" | "attestation" | "pack";

const DOC_TYPE_LABELS: Record<SessionDocumentType, string> = {
  convocation: "Convocation",
  programme: "Programme",
  attestation: "Attestation",
  pack: "Pack Session (Convocation + Programme)",
};

export function getDocTypeLabel(type: SessionDocumentType): string {
  return DOC_TYPE_LABELS[type] || type;
}

export function isPersonalizedDoc(type: SessionDocumentType): boolean {
  return type !== "programme";
}

function jspdfToBase64(doc: any): string {
  const arrayBuffer = doc.output("arraybuffer");
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateAttachmentsForContact(
  type: SessionDocumentType,
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo,
): Promise<EmailAttachment[]> {
  await preloadCompanyImages(company);
  const attachments: EmailAttachment[] = [];
  const safeName = `${contact.nom}_${contact.prenom}`.replace(/\s+/g, "_");

  if (type === "convocation" || type === "pack") {
    const doc = generateConvocationPDF(contact, session, company);
    attachments.push({
      filename: `Convocation_${safeName}.pdf`,
      content: jspdfToBase64(doc),
      contentType: "application/pdf",
    });
  }

  if (type === "programme" || type === "pack") {
    const doc = generateProgrammePDF(session, company);
    attachments.push({
      filename: `Programme_${session.formation_type || "Formation"}.pdf`,
      content: jspdfToBase64(doc),
      contentType: "application/pdf",
    });
  }

  if (type === "attestation") {
    const doc = generateAttestationPDF(contact, session, company);
    attachments.push({
      filename: `Attestation_${safeName}.pdf`,
      content: jspdfToBase64(doc),
      contentType: "application/pdf",
    });
  }

  return attachments;
}

/** Total decoded size of all attachments in bytes */
export function getAttachmentsTotalSize(attachments: EmailAttachment[]): number {
  return attachments.reduce((sum, a) => sum + Math.ceil(a.content.length * 0.75), 0);
}

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB

export function isAttachmentTooLarge(attachments: EmailAttachment[]): boolean {
  return getAttachmentsTotalSize(attachments) > MAX_ATTACHMENT_SIZE;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
