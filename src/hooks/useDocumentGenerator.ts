import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import {
  generateFacturePDF,
  generateConventionPDF,
  generateContratFormationPDF,
  generateConvocationPDF,
  generateProgrammePDF,
  downloadPDF,
  preloadCompanyImages,
  type ContactInfo,
  type SessionInfo,
  type FactureInfo,
} from "@/lib/pdf-generator";
import { buildCompanyInfo } from "@/lib/documents/companyInfo";
import {
  getDocumentLabel,
  type DocumentType,
} from "@/lib/documents/documentUtils";
import {
  generateSingleAttestation,
  generateBulkAttestations,
} from "@/lib/documents/generateAttestation";
import {
  classifyError,
  getErrorMessage,
} from "@/lib/documents/documentErrors";

export type { DocumentType } from "@/lib/documents/documentUtils";

export function useDocumentGenerator() {
  const { centreFormation } = useCentreFormation();

  const getCompanyInfo = useCallback(() => {
    return buildCompanyInfo(centreFormation);
  }, [centreFormation]);

  // Preload company images on mount
  useEffect(() => {
    const company = getCompanyInfo();
    if (company) {
      preloadCompanyImages(company);
    }
  }, [getCompanyInfo]);

  const generateDocument = useCallback(
    async (
      type: DocumentType,
      contact: ContactInfo,
      session?: SessionInfo,
      facture?: FactureInfo
    ) => {
      try {
        const company = getCompanyInfo();

        if (!company) {
          toast.error(getErrorMessage("MISSING_CENTRE_CONFIG"));
          return null;
        }

        await preloadCompanyImages(company);

        let doc;
        let filename: string;

        switch (type) {
          case "facture":
            if (!facture) {
              toast.error(getErrorMessage("MISSING_FACTURE"));
              return null;
            }
            doc = generateFacturePDF(facture, contact, session, company);
            filename = `facture-${facture.numero_facture}.pdf`;
            break;

          case "attestation":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            // Async generation — errors handled internally
            void (async () => {
              try {
                await generateSingleAttestation(contact, session, company, centreFormation);
              } catch (err) {
                const docErr = classifyError(err);
                console.error(`[Attestation] ${docErr.code}:`, docErr.details);
                toast.error(docErr.message);
              }
            })();
            return null;

          case "convention":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            doc = generateConventionPDF(contact, session, company);
            filename = `convention-${contact.nom}-${contact.prenom}.pdf`;
            break;

          case "contrat":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            doc = generateContratFormationPDF(contact, session, company);
            filename = `contrat-formation-${contact.nom}-${contact.prenom}.pdf`;
            break;

          case "convocation":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            doc = generateConvocationPDF(contact, session, company);
            filename = `convocation-${contact.nom}-${contact.prenom}.pdf`;
            break;

          case "programme":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            doc = generateProgrammePDF(session, company);
            filename = `programme-${session.nom.replace(/\s+/g, "-")}.pdf`;
            break;

          default:
            toast.error("Type de document non supporté");
            return null;
        }

        downloadPDF(doc, filename);
        toast.success(`${getDocumentLabel(type)} téléchargé`);
        return doc;
      } catch (error) {
        const docErr = classifyError(error);
        console.error(`[Document] ${docErr.code}:`, docErr.details);
        toast.error(docErr.message);
        return null;
      }
    },
    [getCompanyInfo, centreFormation]
  );

  const generateBulkDocuments = useCallback(
    (type: DocumentType, contacts: ContactInfo[], session: SessionInfo) => {
      if (type === "attestation") {
        void (async () => {
          const company = getCompanyInfo();
          if (!company) {
            toast.error(getErrorMessage("MISSING_CENTRE_CONFIG"));
            return;
          }

          try {
            const count = await generateBulkAttestations(
              contacts,
              session,
              company,
              centreFormation
            );
            if (count > 0) {
              toast.success(`${count} attestation(s) générée(s) avec numéros de certificat`);
            } else {
              toast.error("Aucune attestation n'a pu être générée.");
            }
          } catch (err) {
            const docErr = classifyError(err);
            console.error(`[Bulk Attestation] ${docErr.code}:`, docErr.details);
            toast.error(docErr.message);
          }
        })();
        return;
      }

      // Autres types de documents
      void (async () => {
        let successCount = 0;
        for (const contact of contacts) {
          const result = await generateDocument(type, contact, session);
          if (result) successCount++;
        }
        if (successCount > 0) {
          toast.success(`${successCount} document(s) généré(s)`);
        }
      })();
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
