import { useCallback } from "react";
import { toast } from "sonner";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import type {
  ContactInfo,
  SessionInfo,
  FactureInfo,
} from "@/lib/pdf-generator";
import { buildCompanyInfo } from "@/lib/documents/companyInfo";
import {
  getDocumentLabel,
  type DocumentType,
} from "@/lib/documents/documentUtils";
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

        let doc;

        switch (type) {
          case "facture":
            if (!facture) {
              toast.error(getErrorMessage("MISSING_FACTURE"));
              return null;
            }
            {
              const [{ generateFacturePDF, downloadPDF, preloadCompanyImages }] = await Promise.all([
                import("@/lib/pdf-generator"),
              ]);
              await preloadCompanyImages(company);
              doc = generateFacturePDF(facture, contact, session, company);
              downloadPDF(doc, `facture-${facture.numero_facture}.pdf`);
            }
            break;

          case "attestation":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            // Async generation — errors handled internally
            void (async () => {
              try {
                const [{ generateSingleAttestation }] = await Promise.all([
                  import("@/lib/documents/generateAttestation"),
                ]);
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
            {
              const [
                { generateConventionFormationV2 },
                { downloadPDF, preloadCompanyImages },
              ] = await Promise.all([
                import("@/lib/documents/generateConventionFormation"),
                import("@/lib/pdf-generator"),
              ]);
              await preloadCompanyImages(company);
              doc = generateConventionFormationV2(contact, session, company);
              downloadPDF(doc, `convention-${contact.nom}-${contact.prenom}.pdf`);
            }
            break;

          case "contrat":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            {
              const [
                { generateContratFormationV2, validateContratData },
                { downloadPDF, preloadCompanyImages },
              ] = await Promise.all([
                import("@/lib/documents/generateContratFormation"),
                import("@/lib/pdf-generator"),
              ]);
              const validationErrors = validateContratData(contact, session, company);
              const blockingErrors = validationErrors.filter(e => e.severity === "blocking");
              if (blockingErrors.length > 0) {
                toast.error(`Données manquantes pour le contrat : ${blockingErrors.map(e => e.message).join(", ")}`);
                return null;
              }
              const warnings = validationErrors.filter(e => e.severity === "warning");
              if (warnings.length > 0) {
                toast.warning(`Attention : ${warnings.map(e => e.message).join(", ")}`);
              }
              await preloadCompanyImages(company);
              doc = generateContratFormationV2(contact, session, company);
              downloadPDF(doc, `contrat-formation-${contact.nom}-${contact.prenom}.pdf`);
            }
            break;

          case "convocation":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            {
              const [{ generateConvocationPDF, downloadPDF, preloadCompanyImages }] = await Promise.all([
                import("@/lib/pdf-generator"),
              ]);
              await preloadCompanyImages(company);
              doc = generateConvocationPDF(contact, session, company);
              downloadPDF(doc, `convocation-${contact.nom}-${contact.prenom}.pdf`);
            }
            break;

          case "programme":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            {
              const [{ generateProgrammePDF, downloadPDF, preloadCompanyImages }] = await Promise.all([
                import("@/lib/pdf-generator"),
              ]);
              await preloadCompanyImages(company);
              doc = generateProgrammePDF(session, company);
              downloadPDF(doc, `programme-${session.nom.replace(/\s+/g, "-")}.pdf`);
            }
            break;

          case "attestation_presence":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            {
              const [{ generateAttestationPresencePDF, downloadPDF, preloadCompanyImages }] = await Promise.all([
                import("@/lib/pdf-generator"),
              ]);
              await preloadCompanyImages(company);
              doc = generateAttestationPresencePDF(contact, session, company);
              downloadPDF(doc, `attestation-presence-${contact.nom}-${contact.prenom}.pdf`);
            }
            break;

          default:
            toast.error("Type de document non supporté");
            return null;
        }

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
            const [{ generateBulkAttestations }] = await Promise.all([
              import("@/lib/documents/generateAttestation"),
            ]);
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
