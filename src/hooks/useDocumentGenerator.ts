import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import {
  generateFacturePDF,
  generateConventionPDF as generateConventionPDFLegacy,
  generateContratFormationPDF as generateContratPDFLegacy,
  generateConvocationPDF,
  generateProgrammePDF,
  generateAttestationPresencePDF,
  downloadPDF,
  preloadCompanyImages,
  type ContactInfo,
  type SessionInfo,
  type FactureInfo,
} from "@/lib/pdf-generator";
import { generateContratFormationV2, validateContratData } from "@/lib/documents/generateContratFormation";
import { generateConventionFormationV2 } from "@/lib/documents/generateConventionFormation";
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
import { clientImprimeFacture, type FacturePourClientPdf } from "@/lib/facture-payer-utils";

/**
 * Facture passée à `generateDocument` : les colonnes buyer_* de la ligne, quand
 * l'appelant les a, s'ajoutent à ce que le PDF sait déjà afficher. Sans elles,
 * le comportement est inchangé (repli sur la fiche).
 */
export type FacturePourDocument = FactureInfo & Partial<Omit<FacturePourClientPdf, "statut">>;

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
      facture?: FacturePourDocument
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
            {
              // 5ᵉ point d'entrée d'un PDF de facture : il doit suivre la même
              // règle D2 que la fiche facture et l'onglet Paiements — une
              // facture qui n'est plus un brouillon imprime l'acheteur FIGÉ,
              // la fiche ne servant que de repli
              // (src/lib/facture-payer-utils.ts).
              const client = clientImprimeFacture(facture, {
                contact,
                payer: facture.payer,
                beneficiaire: facture.beneficiaire,
                montant_pris_en_charge: facture.montant_pris_en_charge,
                reste_a_charge: facture.reste_a_charge,
              });
              doc = generateFacturePDF(
                {
                  ...facture,
                  payer: client.payer,
                  beneficiaire: client.beneficiaire,
                  montant_pris_en_charge: client.montant_pris_en_charge,
                  reste_a_charge: client.reste_a_charge,
                },
                client.contact,
                session,
                company,
              );
              filename = `facture-${facture.numero_facture}.pdf`;
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
            doc = generateConventionFormationV2(contact, session, company);
            filename = `convention-${contact.nom}-${contact.prenom}.pdf`;
            break;

          case "contrat":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            {
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
            }
            doc = generateContratFormationV2(contact, session, company);
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

          case "attestation_presence":
            if (!session) {
              toast.error(getErrorMessage("MISSING_SESSION"));
              return null;
            }
            doc = generateAttestationPresencePDF(contact, session, company);
            filename = `attestation-presence-${contact.nom}-${contact.prenom}.pdf`;
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
