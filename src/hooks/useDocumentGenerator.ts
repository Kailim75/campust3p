import { useCallback } from "react";
import { toast } from "sonner";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import {
  generateFacturePDF,
  generateAttestationPDF,
  generateConventionPDF,
  generateContratFormationPDF,
  generateConvocationPDF,
  downloadPDF,
  type ContactInfo,
  type SessionInfo,
  type FactureInfo,
  type CompanyInfo,
} from "@/lib/pdf-generator";

export type DocumentType = "facture" | "attestation" | "convention" | "contrat" | "convocation";

export function useDocumentGenerator() {
  const { centreFormation } = useCentreFormation();

  // Build CompanyInfo from centre_formation data
  const getCompanyInfo = useCallback((): CompanyInfo | undefined => {
    if (!centreFormation) return undefined;
    
    return {
      name: centreFormation.nom_commercial || centreFormation.nom_legal,
      address: centreFormation.adresse_complete,
      phone: centreFormation.telephone,
      email: centreFormation.email,
      siret: centreFormation.siret,
      nda: centreFormation.nda,
    };
  }, [centreFormation]);

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
            doc = generateAttestationPDF(contact, session, company);
            filename = `attestation-${contact.nom}-${contact.prenom}.pdf`;
            break;

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
    [getCompanyInfo]
  );

  const generateBulkDocuments = useCallback(
    (
      type: DocumentType,
      contacts: ContactInfo[],
      session: SessionInfo
    ) => {
      let successCount = 0;
      
      contacts.forEach((contact) => {
        const result = generateDocument(type, contact, session);
        if (result) successCount++;
      });

      if (successCount > 0) {
        toast.success(`${successCount} document(s) généré(s)`);
      }
    },
    [generateDocument]
  );

  return {
    generateDocument,
    generateBulkDocuments,
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
  };
  return labels[type];
}