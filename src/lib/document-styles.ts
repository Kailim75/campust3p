// ============================================================
// CHARTE GRAPHIQUE CENTRALISÉE - ECOLE T3P / T3P CAMPUS
// Configuration unique pour TOUS les documents PDF du CRM
// ============================================================

import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ==================== PALETTE DE COULEURS OFFICIELLE ====================
export const DOCUMENT_COLORS = {
  // Forest Green - Couleur principale (titres, en-têtes, éléments de confiance)
  forestGreen: { r: 27, g: 77, b: 62, hex: "#1B4D3E" },
  forestGreenLight: { r: 42, g: 107, b: 84, hex: "#2A6B54" },
  forestGreenDark: { r: 20, g: 61, b: 49, hex: "#143D31" },
  
  // Cream - Fond et backgrounds
  cream: { r: 245, g: 235, b: 215, hex: "#F5EBD7" },
  creamLight: { r: 251, g: 247, b: 239, hex: "#FBF7EF" },
  creamDark: { r: 232, g: 220, b: 196, hex: "#E8DCC4" },
  
  // Gold - Accents et boutons d'action
  gold: { r: 212, g: 168, b: 83, hex: "#D4A853" },
  goldLight: { r: 228, g: 190, b: 115, hex: "#E4BE73" },
  goldDark: { r: 196, g: 152, b: 67, hex: "#C49843" },
  
  // Warm Gray - Textes
  warmGray500: { r: 137, g: 129, b: 114, hex: "#898172" },
  warmGray600: { r: 107, g: 107, b: 107, hex: "#6B6B6B" },
  warmGray700: { r: 75, g: 70, b: 60, hex: "#4B463C" },
  warmGray800: { r: 44, g: 41, b: 34, hex: "#2C2922" },
  
  // Couleurs fonctionnelles
  success: { r: 34, g: 197, b: 94, hex: "#22C55E" },
  warning: { r: 245, g: 158, b: 11, hex: "#F59E0B" },
  error: { r: 239, g: 68, b: 68, hex: "#EF4444" },
  white: { r: 255, g: 255, b: 255, hex: "#FFFFFF" },
} as const;

// ==================== TYPOGRAPHIE OFFICIELLE ====================
export const DOCUMENT_FONTS = {
  // Famille principale (jsPDF supporte helvetica, times, courier)
  primary: "helvetica",
  secondary: "times",
  
  // Tailles standard
  sizes: {
    title: 16,       // Titre du document
    subtitle: 12,    // Sous-titre / nom de section
    heading: 11,     // En-tête de section
    subheading: 10,  // Sous-titre de section
    body: 10,        // Corps de texte principal
    small: 9,        // Texte secondaire
    tiny: 8,         // Notes, mentions légales
    micro: 7,        // Pied de page, références
    nano: 6.5,       // Agréments, informations compactées
  },
  
  // Poids
  weights: {
    normal: "normal" as const,
    bold: "bold" as const,
    italic: "italic" as const,
    bolditalic: "bolditalic" as const,
  },
} as const;

// ==================== MISE EN PAGE STANDARD ====================
export const DOCUMENT_LAYOUT = {
  // Format A4 en mm
  pageWidth: 210,
  pageHeight: 297,
  
  // Marges
  marginLeft: 20,
  marginRight: 20,
  marginTop: 20,
  marginBottom: 25,
  
  // Largeur du contenu
  get contentWidth() {
    return this.pageWidth - this.marginLeft - this.marginRight;
  },
  
  // Zones
  headerHeight: 42,
  footerHeight: 15,
  titleBandHeight: 12,
  
  // Espacement
  spacing: {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    xxl: 16,
  },
} as const;

// ==================== INFORMATIONS ORGANISME ====================
export interface OrganismeInfo {
  nom: string;
  nomCommercial?: string;
  raisonSociale?: string;
  adresse: string;
  codePostal?: string;
  ville?: string;
  telephone: string;
  email: string;
  siret: string;
  nda: string;
  // Visuels
  logoUrl?: string;
  signatureCachetUrl?: string;
  // Certifications
  qualiopiNumero?: string;
  qualiopiDateObtention?: string;
  qualiopiDateExpiration?: string;
  agrementPrefecture?: string;
  agrementPrefectureDate?: string;
  codeRncp?: string;
  codeRs?: string;
  agrementsAutres?: Array<{ nom: string; numero: string }>;
  // Responsables
  responsableLegal?: { nom: string; fonction: string };
  responsablePedagogique?: { nom: string; fonction: string };
  referentHandicap?: { nom: string; telephone: string; email?: string };
}

// ==================== HELPERS DE STYLE ====================

// Cache pour les images chargées
const imageCache: Map<string, string> = new Map();

/**
 * Charge une image depuis une URL et la convertit en base64
 */
export async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  
  if (imageCache.has(url)) {
    return imageCache.get(url) || null;
  }
  
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      console.warn(`[DocStyles/Image] Fetch failed for ${url}: ${response.status}`);
      return await loadImageViaElementDS(url);
    }
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        imageCache.set(url, base64);
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn(`[DocStyles/Image] Fetch error, trying canvas fallback for ${url}`);
    return await loadImageViaElementDS(url);
  }
}

function loadImageViaElementDS(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          imageCache.set(url, base64);
          resolve(base64);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Précharge les images d'un organisme
 */
export async function preloadOrganismeImages(organisme: OrganismeInfo): Promise<void> {
  const promises: Promise<string | null>[] = [];
  
  if (organisme.logoUrl) {
    promises.push(loadImageAsBase64(organisme.logoUrl));
  }
  if (organisme.signatureCachetUrl) {
    promises.push(loadImageAsBase64(organisme.signatureCachetUrl));
  }
  
  await Promise.all(promises);
}

/**
 * Formate une date en français
 */
export function formatDateFr(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMMM yyyy", { locale: fr });
}

/**
 * Formate une date courte
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Construit les lignes d'accréditations pour le header
 */
export function buildAccreditationsLines(organisme: OrganismeInfo): string[] {
  const lines: string[] = [];
  const parts1: string[] = [];
  const parts2: string[] = [];
  
  // Première ligne : SIRET + NDA + Qualiopi
  parts1.push(`SIRET: ${organisme.siret}`);
  parts1.push(`NDA: ${organisme.nda}`);
  if (organisme.qualiopiNumero) {
    parts1.push(`Qualiopi: ${organisme.qualiopiNumero}`);
  }
  lines.push(parts1.join(" | "));
  
  // Deuxième ligne : RNCP, RS, Préfecture, autres
  if (organisme.codeRncp) {
    parts2.push(`RNCP: ${organisme.codeRncp}`);
  }
  if (organisme.codeRs) {
    parts2.push(`RS: ${organisme.codeRs}`);
  }
  if (organisme.agrementPrefecture) {
    parts2.push(`Agrément Préf.: ${organisme.agrementPrefecture}`);
  }
  if (organisme.agrementsAutres?.length) {
    organisme.agrementsAutres.forEach(a => {
      if (a.nom && a.numero) {
        parts2.push(`${a.nom}: ${a.numero}`);
      }
    });
  }
  
  if (parts2.length > 0) {
    lines.push(parts2.join(" | "));
  }
  
  return lines;
}

// ==================== COMPOSANTS PDF RÉUTILISABLES ====================

/**
 * Ajoute l'en-tête standard au document
 * @returns Position Y après l'en-tête
 */
export function addDocumentHeader(
  doc: jsPDF, 
  organisme: OrganismeInfo,
  options?: { showAccreditations?: boolean }
): number {
  const { showAccreditations = true } = options || {};
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Calculer la hauteur du header
  const accreditationsLines = showAccreditations ? buildAccreditationsLines(organisme) : [];
  const minHeaderHeight = 38;
  const accreditStartY = 30;
  const lineStep = 6;
  const accreditBottomY = accreditationsLines.length > 0
    ? accreditStartY + accreditationsLines.length * lineStep
    : accreditStartY;
  const headerHeight = Math.max(minHeaderHeight, accreditBottomY + 4);
  
  // Bandeau header Forest Green
  doc.setFillColor(
    DOCUMENT_COLORS.forestGreen.r, 
    DOCUMENT_COLORS.forestGreen.g, 
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  
  // Logo (à droite du header)
  if (organisme.logoUrl && imageCache.has(organisme.logoUrl)) {
    try {
      doc.addImage(
        imageCache.get(organisme.logoUrl)!,
        "PNG",
        pageWidth - DOCUMENT_LAYOUT.marginRight - 28,
        4,
        28,
        14
      );
    } catch { /* ignore */ }
  }
  
  // Logo ou nom de l'entreprise
  doc.setFontSize(DOCUMENT_FONTS.sizes.title);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.white.r, 
    DOCUMENT_COLORS.white.g, 
    DOCUMENT_COLORS.white.b
  );
  doc.text(organisme.nomCommercial || organisme.nom, DOCUMENT_LAYOUT.marginLeft, 14);
  
  // Coordonnées
  doc.setFontSize(DOCUMENT_FONTS.sizes.micro);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.setTextColor(
    DOCUMENT_COLORS.creamLight.r, 
    DOCUMENT_COLORS.creamLight.g, 
    DOCUMENT_COLORS.creamLight.b
  );
  doc.text(
    `${organisme.adresse} | Tél: ${organisme.telephone} | ${organisme.email}`, 
    DOCUMENT_LAYOUT.marginLeft, 
    22
  );
  
  // Accréditations
  if (showAccreditations && accreditationsLines.length > 0) {
    doc.setFontSize(DOCUMENT_FONTS.sizes.nano);
    let yAccred = accreditStartY;
    accreditationsLines.forEach(line => {
      const wrapped = doc.splitTextToSize(line, pageWidth - 40) as string[];
      wrapped.forEach(l => {
        doc.text(l, DOCUMENT_LAYOUT.marginLeft, yAccred);
        yAccred += lineStep;
      });
    });
  }
  
  // Ligne accent Gold sous le header
  doc.setFillColor(
    DOCUMENT_COLORS.gold.r, 
    DOCUMENT_COLORS.gold.g, 
    DOCUMENT_COLORS.gold.b
  );
  doc.rect(0, headerHeight, pageWidth, 2, "F");
  
  // Reset text color
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray800.r, 
    DOCUMENT_COLORS.warmGray800.g, 
    DOCUMENT_COLORS.warmGray800.b
  );
  
  return headerHeight + DOCUMENT_LAYOUT.spacing.lg;
}

/**
 * Ajoute le pied de page standard
 */
export function addDocumentFooter(
  doc: jsPDF, 
  pageNum: number = 1, 
  totalPages?: number,
  organisme?: OrganismeInfo
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - DOCUMENT_LAYOUT.footerHeight;
  
  // Ligne séparatrice Gold
  doc.setFillColor(
    DOCUMENT_COLORS.gold.r, 
    DOCUMENT_COLORS.gold.g, 
    DOCUMENT_COLORS.gold.b
  );
  doc.rect(DOCUMENT_LAYOUT.marginLeft, footerY, pageWidth - 40, 1, "F");
  
  // Texte footer gauche - Mentions légales
  doc.setFontSize(DOCUMENT_FONTS.sizes.micro);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray500.r, 
    DOCUMENT_COLORS.warmGray500.g, 
    DOCUMENT_COLORS.warmGray500.b
  );
  
  if (organisme) {
    doc.text(
      `${organisme.nom} - ${organisme.raisonSociale || organisme.siret}`, 
      DOCUMENT_LAYOUT.marginLeft, 
      footerY + 6
    );
  }
  
  // Date de génération (centre)
  doc.text(
    `Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`, 
    pageWidth / 2, 
    footerY + 6, 
    { align: "center" }
  );
  
  // Numéro de page avec fond Forest Green
  doc.setFillColor(
    DOCUMENT_COLORS.forestGreen.r, 
    DOCUMENT_COLORS.forestGreen.g, 
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.roundedRect(pageWidth - 35, footerY - 2, 20, 12, 2, 2, "F");
  doc.setTextColor(
    DOCUMENT_COLORS.white.r, 
    DOCUMENT_COLORS.white.g, 
    DOCUMENT_COLORS.white.b
  );
  doc.setFontSize(DOCUMENT_FONTS.sizes.small);
  
  const pageText = totalPages ? `${pageNum}/${totalPages}` : `${pageNum}`;
  doc.text(pageText, pageWidth - 25, footerY + 6, { align: "center" });
  
  // Reset text color
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray800.r, 
    DOCUMENT_COLORS.warmGray800.g, 
    DOCUMENT_COLORS.warmGray800.b
  );
}

/**
 * Ajoute un titre de document stylisé avec badge doré
 */
export function addDocumentTitle(
  doc: jsPDF, 
  title: string, 
  startY: number,
  options?: { subtitle?: string; reference?: string }
): number {
  const { subtitle, reference } = options || {};
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = startY + DOCUMENT_LAYOUT.spacing.lg;
  
  // Badge titre avec fond Gold
  doc.setFontSize(DOCUMENT_FONTS.sizes.subtitle + 2);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  const titleWidth = doc.getTextWidth(title) + 30;
  
  doc.setFillColor(
    DOCUMENT_COLORS.gold.r, 
    DOCUMENT_COLORS.gold.g, 
    DOCUMENT_COLORS.gold.b
  );
  doc.roundedRect((pageWidth - titleWidth) / 2, yPos - 8, titleWidth, 14, 3, 3, "F");
  
  doc.setTextColor(
    DOCUMENT_COLORS.forestGreenDark.r, 
    DOCUMENT_COLORS.forestGreenDark.g, 
    DOCUMENT_COLORS.forestGreenDark.b
  );
  doc.text(title, pageWidth / 2, yPos, { align: "center" });
  
  yPos += DOCUMENT_LAYOUT.spacing.xl;
  
  if (subtitle) {
    doc.setFontSize(DOCUMENT_FONTS.sizes.tiny);
    doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
    doc.setTextColor(
      DOCUMENT_COLORS.warmGray500.r, 
      DOCUMENT_COLORS.warmGray500.g, 
      DOCUMENT_COLORS.warmGray500.b
    );
    doc.text(subtitle, pageWidth / 2, yPos, { align: "center" });
    yPos += DOCUMENT_LAYOUT.spacing.md;
  }
  
  if (reference) {
    doc.setFontSize(DOCUMENT_FONTS.sizes.small);
    doc.setTextColor(
      DOCUMENT_COLORS.forestGreenLight.r, 
      DOCUMENT_COLORS.forestGreenLight.g, 
      DOCUMENT_COLORS.forestGreenLight.b
    );
    doc.text(`Réf: ${reference}`, pageWidth / 2, yPos, { align: "center" });
    yPos += DOCUMENT_LAYOUT.spacing.md;
  }
  
  // Reset text color
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray800.r, 
    DOCUMENT_COLORS.warmGray800.g, 
    DOCUMENT_COLORS.warmGray800.b
  );
  
  return yPos + DOCUMENT_LAYOUT.spacing.md;
}

/**
 * Ajoute un titre de section avec barre latérale colorée
 */
export function addSectionTitle(doc: jsPDF, title: string, yPos: number): number {
  doc.setFillColor(
    DOCUMENT_COLORS.forestGreen.r, 
    DOCUMENT_COLORS.forestGreen.g, 
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.roundedRect(DOCUMENT_LAYOUT.marginLeft, yPos - 4, 3, 14, 1, 1, "F");
  
  doc.setFontSize(DOCUMENT_FONTS.sizes.heading);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.forestGreen.r, 
    DOCUMENT_COLORS.forestGreen.g, 
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.text(title, DOCUMENT_LAYOUT.marginLeft + 7, yPos + 4);
  
  // Reset
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray800.r, 
    DOCUMENT_COLORS.warmGray800.g, 
    DOCUMENT_COLORS.warmGray800.b
  );
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  
  return yPos + DOCUMENT_LAYOUT.spacing.xxl;
}

/**
 * Ajoute un bandeau de section avec fond vert
 */
export function addSectionBanner(doc: jsPDF, title: string, yPos: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(
    DOCUMENT_COLORS.forestGreen.r, 
    DOCUMENT_COLORS.forestGreen.g, 
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.roundedRect(DOCUMENT_LAYOUT.marginLeft, yPos, pageWidth - 40, 8, 1, 1, "F");
  
  doc.setFontSize(DOCUMENT_FONTS.sizes.subheading);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.white.r, 
    DOCUMENT_COLORS.white.g, 
    DOCUMENT_COLORS.white.b
  );
  doc.text(title, DOCUMENT_LAYOUT.marginLeft + 4, yPos + 5.5);
  
  // Reset
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray800.r, 
    DOCUMENT_COLORS.warmGray800.g, 
    DOCUMENT_COLORS.warmGray800.b
  );
  
  return yPos + DOCUMENT_LAYOUT.spacing.xxl;
}

/**
 * Ajoute une box d'information avec fond cream
 */
export function addInfoBox(
  doc: jsPDF, 
  yPos: number, 
  height: number,
  options?: { withGoldAccent?: boolean }
): number {
  const { withGoldAccent = true } = options || {};
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(
    DOCUMENT_COLORS.creamLight.r, 
    DOCUMENT_COLORS.creamLight.g, 
    DOCUMENT_COLORS.creamLight.b
  );
  doc.roundedRect(DOCUMENT_LAYOUT.marginLeft, yPos, pageWidth - 40, height, 4, 4, "F");
  
  // Bordure gauche accent doré
  if (withGoldAccent) {
    doc.setFillColor(
      DOCUMENT_COLORS.gold.r, 
      DOCUMENT_COLORS.gold.g, 
      DOCUMENT_COLORS.gold.b
    );
    doc.roundedRect(DOCUMENT_LAYOUT.marginLeft, yPos, 4, height, 2, 2, "F");
  }
  
  return yPos;
}

/**
 * Ajoute un bloc signature/cachet
 */
export function addSignatureBlock(
  doc: jsPDF,
  yPos: number,
  organisme: OrganismeInfo,
  beneficiaire?: { civilite?: string; prenom: string; nom: string }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 40) / 2 - 5;
  
  // Titre section
  doc.setFontSize(DOCUMENT_FONTS.sizes.subheading);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.forestGreen.r, 
    DOCUMENT_COLORS.forestGreen.g, 
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.text("SIGNATURES", DOCUMENT_LAYOUT.marginLeft, yPos);
  yPos += DOCUMENT_LAYOUT.spacing.lg;
  
  // Box gauche - Organisme
  doc.setFillColor(
    DOCUMENT_COLORS.creamLight.r, 
    DOCUMENT_COLORS.creamLight.g, 
    DOCUMENT_COLORS.creamLight.b
  );
  doc.setDrawColor(
    DOCUMENT_COLORS.forestGreen.r, 
    DOCUMENT_COLORS.forestGreen.g, 
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.roundedRect(DOCUMENT_LAYOUT.marginLeft, yPos, halfWidth, 40, 2, 2, "FD");
  
  doc.setFontSize(DOCUMENT_FONTS.sizes.tiny);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.forestGreen.r, 
    DOCUMENT_COLORS.forestGreen.g, 
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.text("Pour l'organisme de formation", DOCUMENT_LAYOUT.marginLeft + 4, yPos + 6);
  
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray700.r, 
    DOCUMENT_COLORS.warmGray700.g, 
    DOCUMENT_COLORS.warmGray700.b
  );
  
  if (organisme.responsableLegal) {
    doc.text(organisme.responsableLegal.nom, DOCUMENT_LAYOUT.marginLeft + 4, yPos + 12);
    doc.text(organisme.responsableLegal.fonction, DOCUMENT_LAYOUT.marginLeft + 4, yPos + 17);
  }
  
  doc.text(
    `Fait à ${organisme.ville || ""}, le ${formatDateShort(new Date())}`, 
    DOCUMENT_LAYOUT.marginLeft + 4, 
    yPos + 24
  );
  
  // Ajouter le cachet si disponible - placé sous le texte pour éviter la superposition
  if (organisme.signatureCachetUrl && imageCache.has(organisme.signatureCachetUrl)) {
    try {
      doc.addImage(
        imageCache.get(organisme.signatureCachetUrl)!,
        "PNG",
        DOCUMENT_LAYOUT.marginLeft + 4,
        yPos + 15,
        35,
        20
      );
    } catch {
      // Ignorer si l'image ne peut pas être ajoutée
    }
  }
  
  // Box droite - Bénéficiaire
  const rightX = DOCUMENT_LAYOUT.marginLeft + halfWidth + 10;
  doc.setFillColor(
    DOCUMENT_COLORS.creamLight.r, 
    DOCUMENT_COLORS.creamLight.g, 
    DOCUMENT_COLORS.creamLight.b
  );
  doc.roundedRect(rightX, yPos, halfWidth, 40, 2, 2, "FD");
  
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.forestGreen.r, 
    DOCUMENT_COLORS.forestGreen.g, 
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.text("Pour le stagiaire", rightX + 4, yPos + 6);
  
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray700.r, 
    DOCUMENT_COLORS.warmGray700.g, 
    DOCUMENT_COLORS.warmGray700.b
  );
  
  if (beneficiaire) {
    const fullName = `${beneficiaire.civilite || ""} ${beneficiaire.prenom} ${beneficiaire.nom}`.trim();
    doc.text(fullName, rightX + 4, yPos + 12);
  }
  
  doc.text("(Signature précédée de la mention", rightX + 4, yPos + 24);
  doc.text("\"Lu et approuvé\")", rightX + 4, yPos + 29);
  
  // Reset
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray800.r, 
    DOCUMENT_COLORS.warmGray800.g, 
    DOCUMENT_COLORS.warmGray800.b
  );
  
  return yPos + 50;
}

/**
 * Vérifie si un saut de page est nécessaire
 */
export function checkPageBreak(
  doc: jsPDF, 
  yPos: number, 
  requiredSpace: number
): number {
  const maxY = DOCUMENT_LAYOUT.pageHeight - DOCUMENT_LAYOUT.marginBottom - DOCUMENT_LAYOUT.footerHeight;
  
  if (yPos + requiredSpace > maxY) {
    doc.addPage();
    return DOCUMENT_LAYOUT.marginTop + 10;
  }
  
  return yPos;
}

/**
 * Ajoute un paragraphe de texte avec retour à la ligne automatique
 */
export function addParagraph(
  doc: jsPDF, 
  text: string, 
  yPos: number, 
  options?: { indent?: number; fontSize?: number }
): number {
  const { indent = 0, fontSize = DOCUMENT_FONTS.sizes.small } = options || {};
  
  yPos = checkPageBreak(doc, yPos, 10);
  
  doc.setFontSize(fontSize);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray700.r, 
    DOCUMENT_COLORS.warmGray700.g, 
    DOCUMENT_COLORS.warmGray700.b
  );
  
  const contentWidth = DOCUMENT_LAYOUT.pageWidth - DOCUMENT_LAYOUT.marginLeft - DOCUMENT_LAYOUT.marginRight;
  const lines = doc.splitTextToSize(text, contentWidth - indent);
  
  lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 5);
    doc.text(line, DOCUMENT_LAYOUT.marginLeft + indent, yPos);
    yPos += 4.5;
  });
  
  return yPos + 2;
}

/**
 * Ajoute les mentions légales obligatoires en pied de document
 */
export function addLegalMentions(
  doc: jsPDF,
  yPos: number,
  organisme: OrganismeInfo
): number {
  yPos = checkPageBreak(doc, yPos, 40);
  
  // Ligne de séparation
  doc.setFillColor(
    DOCUMENT_COLORS.gold.r, 
    DOCUMENT_COLORS.gold.g, 
    DOCUMENT_COLORS.gold.b
  );
  doc.rect(DOCUMENT_LAYOUT.marginLeft, yPos, DOCUMENT_LAYOUT.contentWidth, 0.5, "F");
  yPos += DOCUMENT_LAYOUT.spacing.lg;
  
  doc.setFontSize(DOCUMENT_FONTS.sizes.micro);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray500.r, 
    DOCUMENT_COLORS.warmGray500.g, 
    DOCUMENT_COLORS.warmGray500.b
  );
  
  // Mentions
  const mentions = [
    `${organisme.nom} - ${organisme.raisonSociale || ""}`,
    `${organisme.adresse}`,
    `SIRET: ${organisme.siret} | N° de déclaration d'activité: ${organisme.nda}`,
  ];
  
  if (organisme.qualiopiNumero) {
    mentions.push(`Certification Qualiopi: ${organisme.qualiopiNumero}`);
  }
  
  mentions.forEach(line => {
    doc.text(line, DOCUMENT_LAYOUT.marginLeft, yPos);
    yPos += 4;
  });
  
  return yPos;
}
