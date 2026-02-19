import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultTemplate } from "@/hooks/useDocumentTemplateFiles";
import { buildVariableData, processDocxWithVariables } from "@/lib/docx-processor";
import {
  fetchContactDocumentData,
  fetchContactsDocumentData,
} from "@/lib/documents/fetchContactDocumentData";
import {
  generateFacturePDF,
  generateAttestationPDF,
  generateConventionPDF,
  generateContratFormationPDF,
  generateConvocationPDF,
  generateProgrammePDF,
  downloadPDF,
  preloadCompanyImages,
  type ContactInfo,
  type SessionInfo,
  type FactureInfo,
  type CompanyInfo,
  type AgrementsAutre,
} from "@/lib/pdf-generator";

// Fonction utilitaire pour créer ou récupérer un numéro de certificat
async function getOrCreateCertificateNumber(
  contactId: string,
  sessionId?: string,
  typeAttestation: string = 'formation'
): Promise<{ numero_certificat: string; date_emission: string } | null> {
  try {
    const { data, error } = await supabase.rpc('create_attestation_certificate', {
      p_contact_id: contactId,
      p_session_id: sessionId || null,
      p_type_attestation: typeAttestation,
      p_metadata: {},
    });

    if (error) {
      console.error('Erreur création certificat:', error);
      return null;
    }

    if (data && data.length > 0) {
      return {
        numero_certificat: data[0].numero_certificat,
        date_emission: data[0].date_emission,
      };
    }
    return null;
  } catch (err) {
    console.error('Erreur getOrCreateCertificateNumber:', err);
    return null;
  }
}

export type DocumentType = "facture" | "attestation" | "convention" | "contrat" | "convocation" | "programme";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useDocumentGenerator() {
  const { centreFormation } = useCentreFormation();

  // Build CompanyInfo from centre_formation data
  const getCompanyInfo = useCallback((): CompanyInfo | undefined => {
    if (!centreFormation) return undefined;
    
    // Parse agrements_autres from DB (JSON array)
    let agrements_autres: AgrementsAutre[] = [];

    const rawAgrements = centreFormation.agrements_autres as unknown;
    if (Array.isArray(rawAgrements)) {
      agrements_autres = rawAgrements
        .filter((a): a is AgrementsAutre => !!a && typeof a === "object")
        .map((a: any) => ({
          nom: String(a.nom ?? ""),
          numero: String(a.numero ?? ""),
          date_obtention: a.date_obtention ?? undefined,
          date_expiration: a.date_expiration ?? undefined,
        }))
        .filter((a) => a.nom.trim() !== "" && a.numero.trim() !== "");
    } else if (rawAgrements && typeof rawAgrements === "object") {
      // compat: ancien format { agrements: [...] }
      const maybe = rawAgrements as any;
      if (Array.isArray(maybe.agrements)) {
        agrements_autres = maybe.agrements as AgrementsAutre[];
      }
    }
    
    return {
      name: centreFormation.nom_commercial || centreFormation.nom_legal,
      address: centreFormation.adresse_complete,
      phone: centreFormation.telephone,
      email: centreFormation.email,
      siret: centreFormation.siret,
      nda: centreFormation.nda,
      // Visuels
      logo_url: centreFormation.logo_url || undefined,
      signature_cachet_url: centreFormation.signature_cachet_url || undefined,
      // Agréments et certifications
      qualiopi_numero: centreFormation.qualiopi_numero || undefined,
      qualiopi_date_obtention: centreFormation.qualiopi_date_obtention || undefined,
      qualiopi_date_expiration: centreFormation.qualiopi_date_expiration || undefined,
      agrement_prefecture: centreFormation.agrement_prefecture || undefined,
      agrement_prefecture_date: centreFormation.agrement_prefecture_date || undefined,
      code_rncp: centreFormation.code_rncp || undefined,
      code_rs: centreFormation.code_rs || undefined,
      agrements_autres: agrements_autres.length > 0 ? agrements_autres : undefined,
    };
  }, [centreFormation]);

  // Preload company images on mount
  useEffect(() => {
    const company = getCompanyInfo();
    if (company) {
      preloadCompanyImages(company);
    }
  }, [getCompanyInfo]);

  const generateDocument = useCallback(
    (
      type: DocumentType,
      contact: ContactInfo,
      session?: SessionInfo,
      facture?: FactureInfo
    ) => {
      try {
        const company = getCompanyInfo();
        
        if (!company) {
          toast.error("Configuration du centre de formation manquante. Allez dans Paramètres pour la configurer.");
          return null;
        }

        let doc;
        let filename: string;

        switch (type) {
          case "facture":
            if (!facture) {
              toast.error("Données de facture manquantes");
              return null;
            }
            doc = generateFacturePDF(facture, contact, session, company);
            filename = `facture-${facture.numero_facture}.pdf`;
            break;

          case "attestation":
            if (!session) {
              toast.error("Données de session manquantes");
              return null;
            }

            // If a default imported template exists for this formation, use it
            // (ex: Mobilité Taxi -> ATTESTATION MOB 75 MONTROUGE)
            void (async () => {
              try {
                // Générer ou récupérer le numéro de certificat unique
                const contactId = (contact as any)?.id;
                const sessionId = (session as any)?.id;
                let certificateInfo: { numero_certificat: string; date_emission: string } | null = null;
                
                // Déterminer si c'est une formation Mobilité (nécessite plus de champs)
                const isMobiliteFormation = session.formation_type?.toLowerCase().includes('mobilite') || 
                    session.formation_type?.toLowerCase().includes('mobilité');
                
                if (contactId) {
                  // Déterminer le type d'attestation selon la formation
                  let typeAttestation = 'formation';
                  if (isMobiliteFormation) {
                    typeAttestation = 'mobilite';
                  }
                  
                  certificateInfo = await getOrCreateCertificateNumber(contactId, sessionId, typeAttestation);
                  if (certificateInfo) {
                    console.log(`[Certificat] Numéro généré: ${certificateInfo.numero_certificat}`);
                  }
                }
                
                const defaultTemplate = await getDefaultTemplate("attestation", session.formation_type);

                if (defaultTemplate?.actif && defaultTemplate.type_fichier === "docx") {
                  const { data: templateBlob, error: downloadError } = await supabase.storage
                    .from("document-templates")
                    .download(defaultTemplate.file_path);

                  if (downloadError || !templateBlob) {
                    throw downloadError ?? new Error("Impossible de télécharger le modèle");
                  }

                  let fullContact: any = contact;
                  if (contactId) {
                    try {
                      fullContact = { ...contact, ...(await fetchContactDocumentData(contactId)) };
                    } catch (e) {
                      console.warn("[DOCX] Contact partiel (fallback)", e);
                    }
                  }
                  
                  // Pour les formations Mobilité, vérifier les champs obligatoires
                  if (isMobiliteFormation) {
                    const champsManquants: string[] = [];
                    if (!fullContact.date_naissance) champsManquants.push("Date de naissance");
                    if (!fullContact.ville_naissance) champsManquants.push("Ville de naissance");
                    if (!fullContact.pays_naissance) champsManquants.push("Pays de naissance");
                    if (!fullContact.rue) champsManquants.push("Adresse (rue)");
                    if (!fullContact.code_postal) champsManquants.push("Code postal");
                    if (!fullContact.ville) champsManquants.push("Ville");
                    
                    if (champsManquants.length > 0) {
                      console.warn(`[Attestation Mobilité] Champs manquants pour ${fullContact.nom} ${fullContact.prenom}:`, champsManquants);
                      toast.warning(
                        `Attestation générée avec des champs vides. Complétez la fiche contact : ${champsManquants.slice(0, 3).join(", ")}${champsManquants.length > 3 ? ` (+${champsManquants.length - 3})` : ""}`,
                        { duration: 6000 }
                      );
                    }
                  }

                  const variableData = buildVariableData(
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
                      heure_debut_matin: (session as any).heure_debut_matin,
                      heure_fin_matin: (session as any).heure_fin_matin,
                      heure_debut_aprem: (session as any).heure_debut_aprem,
                      heure_fin_aprem: (session as any).heure_fin_aprem,
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

                  const processedBlob = await processDocxWithVariables(templateBlob, variableData);
                  downloadBlob(processedBlob, `attestation-${contact.nom}-${contact.prenom}.docx`);
                  toast.success(`Attestation téléchargée${certificateInfo ? ` (${certificateInfo.numero_certificat})` : ''}`);
                  return;
                }

                // Fallback: standard PDF generation avec numéro de certificat
                const pdf = generateAttestationPDF(contact, session, company, certificateInfo?.numero_certificat);
                downloadPDF(pdf, `attestation-${contact.nom}-${contact.prenom}.pdf`);
                toast.success(`Attestation téléchargée${certificateInfo ? ` (${certificateInfo.numero_certificat})` : ''}`);
              } catch (err) {
                console.error("Erreur génération attestation (modèle importé):", err);
                toast.error("Erreur lors de la génération de l'attestation");
              }
            })();

            // Note: async generation above triggers the download
            return null;

          case "convention":
            if (!session) {
              toast.error("Données de session manquantes");
              return null;
            }
            doc = generateConventionPDF(contact, session, company);
            filename = `convention-${contact.nom}-${contact.prenom}.pdf`;
            break;

          case "contrat":
            if (!session) {
              toast.error("Données de session manquantes");
              return null;
            }
            doc = generateContratFormationPDF(contact, session, company);
            filename = `contrat-formation-${contact.nom}-${contact.prenom}.pdf`;
            break;

          case "convocation":
            if (!session) {
              toast.error("Données de session manquantes");
              return null;
            }
            doc = generateConvocationPDF(contact, session, company);
            filename = `convocation-${contact.nom}-${contact.prenom}.pdf`;
            break;

          case "programme":
            if (!session) {
              toast.error("Données de session manquantes");
              return null;
            }
            doc = generateProgrammePDF(session, company);
            filename = `programme-${session.nom.replace(/\s+/g, '-')}.pdf`;
            break;

          default:
            toast.error("Type de document non supporté");
            return null;
        }

        downloadPDF(doc, filename);
        toast.success(`${getDocumentLabel(type)} téléchargé`);
        return doc;
      } catch (error) {
        console.error("Erreur génération PDF:", error);
        toast.error("Erreur lors de la génération du PDF");
        return null;
      }
    },
    [getCompanyInfo, centreFormation]
  );

  const generateBulkDocuments = useCallback(
    (
      type: DocumentType,
      contacts: ContactInfo[],
      session: SessionInfo
    ) => {
      if (type === "attestation") {
        // Handle async template download/processing once for all contacts
        void (async () => {
          const company = getCompanyInfo();
          if (!company) {
            toast.error(
              "Configuration du centre de formation manquante. Allez dans Paramètres pour la configurer."
            );
            return;
          }

          let successCount = 0;

          try {
            // Déterminer le type d'attestation selon la formation
            let typeAttestation = 'formation';
            if (session.formation_type?.toLowerCase().includes('mobilite') || 
                session.formation_type?.toLowerCase().includes('mobilité')) {
              typeAttestation = 'mobilite';
            }
            
            const defaultTemplate = await getDefaultTemplate("attestation", session.formation_type);

            if (defaultTemplate?.actif && defaultTemplate.type_fichier === "docx") {
              const { data: templateBlob, error: downloadError } = await supabase.storage
                .from("document-templates")
                .download(defaultTemplate.file_path);

              if (downloadError || !templateBlob) {
                throw downloadError ?? new Error("Impossible de télécharger le modèle");
              }

              let contactsById: Record<string, any> = {};
              try {
                const ids = contacts
                  .map((c) => (c as any)?.id)
                  .filter(Boolean) as string[];
                contactsById = await fetchContactsDocumentData(ids);
              } catch (e) {
                console.warn("[DOCX] Impossible de précharger les contacts (bulk)", e);
              }

              for (const contact of contacts) {
                // Générer le numéro de certificat pour chaque contact
                const contactId = (contact as any)?.id;
                const sessionId = (session as any)?.id;
                let certificateInfo: { numero_certificat: string; date_emission: string } | null = null;
                
                if (contactId) {
                  certificateInfo = await getOrCreateCertificateNumber(contactId, sessionId, typeAttestation);
                }
                
                const fullContact: any =
                  contactId && contactsById[contactId]
                    ? { ...contact, ...contactsById[contactId] }
                    : contact;

                const variableData = buildVariableData(
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
                    heure_debut_matin: (session as any).heure_debut_matin,
                    heure_fin_matin: (session as any).heure_fin_matin,
                    heure_debut_aprem: (session as any).heure_debut_aprem,
                    heure_fin_aprem: (session as any).heure_fin_aprem,
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

                const processedBlob = await processDocxWithVariables(templateBlob, variableData);
                downloadBlob(processedBlob, `attestation-${contact.nom}-${contact.prenom}.docx`);
                successCount++;
              }

              toast.success(`${successCount} attestation(s) générée(s) avec numéros de certificat`);
              return;
            }

            // Fallback: standard PDF generation avec numéros de certificat
            for (const contact of contacts) {
              const contactId = (contact as any)?.id;
              const sessionId = (session as any)?.id;
              let certificateInfo: { numero_certificat: string; date_emission: string } | null = null;
              
              if (contactId) {
                certificateInfo = await getOrCreateCertificateNumber(contactId, sessionId, typeAttestation);
              }
              
              const pdf = generateAttestationPDF(contact, session, company, certificateInfo?.numero_certificat);
              downloadPDF(pdf, `attestation-${contact.nom}-${contact.prenom}.pdf`);
              successCount++;
            }
            toast.success(`${successCount} attestation(s) générée(s) avec numéros de certificat`);
          } catch (err) {
            console.error("Erreur génération attestations (bulk):", err);
            toast.error("Erreur lors de la génération des attestations");
          }
        })();

        return;
      }

      let successCount = 0;
      
      contacts.forEach((contact) => {
        const result = generateDocument(type, contact, session);
        if (result) successCount++;
      });

      if (successCount > 0) {
        toast.success(`${successCount} document(s) généré(s)`);
      }
    },
    [generateDocument, getCompanyInfo, centreFormation]
  );

  return {
    generateDocument,
    generateBulkDocuments,
    getCompanyInfo,
    hasCentreFormation: !!centreFormation,
  };
}

function getDocumentLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    facture: "Facture",
    attestation: "Attestation",
    convention: "Convention de formation",
    contrat: "Contrat de formation",
    convocation: "Convocation",
    programme: "Programme de formation",
  };
  return labels[type];
}