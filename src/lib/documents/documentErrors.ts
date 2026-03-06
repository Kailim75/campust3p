/**
 * Erreurs typées pour la génération de documents
 */

export class DocumentGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: DocumentErrorCode,
    public readonly details?: string
  ) {
    super(message);
    this.name = "DocumentGenerationError";
  }
}

export type DocumentErrorCode =
  | "MISSING_CENTRE_CONFIG"
  | "MISSING_SESSION"
  | "MISSING_FACTURE"
  | "TEMPLATE_NOT_FOUND"
  | "TEMPLATE_DOWNLOAD_FAILED"
  | "CERTIFICATE_GENERATION_FAILED"
  | "DOCX_PROCESSING_FAILED"
  | "PDF_GENERATION_FAILED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

/** Messages utilisateur lisibles par code d'erreur */
const ERROR_MESSAGES: Record<DocumentErrorCode, string> = {
  MISSING_CENTRE_CONFIG:
    "Configuration du centre de formation manquante. Allez dans Paramètres pour la configurer.",
  MISSING_SESSION: "Données de session manquantes pour ce document.",
  MISSING_FACTURE: "Données de facture manquantes.",
  TEMPLATE_NOT_FOUND:
    "Aucun modèle de document trouvé pour cette formation. Vérifiez la configuration des modèles.",
  TEMPLATE_DOWNLOAD_FAILED:
    "Impossible de télécharger le modèle de document. Vérifiez votre connexion internet.",
  CERTIFICATE_GENERATION_FAILED:
    "Erreur lors de la génération du numéro de certificat.",
  DOCX_PROCESSING_FAILED:
    "Erreur lors du traitement du modèle Word. Le fichier est peut-être corrompu.",
  PDF_GENERATION_FAILED: "Erreur lors de la génération du PDF.",
  NETWORK_ERROR:
    "Erreur réseau. Vérifiez votre connexion internet et réessayez.",
  UNKNOWN: "Erreur inattendue lors de la génération du document.",
};

export function getErrorMessage(code: DocumentErrorCode): string {
  return ERROR_MESSAGES[code];
}

export function classifyError(error: unknown): DocumentGenerationError {
  if (error instanceof DocumentGenerationError) return error;

  const msg =
    error instanceof Error ? error.message : String(error);

  // Classify network errors
  if (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError")
  ) {
    return new DocumentGenerationError(
      getErrorMessage("NETWORK_ERROR"),
      "NETWORK_ERROR",
      msg
    );
  }

  // Classify storage/download errors
  if (
    msg.includes("télécharger") ||
    msg.includes("download") ||
    msg.includes("storage")
  ) {
    return new DocumentGenerationError(
      getErrorMessage("TEMPLATE_DOWNLOAD_FAILED"),
      "TEMPLATE_DOWNLOAD_FAILED",
      msg
    );
  }

  return new DocumentGenerationError(
    getErrorMessage("UNKNOWN"),
    "UNKNOWN",
    msg
  );
}
