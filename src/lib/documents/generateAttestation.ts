import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultTemplate } from "@/hooks/useDocumentTemplateFiles";
import { buildVariableData, processDocxWithVariables } from "@/lib/docx-processor";
import {
  fetchContactDocumentData,
  fetchContactsDocumentData,
} from "@/lib/documents/fetchContactDocumentData";
import {
  generateAttestationPDF,
  downloadPDF,
  type ContactInfo,
  type ContactInfoWithId,
  type SessionInfo,
  type SessionInfoWithId,
  type CompanyInfo,
} from "@/lib/pdf-generator";
import type { ContactDocumentData } from "@/lib/documents/fetchContactDocumentData";
import {
  downloadBlob,
  getOrCreateCertificateNumber,
  getAttestationType,
  isMobiliteFormation,
  type CertificateInfo,
} from "./documentUtils";
import {
  DocumentGenerationError,
  classifyError,
} from "./documentErrors";

interface CentreFormationData {
  nom_commercial?: string;
  nom_legal: string;
  adresse_complete: string;
  telephone: string;
  email: string;
  siret: string;
  nda: string;
}

/** Enriched contact data that may contain extra fields from ContactDocumentData. */
type EnrichedContact = ContactInfo & Partial<ContactDocumentData>;

function buildAttestationVariableData(
  fullContact: EnrichedContact,
  session: SessionInfo,
  centreFormation?: CentreFormationData | null,
  certificateInfo?: CertificateInfo
) {
  return buildVariableData(
    {
      civilite: fullContact.civilite,
      nom: fullContact.nom,
      prenom: fullContact.prenom,
      email: fullContact.email,
      telephone: fullContact.telephone,
      rue: fullContact.rue,
      code_postal: fullContact.code_postal,
      ville: fullContact.ville,
      date_naissance: fullContact.date_naissance,
      ville_naissance: fullContact.ville_naissance,
      pays_naissance: fullContact.pays_naissance,
      numero_carte_professionnelle: fullContact.numero_carte_professionnelle,
      prefecture_carte: fullContact.prefecture_carte,
      date_expiration_carte: fullContact.date_expiration_carte,
      numero_permis: fullContact.numero_permis,
      prefecture_permis: fullContact.prefecture_permis,
      date_delivrance_permis: fullContact.date_delivrance_permis,
      formation: fullContact.formation,
    },
    {
      nom: session.nom,
      date_debut: session.date_debut,
      date_fin: session.date_fin,
      lieu: session.lieu,
      heure_debut: session.heure_debut,
      heure_fin: session.heure_fin,
      heure_debut_matin: session.heure_debut_matin,
      heure_fin_matin: session.heure_fin_matin,
      heure_debut_aprem: session.heure_debut_aprem,
      heure_fin_aprem: session.heure_fin_aprem,
      formation_type: session.formation_type,
      duree_heures: session.duree_heures,
    },
    centreFormation
      ? {
          nom: centreFormation.nom_commercial || centreFormation.nom_legal,
          adresse: centreFormation.adresse_complete,
          telephone: centreFormation.telephone,
          email: centreFormation.email,
          siret: centreFormation.siret,
          nda: centreFormation.nda,
        }
      : undefined,
    certificateInfo || undefined
  );
}

function validateMobiliteFields(fullContact: any): string[] {
  const champsManquants: string[] = [];
  if (!fullContact.date_naissance) champsManquants.push("Date de naissance");
  if (!fullContact.ville_naissance) champsManquants.push("Ville de naissance");
  if (!fullContact.pays_naissance) champsManquants.push("Pays de naissance");
  if (!fullContact.rue) champsManquants.push("Adresse (rue)");
  if (!fullContact.code_postal) champsManquants.push("Code postal");
  if (!fullContact.ville) champsManquants.push("Ville");
  return champsManquants;
}

async function downloadTemplate(filePath: string): Promise<Blob> {
  const { data: templateBlob, error: downloadError } = await supabase.storage
    .from("document-templates")
    .download(filePath);

  if (downloadError || !templateBlob) {
    throw new DocumentGenerationError(
      "Impossible de télécharger le modèle de document. Vérifiez votre connexion.",
      "TEMPLATE_DOWNLOAD_FAILED",
      downloadError?.message
    );
  }
  return templateBlob;
}

async function enrichContact(contact: ContactInfo, contactId?: string, formationType?: string): Promise<EnrichedContact> {
  if (!contactId) return contact;
  try {
    const extra = await fetchContactDocumentData(contactId, formationType);
    return { ...contact, ...extra };
  } catch (e) {
    console.warn("[DOCX] Contact partiel (fallback)", e);
    return contact;
  }
}

/**
 * Génère une attestation unique (fiche stagiaire ou fiche session).
 */
export async function generateSingleAttestation(
  contact: ContactInfoWithId,
  session: SessionInfoWithId,
  company: CompanyInfo,
  centreFormation?: CentreFormationData | null
): Promise<void> {
  const contactId = contact.id;
  const sessionId = session.id;
  const typeAttestation = getAttestationType(session.formation_type);

  // Générer le numéro de certificat
  let certificateInfo: CertificateInfo | null = null;
  if (contactId) {
    certificateInfo = await getOrCreateCertificateNumber(contactId, sessionId, typeAttestation);
    if (certificateInfo) {
      console.log(`[Certificat] Numéro généré: ${certificateInfo.numero_certificat}`);
    }
  }

  // Chercher un modèle DOCX par défaut
  const defaultTemplate = await getDefaultTemplate("attestation", session.formation_type);

  if (defaultTemplate?.actif && defaultTemplate.type_fichier === "docx") {
    const templateBlob = await downloadTemplate(defaultTemplate.file_path);
    const fullContact = await enrichContact(contact, contactId, session.formation_type);

    // Validation Mobilité
    if (isMobiliteFormation(session.formation_type)) {
      const missing = validateMobiliteFields(fullContact);
      if (missing.length > 0) {
        console.warn(`[Attestation Mobilité] Champs manquants:`, missing);
        toast.warning(
          `Attestation générée avec des champs vides. Complétez la fiche contact : ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` (+${missing.length - 3})` : ""}`,
          { duration: 6000 }
        );
      }
    }

    const variableData = buildAttestationVariableData(fullContact, session, centreFormation, certificateInfo || undefined);

    try {
      const processedBlob = await processDocxWithVariables(templateBlob, variableData);
      downloadBlob(processedBlob, `attestation-${contact.nom}-${contact.prenom}.docx`);
    } catch (err) {
      throw new DocumentGenerationError(
        "Erreur lors du traitement du modèle Word. Le fichier est peut-être corrompu.",
        "DOCX_PROCESSING_FAILED",
        err instanceof Error ? err.message : String(err)
      );
    }

    toast.success(`Attestation téléchargée${certificateInfo ? ` (${certificateInfo.numero_certificat})` : ""}`);
    return;
  }

  // Fallback PDF
  const pdf = generateAttestationPDF(contact, session, company, certificateInfo?.numero_certificat);
  downloadPDF(pdf, `attestation-${contact.nom}-${contact.prenom}.pdf`);
  toast.success(`Attestation téléchargée${certificateInfo ? ` (${certificateInfo.numero_certificat})` : ""}`);
}

/**
 * Génère des attestations en lot pour plusieurs contacts.
 */
export async function generateBulkAttestations(
  contacts: ContactInfo[],
  session: SessionInfo,
  company: CompanyInfo,
  centreFormation?: CentreFormationData | null
): Promise<number> {
  const typeAttestation = getAttestationType(session.formation_type);
  let successCount = 0;

  const defaultTemplate = await getDefaultTemplate("attestation", session.formation_type);

  if (defaultTemplate?.actif && defaultTemplate.type_fichier === "docx") {
    const templateBlob = await downloadTemplate(defaultTemplate.file_path);

    // Précharger tous les contacts en une seule requête
    let contactsById: Record<string, any> = {};
    try {
      const ids = contacts.map((c) => (c as any)?.id).filter(Boolean) as string[];
      contactsById = await fetchContactsDocumentData(ids, session?.formation_type);
    } catch (e) {
      console.warn("[DOCX] Impossible de précharger les contacts (bulk)", e);
    }

    for (const contact of contacts) {
      try {
        const contactId = (contact as any)?.id;
        const sessionId = (session as any)?.id;
        let certificateInfo: CertificateInfo | null = null;

        if (contactId) {
          certificateInfo = await getOrCreateCertificateNumber(contactId, sessionId, typeAttestation);
        }

        const fullContact =
          contactId && contactsById[contactId]
            ? { ...contact, ...contactsById[contactId] }
            : contact;

        const variableData = buildAttestationVariableData(fullContact, session, centreFormation, certificateInfo || undefined);
        const processedBlob = await processDocxWithVariables(templateBlob, variableData);
        downloadBlob(processedBlob, `attestation-${contact.nom}-${contact.prenom}.docx`);
        successCount++;
      } catch (err) {
        console.error(`Erreur attestation pour ${contact.nom} ${contact.prenom}:`, err);
      }
    }

    return successCount;
  }

  // Fallback PDF
  for (const contact of contacts) {
    try {
      const contactId = (contact as any)?.id;
      const sessionId = (session as any)?.id;
      let certificateInfo: CertificateInfo | null = null;

      if (contactId) {
        certificateInfo = await getOrCreateCertificateNumber(contactId, sessionId, typeAttestation);
      }

      const pdf = generateAttestationPDF(contact, session, company, certificateInfo?.numero_certificat);
      downloadPDF(pdf, `attestation-${contact.nom}-${contact.prenom}.pdf`);
      successCount++;
    } catch (err) {
      console.error(`Erreur attestation PDF pour ${contact.nom} ${contact.prenom}:`, err);
    }
  }

  return successCount;
}
