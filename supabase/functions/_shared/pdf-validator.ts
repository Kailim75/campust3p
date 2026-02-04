/**
 * PDF Validator - Validation stricte des PDF avant envoi email
 * 
 * Ce module garantit qu'aucun email ne peut être envoyé avec une pièce jointe 
 * PDF vide ou invalide.
 */

// Taille minimale d'un PDF valide (en bytes base64)
// Un PDF vide minimal fait environ 500-700 bytes, on met 1000 pour être sûr
export const MIN_PDF_SIZE_BYTES = 1000;

// Taille minimale du contenu base64 (environ 1.37x le binaire)
export const MIN_BASE64_LENGTH = 1400;

export interface PDFValidationResult {
  valid: boolean;
  sizeBytes: number;
  errors: string[];
}

export interface ValidatedAttachment {
  filename: string;
  content: string; // base64
  sizeBytes: number;
}

/**
 * Valide qu'un contenu base64 représente un PDF non vide
 */
export function validatePdfBase64(base64Content: string): PDFValidationResult {
  const errors: string[] = [];
  
  // Vérification 1: Le contenu existe
  if (!base64Content || typeof base64Content !== 'string') {
    return {
      valid: false,
      sizeBytes: 0,
      errors: ['Le contenu PDF est vide ou invalide']
    };
  }
  
  // Vérification 2: Longueur minimale du base64
  const base64Length = base64Content.length;
  if (base64Length < MIN_BASE64_LENGTH) {
    errors.push(`PDF trop petit: ${base64Length} caractères base64 (minimum: ${MIN_BASE64_LENGTH})`);
  }
  
  // Vérification 3: Calcul de la taille réelle en bytes
  // base64 encode 3 bytes en 4 caractères, donc: bytes = length * 3/4
  const estimatedBytes = Math.floor((base64Length * 3) / 4);
  
  if (estimatedBytes < MIN_PDF_SIZE_BYTES) {
    errors.push(`PDF trop léger: ${estimatedBytes} bytes (minimum: ${MIN_PDF_SIZE_BYTES})`);
  }
  
  // Vérification 4: Signature PDF valide (commence par JVBERi0 = %PDF-)
  if (!base64Content.startsWith('JVBERi0')) {
    errors.push('Signature PDF invalide: le fichier ne commence pas par %PDF-');
  }
  
  // Vérification 5: Contient des données réelles (pas juste header/footer)
  // Un PDF avec contenu a généralement plus de 3000 bytes
  if (estimatedBytes < 3000) {
    errors.push(`Attention: PDF potentiellement vide de contenu (${estimatedBytes} bytes)`);
  }
  
  return {
    valid: errors.length === 0,
    sizeBytes: estimatedBytes,
    errors
  };
}

/**
 * Valide une pièce jointe PDF et retourne un objet validé ou null
 */
export function validateAttachment(
  filename: string, 
  base64Content: string
): { attachment: ValidatedAttachment | null; errors: string[] } {
  const validation = validatePdfBase64(base64Content);
  
  if (!validation.valid) {
    console.error(`[PDF-VALIDATOR] Pièce jointe invalide "${filename}":`, validation.errors);
    return { 
      attachment: null, 
      errors: validation.errors.map(e => `${filename}: ${e}`)
    };
  }
  
  console.log(`[PDF-VALIDATOR] ✓ Pièce jointe valide "${filename}": ${validation.sizeBytes} bytes`);
  
  return {
    attachment: {
      filename,
      content: base64Content,
      sizeBytes: validation.sizeBytes
    },
    errors: []
  };
}

/**
 * Vérifie si on peut envoyer l'email avec les pièces jointes validées
 * Retourne true si l'envoi est autorisé, false sinon
 */
export function canSendEmailWithAttachments(
  attachments: ValidatedAttachment[],
  requiredAttachmentCount: number = 0
): { allowed: boolean; reason: string } {
  // Si aucune pièce jointe requise, on autorise
  if (requiredAttachmentCount === 0) {
    return { allowed: true, reason: 'Aucune pièce jointe requise' };
  }
  
  // Vérifier qu'on a le bon nombre de pièces jointes
  if (attachments.length < requiredAttachmentCount) {
    return { 
      allowed: false, 
      reason: `Pièces jointes manquantes: ${attachments.length}/${requiredAttachmentCount}`
    };
  }
  
  // Vérifier que toutes les pièces jointes ont une taille valide
  const invalidAttachments = attachments.filter(a => a.sizeBytes < MIN_PDF_SIZE_BYTES);
  if (invalidAttachments.length > 0) {
    return {
      allowed: false,
      reason: `Pièces jointes invalides: ${invalidAttachments.map(a => a.filename).join(', ')}`
    };
  }
  
  return { 
    allowed: true, 
    reason: `${attachments.length} pièce(s) jointe(s) validée(s)`
  };
}

/**
 * Log de diagnostic complet pour le débogage
 */
export function logPdfDiagnostic(
  context: string,
  filename: string,
  base64Content: string | undefined
): void {
  console.log(`\n[PDF-DIAGNOSTIC] === ${context} ===`);
  console.log(`  Fichier: ${filename}`);
  
  if (!base64Content) {
    console.log(`  ❌ Contenu: UNDEFINED/NULL`);
    return;
  }
  
  const validation = validatePdfBase64(base64Content);
  
  console.log(`  Longueur base64: ${base64Content.length} caractères`);
  console.log(`  Taille estimée: ${validation.sizeBytes} bytes`);
  console.log(`  Signature PDF: ${base64Content.substring(0, 20)}...`);
  console.log(`  Valide: ${validation.valid ? '✓ OUI' : '❌ NON'}`);
  
  if (validation.errors.length > 0) {
    console.log(`  Erreurs:`);
    validation.errors.forEach(e => console.log(`    - ${e}`));
  }
  console.log('');
}
