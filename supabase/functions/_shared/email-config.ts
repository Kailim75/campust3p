/**
 * Configuration email centralisée pour le CRM
 * UNIQUE adresse d'envoi : montrouge@ecolet3p.fr
 * 
 * Cette configuration est VERROUILLÉE - toute modification doit être validée.
 */

// ===============================================
// CONFIGURATION EMAIL GLOBALE - NE PAS MODIFIER
// ===============================================

export const EMAIL_CONFIG = {
  // Adresse d'envoi unique et obligatoire
  SENDER_EMAIL: "montrouge@ecolet3p.fr",
  
  // Nom d'affichage de l'expéditeur
  SENDER_NAME: "Ecole T3P Montrouge",
  
  // Adresse formatée pour Resend
  get FROM_ADDRESS(): string {
    return `${this.SENDER_NAME} <${this.SENDER_EMAIL}>`;
  },
  
  // Reply-To (même adresse pour cohérence)
  REPLY_TO: "montrouge@ecolet3p.fr",
} as const;

/**
 * Retourne l'adresse d'envoi formatée
 * Utiliser cette fonction pour TOUS les envois d'emails
 */
export function getFromAddress(): string {
  return `${EMAIL_CONFIG.SENDER_NAME} <${EMAIL_CONFIG.SENDER_EMAIL}>`;
}

/**
 * Valide qu'une adresse d'envoi correspond à la configuration
 * Lève une erreur si l'adresse ne correspond pas
 */
export function validateSenderAddress(fromAddress: string): boolean {
  const expectedEmail = EMAIL_CONFIG.SENDER_EMAIL.toLowerCase();
  const containsCorrectEmail = fromAddress.toLowerCase().includes(expectedEmail);
  
  if (!containsCorrectEmail) {
    console.error(`[EMAIL_CONFIG] ERREUR: Tentative d'envoi avec une adresse non autorisée: ${fromAddress}`);
    console.error(`[EMAIL_CONFIG] L'adresse autorisée est: ${EMAIL_CONFIG.SENDER_EMAIL}`);
    return false;
  }
  
  return true;
}

/**
 * Headers communs pour les emails
 */
export const EMAIL_HEADERS = {
  "X-Mailer": "Ecole T3P CRM",
  "X-Priority": "3",
} as const;
