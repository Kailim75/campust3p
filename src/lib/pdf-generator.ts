import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ORGANISME,
  PROGRAMME_VTC, 
  PROGRAMME_TAXI, 
  PROGRAMME_TAXI_75,
  PROGRAMME_VMDTR,
  getPrerequis, 
  getObjectifs,
  getProgramme,
  type TypeFormation,
  type ModuleFormation
} from "@/constants/formations";

// ==================== IMPORT CHARTE GRAPHIQUE CENTRALISÉE ====================
// Utilise la configuration centralisée pour tous les documents PDF
import { 
  DOCUMENT_COLORS as COLORS_CENTRAL,
  DOCUMENT_FONTS,
  DOCUMENT_LAYOUT 
} from "./document-styles";

// Re-export pour compatibilité avec le code existant
const COLORS = {
  // Forest Green - Couleur principale
  forestGreen: COLORS_CENTRAL.forestGreen,
  forestGreenLight: COLORS_CENTRAL.forestGreenLight,
  forestGreenDark: COLORS_CENTRAL.forestGreenDark,
  // Cream - Fond
  cream: COLORS_CENTRAL.cream,
  creamLight: COLORS_CENTRAL.creamLight,
  creamDark: COLORS_CENTRAL.creamDark,
  // Gold - Accent
  gold: COLORS_CENTRAL.gold,
  goldLight: COLORS_CENTRAL.goldLight,
  goldDark: COLORS_CENTRAL.goldDark,
  // Warm Gray
  warmGray500: COLORS_CENTRAL.warmGray500,
  warmGray600: COLORS_CENTRAL.warmGray600,
  warmGray700: COLORS_CENTRAL.warmGray700,
  warmGray800: COLORS_CENTRAL.warmGray800,
  // Fonctionnelles
  success: COLORS_CENTRAL.success,
  warning: COLORS_CENTRAL.warning,
  error: COLORS_CENTRAL.error,
  white: COLORS_CENTRAL.white,
};

export interface AgrementsAutre {
  nom: string;
  numero: string;
  date_obtention?: string;
  date_expiration?: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  nda: string; // Numéro déclaration activité
  // Visuels
  logo_url?: string;
  signature_cachet_url?: string;
  // Agréments et certifications
  qualiopi_numero?: string;
  qualiopi_date_obtention?: string;
  qualiopi_date_expiration?: string;
  agrement_prefecture?: string;
  agrement_prefecture_date?: string;
  code_rncp?: string;
  code_rs?: string;
  agrements_autres?: AgrementsAutre[];
}

// Configuration par défaut de l'organisme de formation
// ⚠️ IMPORTANT : Ces valeurs sont des placeholders.
// Utiliser useCentreFormation() pour obtenir les données réelles du centre.
export const DEFAULT_COMPANY: CompanyInfo = {
  name: "[Centre non configuré]",
  address: "[Adresse non configurée]",
  phone: "[Téléphone non configuré]",
  email: "[Email non configuré]",
  siret: "[SIRET non configuré]",
  nda: "[NDA non configuré]",
};

export interface ContactInfo {
  civilite?: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  rue?: string;
  code_postal?: string;
  ville?: string;
  date_naissance?: string;
  ville_naissance?: string;
}

/** ContactInfo with an optional `id` field, used when generating documents that need contact lookup. */
export interface ContactInfoWithId extends ContactInfo {
  id?: string;
}

export interface SessionInfo {
  nom: string;
  formation_type: string;
  date_debut: string;
  date_fin: string;
  lieu?: string;
  duree_heures?: number;
  prix?: number;
  prix_ht?: number;
  formateur?: string;
  // Nouvelles informations enrichies
  numero_session?: string;
  heure_debut?: string;
  heure_fin?: string;
  heure_debut_matin?: string;
  heure_fin_matin?: string;
  heure_debut_aprem?: string;
  heure_fin_aprem?: string;
  adresse_rue?: string;
  adresse_code_postal?: string;
  adresse_ville?: string;
  objectifs?: string;
  prerequis?: string;
}

/** SessionInfo with an optional `id` field, used when generating documents that need session lookup. */
export interface SessionInfoWithId extends SessionInfo {
  id?: string;
}

export interface FactureInfo {
  numero_facture: string;
  montant_total: number;
  total_paye: number;
  statut: string;
  type_financement: string;
  date_emission?: string;
  date_echeance?: string;
  commentaires?: string;
}

// Helper function to build accreditations line
function buildAccreditationsLine(company: CompanyInfo): string[] {
  const lines: string[] = [];
  const parts1: string[] = [];
  const parts2: string[] = [];
  
  // Première ligne : SIRET + NDA + Qualiopi
  parts1.push(`SIRET: ${company.siret}`);
  parts1.push(`NDA: ${company.nda}`);
  if (company.qualiopi_numero) {
    parts1.push(`Qualiopi: ${company.qualiopi_numero}`);
  }
  lines.push(parts1.join(" | "));
  
  // Deuxième ligne : RNCP, RS, Préfecture, autres agréments
  if (company.code_rncp) {
    parts2.push(`RNCP: ${company.code_rncp}`);
  }
  if (company.code_rs) {
    parts2.push(`RS: ${company.code_rs}`);
  }
  if (company.agrement_prefecture) {
    parts2.push(`Agrément Préf.: ${company.agrement_prefecture}`);
  }
  if (company.agrements_autres && company.agrements_autres.length > 0) {
    company.agrements_autres.forEach(a => {
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

// Helper functions avec nouvelle charte graphique
function addHeader(doc: jsPDF, company: CompanyInfo): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Build + wrap accreditations lines to avoid overflow (which looked like "missing" text)
  const accreditationsLines = buildAccreditationsLine(company);
  const maxAccredWidth = pageWidth - 40;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);

  const wrappedAccreditations: string[] = [];
  accreditationsLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, maxAccredWidth) as string[];
    wrapped.forEach((l) => wrappedAccreditations.push(l));
  });

  // Compute header height BEFORE drawing the background
  const minHeaderHeight = 38;
  const accreditStartY = 30;
  const lineStep = 6;
  const accreditBottomY =
    wrappedAccreditations.length > 0
      ? accreditStartY + wrappedAccreditations.length * lineStep
      : accreditStartY;
  const headerHeight = Math.max(minHeaderHeight, accreditBottomY + 4);

  // Bandeau header Forest Green
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Logo (à droite du header) - ajouté si disponible
  const logoX = pageWidth - 20 - 28; // 28mm de large max
  const logoAdded = addLogoImage(doc, company, logoX, 4, 28, 14);

  // Nom de l'entreprise en blanc
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text(company.name, 20, 14);

  // Coordonnées en cream clair
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.text(`${company.address} | Tél: ${company.phone} | ${company.email}`, 20, 22);

  // Agréments et certifications (wrappés)
  let yAccred = accreditStartY;
  doc.setFontSize(6.5);
  wrappedAccreditations.forEach((l) => {
    doc.text(l, 20, yAccred);
    yAccred += lineStep;
  });

  // Ligne accent Gold sous le header
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.rect(0, headerHeight, pageWidth, 2, "F");

  // Reset text color
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);

  // Retourne la position Y après le header (avec marge)
  return headerHeight + 8;
}

function addFooter(doc: jsPDF, pageNum: number = 1) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Ligne séparatrice Gold
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.rect(20, pageHeight - 25, pageWidth - 40, 1, "F");
  
  // Texte footer
  doc.setFontSize(7);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text(`Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`, 20, pageHeight - 18);
  
  // Numéro de page avec fond Forest Green
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(pageWidth - 35, pageHeight - 22, 20, 12, 2, 2, "F");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.setFontSize(9);
  doc.text(`${pageNum}`, pageWidth - 25, pageHeight - 14, { align: "center" });
  
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
}

function addContactBlock(doc: jsPDF, contact: ContactInfo, x: number, y: number, title: string = "Participant"): number {
  if (title) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.text(title, x, y);
    y += 6;
  }
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  doc.text(fullName, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  
  if (contact.rue) {
    y += 5;
    doc.text(contact.rue, x, y);
  }
  
  if (contact.code_postal || contact.ville) {
    y += 5;
    doc.text(`${contact.code_postal || ""} ${contact.ville || ""}`.trim(), x, y);
  }
  
  if (contact.email) {
    y += 5;
    doc.text(contact.email, x, y);
  }
  
  if (contact.telephone) {
    y += 5;
    doc.text(contact.telephone, x, y);
  }
  
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  return y + 10;
}

// Fonction pour dessiner un titre de document avec style
function addDocumentTitle(doc: jsPDF, title: string, startY: number, subtitle?: string, reference?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = startY + 8;
  
  // Badge titre avec fond Gold
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const titleWidth = doc.getTextWidth(title) + 30;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - titleWidth) / 2, yPos - 8, titleWidth, 16, 3, 3, "F");
  
  doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
  doc.text(title, pageWidth / 2, yPos + 1, { align: "center" });
  
  yPos += 10;
  
  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
    doc.text(subtitle, pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
  }
  
  if (reference) {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.forestGreenLight.r, COLORS.forestGreenLight.g, COLORS.forestGreenLight.b);
    doc.text(`Réf: ${reference}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
  }
  
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  return yPos + 5;
}

// Section avec titre coloré
function addSectionTitle(doc: jsPDF, title: string, yPos: number): number {
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(20, yPos - 2, 3, 16, 1, 1, "F");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(title, 27, yPos + 6);
  
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  doc.setFont("helvetica", "normal");
  return yPos + 18;
}

// Box d'information avec fond cream
function addInfoBox(doc: jsPDF, yPos: number, height: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(20, yPos, pageWidth - 40, height, 4, 4, "F");
  
  // Bordure gauche accent
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(20, yPos, 4, height, 2, 2, "F");
  
  return yPos;
}

// Cache for loaded images (base64)
const imageCache: Map<string, string> = new Map();

// Helper function to load image and convert to base64
async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  
  // Check cache first
  if (imageCache.has(url)) {
    return imageCache.get(url) || null;
  }
  
  try {
    // Try fetch first
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      console.warn(`[Logo/Image] Fetch failed for ${url}: ${response.status}`);
      // Fallback: try loading via Image element (handles CORS differently)
      return await loadImageViaElement(url);
    }
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        imageCache.set(url, base64);
        console.log(`[Logo/Image] Loaded successfully: ${url.substring(0, 60)}...`);
        resolve(base64);
      };
      reader.onerror = () => {
        console.warn(`[Logo/Image] FileReader error for ${url}`);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn(`[Logo/Image] Fetch error for ${url}:`, err);
    // Fallback: try loading via Image element
    return await loadImageViaElement(url);
  }
}

// Fallback: load image via HTML Image element + canvas (handles CORS for public URLs)
function loadImageViaElement(url: string): Promise<string | null> {
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
          console.log(`[Logo/Image] Loaded via canvas fallback: ${url.substring(0, 60)}...`);
          resolve(base64);
        } else {
          resolve(null);
        }
      } catch {
        console.warn(`[Logo/Image] Canvas fallback failed for ${url}`);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn(`[Logo/Image] Image element load failed for ${url}`);
      resolve(null);
    };
    img.src = url;
  });
}

// Synchronous helper to add stamp image if already cached
// The stamp is placed with a slight offset to avoid overlapping nearby text
function addStampImage(doc: jsPDF, company: CompanyInfo, x: number, y: number, maxWidth: number = 35, maxHeight: number = 22): boolean {
  if (!company.signature_cachet_url) return false;
  
  const cachedImage = imageCache.get(company.signature_cachet_url);
  if (!cachedImage) return false;
  
  try {
    // Add with reduced opacity effect via slight background
    doc.addImage(cachedImage, 'PNG', x, y, maxWidth, maxHeight);
    return true;
  } catch {
    console.error('Error adding stamp image to PDF');
    return false;
  }
}

// Synchronous helper to add logo image in header if already cached
function addLogoImage(doc: jsPDF, company: CompanyInfo, x: number, y: number, maxWidth: number = 28, maxHeight: number = 14): boolean {
  if (!company.logo_url) return false;
  
  const cachedImage = imageCache.get(company.logo_url);
  if (!cachedImage) return false;
  
  try {
    doc.addImage(cachedImage, 'PNG', x, y, maxWidth, maxHeight);
    return true;
  } catch {
    console.error('Error adding logo image to PDF');
    return false;
  }
}

// Preload stamp image for a company (call this before generating PDF)
export async function preloadCompanyImages(company: CompanyInfo): Promise<void> {
  const promises: Promise<string | null>[] = [];
  
  if (company.signature_cachet_url) {
    promises.push(loadImageAsBase64(company.signature_cachet_url));
  }
  if (company.logo_url) {
    promises.push(loadImageAsBase64(company.logo_url));
  }
  
  await Promise.all(promises);
}

// ==================== FACTURE PDF ====================
export function generateFacturePDF(
  facture: FactureInfo,
  contact: ContactInfo,
  session?: SessionInfo,
  company: CompanyInfo = DEFAULT_COMPANY
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const headerEndY = addHeader(doc, company);
  
  // Title avec style
  let yPos = addDocumentTitle(doc, "FACTURE", headerEndY, undefined, facture.numero_facture);
  
  // Contact info avec box
  yPos += 5;
  addInfoBox(doc, yPos, 35);
  yPos = addContactBlock(doc, contact, 30, yPos + 8, "Facturer à");
  
  // Dates on the right
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  doc.text(`Date d'émission: ${facture.date_emission ? format(new Date(facture.date_emission), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}`, pageWidth - 25, 80, { align: "right" });
  if (facture.date_echeance) {
    doc.text(`Date d'échéance: ${format(new Date(facture.date_echeance), "dd/MM/yyyy")}`, pageWidth - 25, 86, { align: "right" });
  }
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  
  // Table
  yPos = Math.max(yPos + 15, 110);
  
  // Table header avec Forest Green
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(20, yPos, pageWidth - 40, 14, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text("Description", 25, yPos + 9);
  doc.text("Montant HT", pageWidth - 25, yPos + 9, { align: "right" });
  
  // Mapping des intitulés officiels pour les factures
  const INTITULE_FACTURE_MAP: Record<string, string> = {
    "VTC": "Habilitation pour l'accès à la profession de conducteur de voiture de transport avec chauffeur (VTC)",
    "vtc": "Habilitation pour l'accès à la profession de conducteur de voiture de transport avec chauffeur (VTC)",
    "Taxi": "Habilitation pour l'accès à la profession de conducteur de taxi",
    "TAXI": "Habilitation pour l'accès à la profession de conducteur de taxi",
    "taxi": "Habilitation pour l'accès à la profession de conducteur de taxi",
    "VMDTR": "Habilitation pour l'accès à la profession de conducteur de véhicule motorisé à deux ou trois roues (VMDTR)",
    "vmdtr": "Habilitation pour l'accès à la profession de conducteur de véhicule motorisé à deux ou trois roues (VMDTR)",
  };

  let description = "Formation professionnelle";
  if (session) {
    const intituleOfficiel = INTITULE_FACTURE_MAP[session.formation_type || ""];
    if (intituleOfficiel) {
      description = intituleOfficiel;
    } else {
      description = `Formation: ${session.nom}`;
    }
    
    // Ajouter dates de formation
    if (session.date_debut && session.date_fin) {
      const dateDebut = format(new Date(session.date_debut), "dd/MM/yyyy");
      const dateFin = format(new Date(session.date_fin), "dd/MM/yyyy");
      if (dateDebut === dateFin) {
        description += `\nDate: ${dateDebut}`;
      } else {
        description += `\nDu ${dateDebut} au ${dateFin}`;
      }
    }
    
    // Ajouter horaires de formation
    if (session.heure_debut_matin && session.heure_fin_matin && session.heure_debut_aprem && session.heure_fin_aprem) {
      description += `\nHoraires: ${session.heure_debut_matin} - ${session.heure_fin_matin} / ${session.heure_debut_aprem} - ${session.heure_fin_aprem}`;
    } else if (session.heure_debut && session.heure_fin) {
      description += `\nHoraires: ${session.heure_debut} - ${session.heure_fin}`;
    }
    
    // Ajouter durée si disponible
    if (session.duree_heures) {
      description += `\nDurée: ${session.duree_heures} heures`;
    }
  }

  // Wrap long text and calculate dynamic height
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const maxTextWidth = pageWidth - 40 - 50; // leave space for amount column
  const wrappedLines = doc.splitTextToSize(description, maxTextWidth);
  const lineHeight = 5;
  const contentHeight = Math.max(20, wrappedLines.length * lineHeight + 10);

  // Table content avec fond cream
  yPos += 14;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.rect(20, yPos, pageWidth - 40, contentHeight, "F");
  
  yPos += 8;
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  wrappedLines.forEach((line: string, i: number) => {
    doc.text(line, 25, yPos + (i * lineHeight));
  });
  
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.setFont("helvetica", "bold");
  doc.text(`${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, pageWidth - 25, yPos, { align: "right" });
  
  // Financement info
  yPos += wrappedLines.length * lineHeight + 12;
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Mode de financement: ${getFinancementLabel(facture.type_financement)}`, 25, yPos);
  
  // Totals box
  yPos += 15;
  doc.setFillColor(COLORS.cream.r, COLORS.cream.g, COLORS.cream.b);
  doc.roundedRect(pageWidth - 90, yPos, 70, 45, 3, 3, "F");
  
  yPos += 10;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text("Total HT:", pageWidth - 85, yPos);
  doc.text(`${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 8;
  doc.text("TVA (0%):", pageWidth - 85, yPos);
  doc.text("0,00 €", pageWidth - 25, yPos, { align: "right" });
  
  yPos += 10;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(pageWidth - 90, yPos - 5, 70, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
  doc.text("Total TTC:", pageWidth - 85, yPos + 3);
  doc.text(`${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, pageWidth - 25, yPos + 3, { align: "right" });
  
  // Payment status
  yPos += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const montantRestant = Number(facture.montant_total) - facture.total_paye;
  
  if (facture.total_paye > 0) {
    doc.setTextColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
    doc.text(`✓ Montant déjà payé: ${facture.total_paye.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, pageWidth - 85, yPos);
    yPos += 6;
  }
  
  if (montantRestant > 0) {
    doc.setTextColor(COLORS.error.r, COLORS.error.g, COLORS.error.b);
    doc.setFont("helvetica", "bold");
    doc.text(`Reste à payer: ${montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, pageWidth - 85, yPos);
  }
  
  // Comments
  if (facture.commentaires) {
    yPos += 25;
    yPos = addSectionTitle(doc, "Observations", yPos);
    doc.setFontSize(9);
    const splitComments = doc.splitTextToSize(facture.commentaires, pageWidth - 50);
    doc.text(splitComments, 27, yPos);
  }
  
  // Legal mentions
  yPos = 250;
  doc.setFontSize(7);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("TVA non applicable - Article 261.4.4°a du CGI", 20, yPos);
  doc.text("En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.", 20, yPos + 4);
  
  addFooter(doc);
  
  return doc;
}

// ==================== ATTESTATION PDF ====================
export function generateAttestationPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo = DEFAULT_COMPANY,
  numeroCertificat?: string
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const headerEndY = addHeader(doc, company);
  
  // Title avec style et numéro de certificat
  let yPos = addDocumentTitle(doc, "ATTESTATION DE FORMATION", headerEndY, numeroCertificat);
  
  // Corps
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  const text1 = `Je soussigné, représentant de ${company.name}, organisme de formation déclaré sous le numéro ${company.nda}, atteste que :`;
  const splitText1 = doc.splitTextToSize(text1, pageWidth - 40);
  doc.text(splitText1, 20, yPos);
  yPos += splitText1.length * 7 + 15;
  
  // Participant avec box gold
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  const nameWidth = doc.getTextWidth(fullName) + 40;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - nameWidth) / 2, yPos - 6, nameWidth, 14, 3, 3, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
  doc.text(fullName, pageWidth / 2, yPos + 3, { align: "center" });
  
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  if (contact.date_naissance) {
    doc.text(`Né(e) le ${format(new Date(contact.date_naissance), "dd MMMM yyyy", { locale: fr })}${contact.ville_naissance ? ` à ${contact.ville_naissance}` : ""}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
  }
  
  yPos += 8;
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text("a suivi avec succès la formation suivante :", pageWidth / 2, yPos, { align: "center" });
  
  // Formation details box avec style - hauteur dynamique
  yPos += 12;
  let attestBoxContentH = 15; // padding top
  attestBoxContentH += 14; // nom formation
  attestBoxContentH += 12; // dates
  if (session.duree_heures) attestBoxContentH += 10;
  if (session.lieu) attestBoxContentH += 10;
  attestBoxContentH += 8; // padding bottom
  const boxHeight = attestBoxContentH;
  
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(30, yPos, pageWidth - 60, boxHeight, 4, 4, "F");
  
  // Bordure accent Forest Green
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(30, yPos, 4, boxHeight, 2, 2, "F");
  
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  // Wrap session name if too long
  const sessionNameLines = doc.splitTextToSize(session.nom, pageWidth - 80);
  doc.text(sessionNameLines, pageWidth / 2, yPos, { align: "center" });
  
  yPos += sessionNameLines.length * 6 + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`Du ${format(new Date(session.date_debut), "dd MMMM yyyy", { locale: fr })} au ${format(new Date(session.date_fin), "dd MMMM yyyy", { locale: fr })}`, pageWidth / 2, yPos, { align: "center" });
  
  if (session.duree_heures) {
    yPos += 10;
    doc.text(`Durée : ${session.duree_heures} heures`, pageWidth / 2, yPos, { align: "center" });
  }
  
  if (session.lieu) {
    yPos += 10;
    doc.text(`Lieu : ${session.lieu}`, pageWidth / 2, yPos, { align: "center" });
  }
  
  // Date and signature
  yPos += 45;
  doc.setFontSize(11);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`Fait à Paris, le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, pageWidth - 30, yPos, { align: "right" });
  
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Le Directeur de l'organisme", pageWidth - 30, yPos, { align: "right" });
  
  // Add stamp image below text with proper spacing to avoid overlap
  yPos += 8;
  const stampAdded = addStampImage(doc, company, pageWidth - 65, yPos, 35, 22);
  
  yPos += stampAdded ? 26 : 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  if (!stampAdded) {
    doc.text("Signature et cachet", pageWidth - 30, yPos, { align: "right" });
  }
  
  addFooter(doc);
  
  return doc;
}

// Helper function to format full address
function formatFullAddress(session: SessionInfo): string {
  const parts = [];
  if (session.adresse_rue) parts.push(session.adresse_rue);
  if (session.adresse_code_postal || session.adresse_ville) {
    parts.push(`${session.adresse_code_postal || ""} ${session.adresse_ville || ""}`.trim());
  }
  if (parts.length === 0 && session.lieu) return session.lieu;
  return parts.join(", ");
}

// Helper function to format session hours
function formatSessionHours(session: SessionInfo): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}h${minutes}`;
  };

  // Helper to check if a time value is valid (not null, not empty, not "00:00:00")
  const isValidTime = (time?: string): time is string => {
    return !!time && time !== "00:00:00" && time !== "00:00";
  };

  // Use detailed morning/afternoon hours if available
  if (isValidTime(session.heure_debut_matin) && isValidTime(session.heure_fin_matin) && isValidTime(session.heure_debut_aprem) && isValidTime(session.heure_fin_aprem)) {
    return `${formatTime(session.heure_debut_matin)} - ${formatTime(session.heure_fin_matin)} / ${formatTime(session.heure_debut_aprem)} - ${formatTime(session.heure_fin_aprem)}`;
  }
  // Morning only
  if (isValidTime(session.heure_debut_matin) && isValidTime(session.heure_fin_matin)) {
    return `${formatTime(session.heure_debut_matin)} - ${formatTime(session.heure_fin_matin)}`;
  }
  // Afternoon only
  if (isValidTime(session.heure_debut_aprem) && isValidTime(session.heure_fin_aprem)) {
    return `${formatTime(session.heure_debut_aprem)} - ${formatTime(session.heure_fin_aprem)}`;
  }
  // Fallback to simple heure_debut/heure_fin
  if (isValidTime(session.heure_debut) && isValidTime(session.heure_fin)) {
    return `${formatTime(session.heure_debut)} - ${formatTime(session.heure_fin)}`;
  }
  return "";
}

// Helper function to get price
function getPrice(session: SessionInfo): number {
  return session.prix_ht || session.prix || 0;
}

// ==================== PROGRAMMES DETAILLES T3P ====================
// Programmes T3P avec modules et sanctions (basés sur les constantes importées)

// Programmes T3P avec modules et sanctions (compatibilité avec l'existant)
const PROGRAMMES_T3P: Record<string, {
  modules: { titre: string; duree: string; contenu: string[] }[];
  sanctionFormation: string;
}> = {
  VTC: {
    modules: PROGRAMME_VTC.map(m => ({
      titre: `Module ${m.numero} - ${m.titre}`,
      duree: `${m.dureeHeures}h`,
      contenu: m.contenu
    })),
    sanctionFormation: "Attestation de formation initiale VTC permettant de se présenter à l'examen T3P de la CMA"
  },
  TAXI: {
    modules: PROGRAMME_TAXI.map(m => ({
      titre: `Module ${m.numero} - ${m.titre}`,
      duree: `${m.dureeHeures}h`,
      contenu: m.contenu
    })),
    sanctionFormation: "Attestation de formation initiale TAXI permettant de se présenter à l'examen T3P de la CMA"
  },
  "TAXI-75": {
    modules: PROGRAMME_TAXI_75.map(m => ({
      titre: `Module ${m.numero} - ${m.titre}`,
      duree: `${m.dureeHeures}h`,
      contenu: m.contenu
    })),
    sanctionFormation: "Attestation de formation initiale TAXI Paris (75) permettant de se présenter à l'examen T3P de la CMA de Paris"
  },
  VMDTR: {
    modules: PROGRAMME_VMDTR.map(m => ({
      titre: `Module ${m.numero} - ${m.titre}`,
      duree: `${m.dureeHeures}h`,
      contenu: m.contenu
    })),
    sanctionFormation: "Attestation de formation initiale VMDTR permettant de se présenter à l'examen T3P de la CMA"
  }
};

// Get formation type from session name
function getFormationType(sessionName: string, formationType?: string): TypeFormation {
  // Utiliser d'abord le type de formation explicite si fourni
  if (formationType) {
    const type = formationType.toUpperCase().replace(/\s+/g, '-');
    if (type.includes("TAXI-75") || type.includes("TAXI 75") || type.includes("TAXI PARIS")) return "TAXI-75";
    if (type.includes("VMDTR")) return "VMDTR";
    if (type.includes("VTC")) return "VTC";
    if (type.includes("TAXI")) return "TAXI";
  }
  
  // Fallback sur le nom de session
  const name = sessionName.toUpperCase();
  if (name.includes("TAXI 75") || name.includes("TAXI-75") || name.includes("TAXI PARIS") || name.includes("PARIS")) return "TAXI-75";
  if (name.includes("VMDTR")) return "VMDTR";
  if (name.includes("VTC")) return "VTC";
  if (name.includes("TAXI")) return "TAXI";
  return "VTC"; // Default
}

// ==================== CONVENTION DE FORMATION PDF (Conforme DREETS/Qualiopi - 18 Articles) ====================
// Pour les formations financées par un tiers (entreprise, OPCO, etc.)
export function generateConventionPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo = DEFAULT_COMPANY,
  options?: { includeAnnexes?: boolean }
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 30;
  let pageNumber = 1;
  
  const formationType = getFormationType(session.nom);
  
  // Helper to check if we need a new page
  const checkPageBreak = (neededSpace: number = 30): number => {
    if (yPos + neededSpace > pageHeight - bottomMargin) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber++;
      const newHeaderY = addHeader(doc, company);
      return newHeaderY + 5;
    }
    return yPos;
  };
  
  const headerEndY = addHeader(doc, company);
  
  // Title with style
  let yPos = addDocumentTitle(
    doc, 
    "CONVENTION DE FORMATION PROFESSIONNELLE", 
    headerEndY,
    "Articles L.6353-1 à L.6353-2 du Code du travail",
    session.numero_session
  );
  
  // ============ PARTIES ============
  yPos += 5;
  yPos = addSectionTitle(doc, "ENTRE LES SOUSSIGNÉS", yPos);
  
  // L'organisme de formation
  yPos += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("L'organisme de formation :", 20, yPos);
  
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(company.name, 25, yPos);
  yPos += 5;
  doc.text(`SIRET : ${company.siret}`, 25, yPos);
  yPos += 5;
  const orgAddressLines = doc.splitTextToSize(company.address, pageWidth - 50);
  doc.text(orgAddressLines, 25, yPos);
  yPos += orgAddressLines.length * 5 + 2;
  doc.text(`Déclaration d'activité N° ${company.nda}`, 25, yPos);
  yPos += 4;
  doc.setFontSize(8);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text(`(Cette déclaration ne vaut pas agrément de l'État)`, 25, yPos);
  
  // Agréments si présents
  if (company.qualiopi_numero || company.agrement_prefecture || company.code_rs) {
    yPos += 5;
    doc.setFontSize(8);
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    const agrementsLine: string[] = [];
    if (company.code_rs) agrementsLine.push(`RS: ${company.code_rs}`);
    if (company.agrement_prefecture) agrementsLine.push(`Agrément: ${company.agrement_prefecture}`);
    if (agrementsLine.length > 0) {
      doc.text(agrementsLine.join(" | "), 25, yPos);
      yPos += 4;
    }
  }
  
  yPos += 3;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  // Utilise les données du centre passées en paramètre
  doc.text(`Représenté par le responsable de l'organisme`, 25, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Ci-après dénommé "l'Organisme"`, 25, yPos);
  
  // Le Bénéficiaire
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Et :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.setFont("helvetica", "bold");
  doc.text(fullName, 25, yPos);
  doc.setFont("helvetica", "normal");
  if (contact.date_naissance) {
    yPos += 5;
    doc.text(`Né(e) le ${format(new Date(contact.date_naissance), "dd/MM/yyyy")}${contact.ville_naissance ? ` à ${contact.ville_naissance}` : ""}`, 25, yPos);
  }
  if (contact.rue) {
    yPos += 5;
    doc.text(contact.rue, 25, yPos);
  }
  if (contact.code_postal || contact.ville) {
    yPos += 5;
    doc.text(`${contact.code_postal || ""} ${contact.ville || ""}`.trim(), 25, yPos);
  }
  if (contact.telephone) {
    yPos += 5;
    doc.text(`Tél : ${contact.telephone}`, 25, yPos);
  }
  if (contact.email) {
    yPos += 5;
    doc.text(`Email : ${contact.email}`, 25, yPos);
  }
  yPos += 5;
  doc.text(`Ci-après dénommé "le Bénéficiaire"`, 25, yPos);
  
  // ============ ARTICLE 1 - Objet de la convention ============
  yPos += 12;
  yPos = checkPageBreak(35);
  yPos = addSectionTitle(doc, "Article 1 - Objet de la convention", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  const art1 = `La présente convention est établie conformément aux articles L.6353-1 et suivants du Code du travail. L'Organisme s'engage à organiser l'action de formation intitulée "${session.nom}". Cette formation entre dans le cadre des actions de formation au sens de l'article L.6313-1 du Code du travail.`;
  const splitArt1 = doc.splitTextToSize(art1, pageWidth - 40);
  doc.text(splitArt1, 20, yPos);
  
  // ============ ARTICLE 2 - Nature et caractéristiques ============
  yPos += splitArt1.length * 5 + 10;
  yPos = checkPageBreak(65);
  yPos = addSectionTitle(doc, "Article 2 - Nature et caractéristiques de l'action", yPos);
  
  // Calculer les lignes de contenu dynamiquement
  const art2Lines: { text: string; bold?: boolean }[] = [];
  art2Lines.push({ text: `• Intitulé : `, bold: true });
  art2Lines.push({ text: `• Type d'action : Action de formation professionnelle continue` });
  art2Lines.push({ text: `• Dates : Du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}` });
  if (session.duree_heures) {
    art2Lines.push({ text: `• Durée : ${session.duree_heures} heures` });
  }
  const sessionHours = formatSessionHours(session);
  if (sessionHours) {
    art2Lines.push({ text: `• Horaires : ${sessionHours}` });
  }
  const sessionAddress = formatFullAddress(session);
  if (sessionAddress) {
    art2Lines.push({ text: `• Lieu : ${sessionAddress}` });
  }
  art2Lines.push({ text: `• Modalités : Formation en présentiel | Effectif max : 12 stagiaires` });
  
  yPos += 2;
  const art2BoxHeight = 8 + art2Lines.length * 6 + 4;
  addInfoBox(doc, yPos, art2BoxHeight);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  for (const line of art2Lines) {
    if (line.bold) {
      doc.text(line.text, 30, yPos);
      doc.setFont("helvetica", "bold");
      doc.text(session.nom, 55, yPos);
      doc.setFont("helvetica", "normal");
    } else {
      doc.text(line.text, 30, yPos);
    }
    yPos += 6;
  }
  
  // ============ ARTICLE 3 - Objectifs pédagogiques ============
  yPos += 18;
  yPos = checkPageBreak(45);
  yPos = addSectionTitle(doc, "Article 3 - Objectifs pédagogiques", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text("À l'issue de la formation, le stagiaire sera capable de :", 20, yPos);
  yPos += 5;
  
  const objectifsT3P = getObjectifs(formationType);
  objectifsT3P.forEach((obj, i) => {
    yPos = checkPageBreak(8);
    const objLine = `${i + 1}. ${obj}`;
    const splitObj = doc.splitTextToSize(objLine, pageWidth - 45);
    doc.text(splitObj, 25, yPos);
    yPos += splitObj.length * 5;
  });
  
  yPos += 3;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`Cette formation prépare à l'examen ${formationType} organisé par la Chambre des Métiers et de l'Artisanat (CMA).`, 20, yPos);
  doc.setFont("helvetica", "normal");
  
  // ============ ARTICLE 4 - Programme ============
  yPos += 12;
  yPos = checkPageBreak(35);
  yPos = addSectionTitle(doc, "Article 4 - Programme de formation", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.text("Le programme détaillé de la formation figure en ANNEXE 1 de la présente convention.", 20, yPos);
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Programme conforme à l'arrêté du 6 avril 2017 modifié (modules 6 et 7 obligatoires - mise à jour 2024).", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  doc.setFontSize(10);
  doc.text(`Durée totale : ${session.duree_heures || 35} heures réparties en 7 modules :`, 20, yPos);
  yPos += 5;
  
  const programme = PROGRAMMES_T3P[formationType] || PROGRAMMES_T3P.VTC;
  programme.modules.forEach(module => {
    yPos = checkPageBreak(6);
    doc.text(`• ${module.titre} (${module.duree})`, 25, yPos);
    yPos += 5;
  });
  
  // ============ ARTICLE 5 - Prérequis ============
  yPos += 8;
  yPos = checkPageBreak(40);
  yPos = addSectionTitle(doc, "Article 5 - Prérequis réglementaires", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.text("Pour s'inscrire à cette formation, le candidat doit satisfaire aux conditions suivantes :", 20, yPos);
  yPos += 5;
  
  const prerequisT3P = getPrerequis(formationType);
  prerequisT3P.forEach((prereq, i) => {
    yPos = checkPageBreak(6);
    doc.text(`${i + 1}. ${prereq}`, 25, yPos);
    yPos += 5;
  });
  yPos += 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Le candidat atteste sur l'honneur remplir l'ensemble de ces conditions.", 20, yPos);
  doc.setFont("helvetica", "normal");
  
  // ============ ARTICLE 6 - Public visé et accessibilité ============
  yPos += 12;
  yPos = checkPageBreak(40);
  yPos = addSectionTitle(doc, "Article 6 - Public visé et accessibilité", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.text(`Public : Toute personne répondant aux prérequis et souhaitant exercer l'activité de conducteur ${formationType}.`, 20, yPos);
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Accessibilité handicap :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const accessibilite = `Notre référent handicap, ${ORGANISME.referentHandicap.nom}, est à votre disposition au ${ORGANISME.referentHandicap.telephone} ou ${ORGANISME.referentHandicap.email} pour étudier les adaptations nécessaires.`;
  const splitAccess = doc.splitTextToSize(accessibilite, pageWidth - 40);
  doc.text(splitAccess, 20, yPos);
  yPos += splitAccess.length * 5 + 2;
  doc.text("Nos locaux sont accessibles aux personnes à mobilité réduite (PMR).", 20, yPos);
  yPos += 5;
  doc.text("Délai d'accès : Inscription possible jusqu'à 3 jours ouvrés avant le début de la formation.", 20, yPos);
  
  // ============ ARTICLE 7 - Moyens pédagogiques ============
  yPos += 12;
  yPos = checkPageBreak(55);
  yPos = addSectionTitle(doc, "Article 7 - Moyens pédagogiques et techniques", yPos);
  yPos += 2;
  doc.setFontSize(10);
  
  doc.setFont("helvetica", "bold");
  doc.text("Ressources humaines :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text(`• Formateurs qualifiés et expérimentés dans le transport de personnes`, 25, yPos);
  yPos += 5;
  doc.text(`• Responsable pédagogique : voir informations du centre`, 25, yPos);
  
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Moyens matériels :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("• Salle de formation équipée et climatisée (vidéoprojecteur, tableau interactif)", 25, yPos);
  yPos += 5;
  doc.text("• Supports de cours remis à chaque stagiaire (format papier et/ou numérique)", 25, yPos);
  yPos += 5;
  doc.text("• Plateforme e-learning pour révisions (accès 24/7)", 25, yPos);
  
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Méthodes pédagogiques :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("• Apports théoriques et exercices pratiques, études de cas concrets", 25, yPos);
  yPos += 5;
  doc.text("• QCM d'entraînement à l'examen et simulations d'examen blanc", 25, yPos);
  
  // Page break for more articles
  addFooter(doc, pageNumber);
  doc.addPage();
  pageNumber++;
  const page2HeaderEndY = addHeader(doc, company);
  yPos = page2HeaderEndY + 5;
  
  // ============ ARTICLE 8 - Modalités d'évaluation ============
  yPos = addSectionTitle(doc, "Article 8 - Modalités d'évaluation et de validation", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  doc.setFont("helvetica", "bold");
  doc.text("Évaluation continue :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("• QCM de contrôle des connaissances en cours de formation", 25, yPos);
  yPos += 5;
  doc.text("• Exercices pratiques notés et participation", 25, yPos);
  
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Évaluation finale :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("• Examen blanc dans les conditions réelles de l'examen CMA", 25, yPos);
  yPos += 5;
  doc.text("• Correction détaillée et débriefing personnalisé", 25, yPos);
  
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Validation :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("• Attestation de fin de formation mentionnant les compétences acquises", 25, yPos);
  yPos += 5;
  doc.text("• Attestation d'assiduité (obligatoire pour présentation à l'examen)", 25, yPos);
  yPos += 5;
  doc.text("• Questionnaire de satisfaction à chaud et à froid (3 mois après)", 25, yPos);
  
  // ============ ARTICLE 9 - Dispositions financières ============
  yPos += 12;
  yPos = checkPageBreak(55);
  yPos = addSectionTitle(doc, "Article 9 - Dispositions financières", yPos);
  yPos += 2;
  
  const prix = getPrice(session);
  
  const financeBoxHeight = 32;
  addInfoBox(doc, yPos, financeBoxHeight);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.text("Le coût total de la formation s'élève à :", 30, yPos);
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text(`• Montant : ${prix.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 35, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("• TVA non applicable — art. 293 B du CGI", 35, yPos);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  yPos += financeBoxHeight - 18;
  doc.setFontSize(9);
  doc.text("Ce tarif comprend : formation, supports de cours, accès e-learning (3 mois), attestation.", 20, yPos);
  yPos += 5;
  doc.text("Ce tarif ne comprend pas : frais d'inscription CMA, déplacements et hébergement éventuels.", 20, yPos);
  
  // ============ ARTICLE 10 - Délai de rétractation ============
  yPos += 12;
  yPos = checkPageBreak(30);
  yPos = addSectionTitle(doc, "Article 10 - Délai de rétractation", yPos);
  yPos += 2;
  doc.setFontSize(10);
  const art10 = `Conformément à l'article L.6353-5 du Code du travail, le Bénéficiaire dispose d'un délai de DIX (10) JOURS à compter de la signature de la présente convention pour se rétracter par lettre recommandée avec accusé de réception adressée à ${company.name}, ${company.address}. En cas de rétractation dans ce délai, les sommes versées sont intégralement remboursées dans un délai de 30 jours.`;
  const splitArt10 = doc.splitTextToSize(art10, pageWidth - 40);
  doc.text(splitArt10, 20, yPos);
  
  // ============ ARTICLE 11 - Cessation anticipée ============
  yPos += splitArt10.length * 5 + 10;
  yPos = checkPageBreak(50);
  yPos = addSectionTitle(doc, "Article 11 - Cas de cessation anticipée", yPos);
  yPos += 2;
  doc.setFontSize(10);
  
  doc.setFont("helvetica", "bold");
  doc.text("11.1 - Cessation du fait du stagiaire", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("En cas d'abandon sans motif légitime : heures effectuées au prorata + 100€ de frais de dossier.", 20, yPos);
  
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("11.2 - Motifs légitimes d'absence", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("Maladie, cas de force majeure, décès d'un proche : réinscription sans frais sur session ultérieure.", 20, yPos);
  
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("11.3 - Cessation du fait de l'organisme", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("Remboursement au prorata des heures non effectuées, sans pénalité.", 20, yPos);
  
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("11.4 - Exclusion pour faute grave", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("Non-respect du règlement, comportement perturbateur : aucun remboursement.", 20, yPos);
  
  // ============ ARTICLE 12 - Assiduité ============
  yPos += 12;
  yPos = checkPageBreak(30);
  yPos = addSectionTitle(doc, "Article 12 - Assiduité et sanction des absences", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.text("La présence à l'intégralité de la formation est obligatoire pour :", 20, yPos);
  yPos += 5;
  doc.text("• Obtenir l'attestation de fin de formation", 25, yPos);
  yPos += 5;
  doc.text("• Être autorisé à se présenter à l'examen CMA", 25, yPos);
  yPos += 5;
  doc.setFontSize(9);
  doc.text("Toute absence > 4h non justifiée entraîne la non-délivrance de l'attestation.", 20, yPos);
  doc.setFontSize(10);
  
  // ============ ARTICLE 13 - Assurance ============
  yPos += 12;
  yPos = checkPageBreak(20);
  yPos = addSectionTitle(doc, "Article 13 - Assurance et responsabilité", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.text("Le Bénéficiaire déclare être couvert par une assurance responsabilité civile.", 20, yPos);
  yPos += 5;
  doc.text("L'Organisme est assuré pour sa responsabilité civile professionnelle.", 20, yPos);
  
  // New page for remaining articles
  addFooter(doc, pageNumber);
  doc.addPage();
  pageNumber++;
  const page3HeaderEndY = addHeader(doc, company);
  yPos = page3HeaderEndY + 5;
  
  // ============ ARTICLE 14 - RGPD ============
  yPos = addSectionTitle(doc, "Article 14 - Protection des données personnelles (RGPD)", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  const art14 = `Conformément au RGPD et à la loi Informatique et Libertés, le Bénéficiaire dispose d'un droit d'accès, de rectification, d'opposition et de suppression des données le concernant. Les données sont utilisées uniquement pour la gestion administrative, l'émission des attestations et les obligations légales (DREETS, Qualiopi). Conservation : 3 ans après la fin de la formation. Contact : ${company.email}`;
  const splitArt14 = doc.splitTextToSize(art14, pageWidth - 40);
  doc.text(splitArt14, 20, yPos);
  
  // ============ ARTICLE 15 - Règlement intérieur ============
  yPos += splitArt14.length * 5 + 10;
  yPos = checkPageBreak(20);
  yPos = addSectionTitle(doc, "Article 15 - Règlement intérieur", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.text("Le Bénéficiaire déclare avoir pris connaissance du règlement intérieur de l'Organisme", 20, yPos);
  yPos += 5;
  doc.text("annexé à la présente convention (ANNEXE 2) et s'engage à le respecter.", 20, yPos);
  
  // ============ ARTICLE 16 - Médiation et différends ============
  yPos += 12;
  yPos = checkPageBreak(30);
  yPos = addSectionTitle(doc, "Article 16 - Médiation et règlement des différends", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.text("En cas de litige, les parties s'engagent à rechercher une solution amiable.", 20, yPos);
  yPos += 5;
  doc.text("À défaut, le litige sera porté devant les tribunaux compétents du ressort de Nanterre.", 20, yPos);
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Médiation de la consommation :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text(`${ORGANISME.mediateur.nom} - ${ORGANISME.mediateur.adresse}, ${ORGANISME.mediateur.codePostal} ${ORGANISME.mediateur.ville}`, 20, yPos);
  yPos += 5;
  doc.text(`${ORGANISME.mediateur.web}`, 20, yPos);
  
  // ============ ARTICLE 17 - Modification ============
  yPos += 12;
  yPos = checkPageBreak(15);
  yPos = addSectionTitle(doc, "Article 17 - Modification de la convention", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.text("Toute modification de la présente convention fera l'objet d'un avenant signé par les deux parties.", 20, yPos);
  
  // ============ ARTICLE 18 - Documents annexes ============
  yPos += 12;
  yPos = checkPageBreak(25);
  yPos = addSectionTitle(doc, "Article 18 - Documents annexes", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.text("Sont annexés à la présente convention :", 20, yPos);
  yPos += 6;
  doc.text("• ANNEXE 1 : Programme détaillé de la formation", 25, yPos);
  yPos += 5;
  doc.text("• ANNEXE 2 : Règlement intérieur de l'organisme de formation", 25, yPos);
  yPos += 5;
  doc.text("• ANNEXE 3 : Conditions générales de vente", 25, yPos);
  
  // ============ SIGNATURES ============
  yPos += 18;
  yPos = checkPageBreak(65);
  
  // Ligne séparatrice
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.rect(20, yPos, pageWidth - 40, 1, "F");
  
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  doc.text(`Fait en double exemplaire original à ${ORGANISME.ville}, le ${format(new Date(), "dd/MM/yyyy")}`, 20, yPos);
  
  yPos += 15;
  doc.setFont("helvetica", "normal");
  
  // Deux colonnes pour signatures
  const col1X = 30;
  const col2X = pageWidth - 70;
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Pour l'Organisme de formation", col1X, yPos);
  doc.text("Le Bénéficiaire", col2X, yPos);
  
  yPos += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(company.name, col1X, yPos);
  
  yPos += 8;
  doc.setFontSize(8);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  
  doc.text("(Cachet et signature)", col1X, yPos);
  
  // Add stamp image below text with proper spacing
  const stampAdded = addStampImage(doc, company, col1X, yPos + 4, 35, 22);
  
  doc.text("(Signature précédée de", col2X, yPos);
  doc.text("\"Lu et approuvé, bon pour accord\")", col2X, yPos + 4);
  
  addFooter(doc, pageNumber);
  
  // ============ ANNEXES ============
  if (options?.includeAnnexes !== false) {
    // ANNEXE 1 - Programme détaillé
    doc.addPage();
    pageNumber++;
    const annexe1HeaderY = addHeader(doc, company);
    yPos = annexe1HeaderY + 5;
    
    // Titre Annexe 1
    doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
    const annexeTitle = "ANNEXE 1 - PROGRAMME DÉTAILLÉ";
    const annexeTitleWidth = doc.getTextWidth(annexeTitle) + 30;
    doc.roundedRect((pageWidth - annexeTitleWidth) / 2, yPos - 5, annexeTitleWidth, 15, 3, 3, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
    doc.text(annexeTitle, pageWidth / 2, yPos + 4, { align: "center" });
    
    yPos += 12;
    doc.setFontSize(11);
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.text(`Formation : ${session.nom}`, pageWidth / 2, yPos, { align: "center" });
    
    yPos += 6;
    doc.setFontSize(9);
    doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
    doc.text(`Durée totale : ${session.duree_heures || 35} heures`, pageWidth / 2, yPos, { align: "center" });
    doc.text(`Du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}`, pageWidth / 2, yPos + 5, { align: "center" });
    
    yPos += 18;
    
    // Programme selon le type de formation
    programme.modules.forEach((module) => {
      yPos = checkPageBreak(50);
      
      // Module header
      doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
      doc.roundedRect(20, yPos - 4, pageWidth - 40, 13, 2, 2, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      doc.text(`${module.titre}`, 25, yPos + 3);
      doc.text(`${module.duree}`, pageWidth - 30, yPos + 3, { align: "right" });
      
      yPos += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
      
      module.contenu.forEach(item => {
        yPos = checkPageBreak(8);
        const splitItem = doc.splitTextToSize(`• ${item}`, pageWidth - 50);
        doc.text(splitItem, 25, yPos);
        yPos += splitItem.length * 4 + 1;
      });
      
      yPos += 5;
    });
    
    // Sanction de la formation
    yPos += 5;
    yPos = checkPageBreak(30);
    doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
    doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, "F");
    doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
    doc.roundedRect(20, yPos, 4, 25, 2, 2, "F");
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.text("Sanction de la formation :", 30, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    const splitSanction = doc.splitTextToSize(programme.sanctionFormation, pageWidth - 60);
    doc.text(splitSanction, 30, yPos);
    
    addFooter(doc, pageNumber);
    
    // ANNEXE 2 - Règlement intérieur
    doc.addPage();
    pageNumber++;
    const annexe2HeaderY = addHeader(doc, company);
    yPos = annexe2HeaderY + 5;
    
    // Titre Annexe 2
    doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
    const annexe2Title = "ANNEXE 2 - RÈGLEMENT INTÉRIEUR";
    const annexe2TitleWidth = doc.getTextWidth(annexe2Title) + 30;
    doc.roundedRect((pageWidth - annexe2TitleWidth) / 2, yPos - 5, annexe2TitleWidth, 15, 3, 3, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
    doc.text(annexe2Title, pageWidth / 2, yPos + 4, { align: "center" });
    
    yPos += 15;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
    doc.text("Établi conformément aux articles L.6352-3 et R.6352-1 à R.6352-15 du Code du travail", pageWidth / 2, yPos, { align: "center" });
    
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    
    // Articles du règlement intérieur
    const reglementArticles = [
      { titre: "Article 1 - Objet et champ d'application", contenu: "Le présent règlement s'applique à tous les stagiaires pour la durée de leur formation au sein de l'organisme, quel que soit le lieu où celle-ci se déroule." },
      { titre: "Article 2 - Discipline générale", contenu: "Chaque stagiaire s'engage à respecter les horaires de formation, les règles de bonne conduite, et à ne pas perturber le déroulement des cours. L'usage de téléphone portable est interdit pendant les séances de formation." },
      { titre: "Article 3 - Hygiène et sécurité", contenu: "Les consignes d'hygiène et de sécurité doivent être scrupuleusement respectées. Il est strictement interdit de fumer ou de vapoter dans les locaux. Les issues de secours doivent rester libres d'accès en permanence." },
      { titre: "Article 4 - Absences et retards", contenu: "En cas d'absence ou de retard, le stagiaire doit prévenir l'organisme dans les plus brefs délais. Les absences non justifiées peuvent entraîner l'exclusion de la formation et la non-délivrance de l'attestation." },
      { titre: "Article 5 - Sanctions disciplinaires", contenu: "Tout manquement au règlement peut faire l'objet d'une sanction, allant de l'avertissement à l'exclusion définitive, selon la procédure contradictoire prévue aux articles R.6352-4 à R.6352-8 du Code du travail." },
      { titre: "Article 6 - Représentation des stagiaires", contenu: "Pour les formations de plus de 500 heures, un délégué des stagiaires est élu selon les modalités définies aux articles R.6352-9 à R.6352-15 du Code du travail." },
      { titre: "Article 7 - Confidentialité", contenu: "Le stagiaire s'engage à respecter la confidentialité des informations et documents pédagogiques fournis pendant la formation, ainsi que les données personnelles des autres participants." },
    ];
    
    reglementArticles.forEach(article => {
      yPos = checkPageBreak(25);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
      doc.text(article.titre, 20, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
      const splitContenu = doc.splitTextToSize(article.contenu, pageWidth - 40);
      doc.text(splitContenu, 20, yPos);
      yPos += splitContenu.length * 4 + 8;
    });
    
    // Signature du règlement
    yPos += 10;
    yPos = checkPageBreak(35);
    doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
    doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, "F");
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    doc.text(`Fait à ${ORGANISME.ville}, le ${format(new Date(), "dd/MM/yyyy")}`, 25, yPos);
    yPos += 8;
    doc.text("Le stagiaire (mention \"Lu et approuvé\") :", 25, yPos);
    yPos += 10;
    doc.text("Signature : ___________________________", 25, yPos);
    
    addFooter(doc, pageNumber);
  }
  
  // Reset to page 1 and add footer
  doc.setPage(1);
  addFooter(doc, 1);
  
  return doc;
}

// ==================== CONTRAT DE FORMATION PROFESSIONNELLE (Conforme DREETS/Qualiopi) ====================
// Pour les formations financées directement par le stagiaire (personne physique)
export function generateContratFormationPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo = DEFAULT_COMPANY
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const bottomMargin = 30;
  const lineH = 5;
  const paraGap = 3;
  let pageNum = 1;

  function checkPageBreak(needed: number): void {
    if (yPos + needed > pageHeight - bottomMargin) {
      addFooter(doc, pageNum);
      pageNum++;
      doc.addPage();
      const hEnd = addHeader(doc, company);
      yPos = hEnd + 5;
    }
  }

  function writeParagraph(text: string, x: number = marginLeft, maxW: number = contentWidth, fontSize: number = 9): void {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const line of lines) {
      checkPageBreak(lineH + 2);
      doc.text(line, x, yPos);
      yPos += lineH;
    }
    doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  }

  function writeArticleTitle(title: string): void {
    yPos += paraGap * 2;
    checkPageBreak(lineH * 3);

    // Barre latérale Forest Green
    doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.roundedRect(marginLeft, yPos - 2, 3, 14, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.text(title, marginLeft + 7, yPos + 5);
    doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
    doc.setFont("helvetica", "normal");
    yPos += lineH + 8;
  }

  function writeBullet(text: string): void {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    const lines = doc.splitTextToSize(text, contentWidth - 12) as string[];
    for (let i = 0; i < lines.length; i++) {
      checkPageBreak(lineH + 1);
      doc.text(lines[i], marginLeft + (i === 0 ? 4 : 9), yPos);
      yPos += lineH;
    }
    doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  }

  const headerEndY = addHeader(doc, company);
  let yPos = headerEndY + 5;

  // ===== TITRE avec badge Gold =====
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const titleText = "CONTRAT DE FORMATION PROFESSIONNELLE";
  const titleW = doc.getTextWidth(titleText) + 30;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - titleW) / 2, yPos - 8, titleW, 16, 3, 3, "F");
  doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
  doc.text(titleText, pageWidth / 2, yPos + 1, { align: "center" });

  yPos += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("En application des articles L.6353-3 à L.6353-7 du Code du travail", pageWidth / 2, yPos, { align: "center" });
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);

  if (session.numero_session) {
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(COLORS.forestGreenLight.r, COLORS.forestGreenLight.g, COLORS.forestGreenLight.b);
    doc.text(`Réf: ${session.numero_session}`, pageWidth / 2, yPos, { align: "center" });
    doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  }

  // ===== ENTRE LES SOUSSIGNÉS - Deux colonnes dans info boxes =====
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("ENTRE LES SOUSSIGNÉS :", marginLeft, yPos);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += lineH + 5;

  // --- Box Organisme (fond cream + accent gold) ---
  const orgBoxH = 36;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(marginLeft, yPos, contentWidth, orgBoxH, 3, 3, "F");
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(marginLeft, yPos, 3, orgBoxH, 1, 1, "F");

  let orgY = yPos + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("L'organisme de formation :", marginLeft + 8, orgY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  orgY += lineH + 1;
  doc.setFont("helvetica", "bold");
  doc.text(`${company.name}`, marginLeft + 8, orgY);
  doc.setFont("helvetica", "normal");
  doc.text(` — SIRET : ${company.siret}`, marginLeft + 8 + doc.getTextWidth(`${company.name} `), orgY);
  orgY += lineH;
  const addressLines = doc.splitTextToSize(company.address, contentWidth - 16) as string[];
  for (const line of addressLines) {
    doc.text(line, marginLeft + 8, orgY);
    orgY += lineH;
  }
  doc.text(`Déclaration d'activité N° ${company.nda}`, marginLeft + 8, orgY);
  orgY += lineH - 1;
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("(ne vaut pas agrément de l'État) — Ci-après dénommé « l'Organisme »", marginLeft + 8, orgY);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);

  yPos += orgBoxH + 5;

  // --- Box Stagiaire (fond cream + accent forest green) ---
  let stagLines = 3;
  if (contact.date_naissance) stagLines++;
  if (contact.rue) stagLines++;
  if (contact.code_postal || contact.ville) stagLines++;
  if (contact.email) stagLines++;
  if (contact.telephone) stagLines++;
  const stagBoxH = Math.max(30, (stagLines + 1) * lineH + 10);

  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(marginLeft, yPos, contentWidth, stagBoxH, 3, 3, "F");
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(marginLeft, yPos, 3, stagBoxH, 1, 1, "F");

  let stagY = yPos + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Le stagiaire :", marginLeft + 8, stagY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  stagY += lineH + 1;

  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  doc.text(fullName, marginLeft + 8, stagY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  stagY += lineH;
  if (contact.date_naissance) {
    doc.text(`Né(e) le ${format(new Date(contact.date_naissance), "dd MMMM yyyy", { locale: fr })}${contact.ville_naissance ? ` à ${contact.ville_naissance}` : ""}`, marginLeft + 8, stagY);
    stagY += lineH;
  }
  if (contact.rue) {
    doc.text(contact.rue, marginLeft + 8, stagY);
    stagY += lineH;
  }
  if (contact.code_postal || contact.ville) {
    doc.text(`${contact.code_postal || ""} ${contact.ville || ""}`.trim(), marginLeft + 8, stagY);
    stagY += lineH;
  }
  if (contact.email) {
    doc.text(`Email : ${contact.email}`, marginLeft + 8, stagY);
    stagY += lineH;
  }
  if (contact.telephone) {
    doc.text(`Tél : ${contact.telephone}`, marginLeft + 8, stagY);
    stagY += lineH;
  }
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("Ci-après dénommé « le Stagiaire »", marginLeft + 8, stagY);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);

  yPos += stagBoxH + 4;

  // ===== ARTICLES =====

  // Article 1
  writeArticleTitle("Article 1 — Objet du contrat");
  writeParagraph("Le présent contrat est conclu en application des articles L.6353-3 à L.6353-7 du Code du travail. L'Organisme s'engage à organiser l'action de formation définie ci-après et le Stagiaire s'engage à suivre cette formation avec assiduité.");

  // Article 2 - Info box pour les détails de formation
  writeArticleTitle("Article 2 — Nature et caractéristiques de l'action de formation");
  checkPageBreak(40);

  // Info box pour les caractéristiques
  const art2Items: string[] = [];
  art2Items.push(`Intitulé : ${session.nom}`);
  const objText = session.objectifs || "Acquisition des compétences professionnelles visées par la formation";
  art2Items.push(`Objectif : ${objText}`);
  art2Items.push(`Dates : du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}`);
  if (session.duree_heures) art2Items.push(`Durée totale : ${session.duree_heures} heures`);
  const contratHours = formatSessionHours(session);
  if (contratHours) art2Items.push(`Horaires : ${contratHours}`);
  const contratAddress = formatFullAddress(session);
  if (contratAddress) art2Items.push(`Lieu : ${contratAddress}`);
  art2Items.push("Modalité : En présentiel");

  const art2BoxH = art2Items.length * lineH + 10;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(marginLeft, yPos, contentWidth, art2BoxH, 3, 3, "F");
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(marginLeft, yPos, 3, art2BoxH, 1, 1, "F");

  let art2Y = yPos + 6;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  for (const item of art2Items) {
    doc.setFont("helvetica", "bold");
    const [label, ...rest] = item.split(" : ");
    doc.text(`${label} :`, marginLeft + 8, art2Y);
    doc.setFont("helvetica", "normal");
    const labelW = doc.getTextWidth(`${label} : `);
    const value = rest.join(" : ");
    const valueLines = doc.splitTextToSize(value, contentWidth - 16 - labelW) as string[];
    doc.text(valueLines[0] || "", marginLeft + 8 + labelW, art2Y);
    art2Y += lineH;
    for (let i = 1; i < valueLines.length; i++) {
      doc.text(valueLines[i], marginLeft + 8 + labelW, art2Y);
      art2Y += lineH;
    }
  }
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += art2BoxH + 3;

  // Article 3
  writeArticleTitle("Article 3 — Niveau requis et public concerné");
  const prerequis = session.prerequis || "Aucun prérequis spécifique n'est demandé pour cette formation.";
  writeParagraph(prerequis);

  // Article 4
  writeArticleTitle("Article 4 — Moyens pédagogiques et techniques");
  writeParagraph("La formation est dispensée en présentiel dans les locaux de l'Organisme. Les moyens pédagogiques mis en œuvre comprennent : supports de cours, exercices pratiques, mises en situation, évaluations formatives. L'Organisme met à disposition les équipements techniques nécessaires au bon déroulement de la formation.");

  // Article 5
  writeArticleTitle("Article 5 — Modalités d'évaluation");
  writeParagraph("Les acquis du Stagiaire sont évalués tout au long de la formation par des évaluations formatives (QCM, exercices, mises en situation). Une évaluation sommative est réalisée en fin de formation. Une attestation de fin de formation précisant les objectifs atteints est remise au Stagiaire.");

  // Article 6 - Prix dans un encadré Gold
  writeArticleTitle("Article 6 — Prix de la formation et modalités de paiement");
  checkPageBreak(25);

  const prixArt6 = getPrice(session);
  const priceBoxH = 18;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  // Light gold tinted background
  doc.roundedRect(marginLeft, yPos, contentWidth, priceBoxH, 3, 3, "F");
  // Overlay with actual opacity simulation
  doc.setFillColor(255, 251, 240);
  doc.roundedRect(marginLeft, yPos, contentWidth, priceBoxH, 3, 3, "F");
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(marginLeft, yPos, 3, priceBoxH, 1, 1, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
  doc.text(`Prix : ${prixArt6.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, marginLeft + 8, yPos + 7);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  doc.text("TVA non applicable — art. 293 B du CGI", marginLeft + 8, yPos + 13);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += priceBoxH + 3;

  writeParagraph("Le paiement s'effectue à la signature du présent contrat ou selon l'échéancier convenu entre les parties.");

  // Article 7 - Rétractation (mise en évidence)
  writeArticleTitle("Article 7 — Délai de rétractation (Art. L.6353-5)");
  checkPageBreak(20);

  // Encadré d'alerte pour le délai de rétractation
  const retractBoxH = 16;
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(marginLeft, yPos, contentWidth, retractBoxH, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text("⚠ DÉLAI DE RÉTRACTATION : 10 JOURS", marginLeft + 8, yPos + 6);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("À compter de la signature — par lettre recommandée avec accusé de réception", marginLeft + 8, yPos + 12);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += retractBoxH + 3;

  writeParagraph("Conformément à l'article L.6353-5 du Code du travail, le Stagiaire dispose d'un délai de DIX (10) JOURS à compter de la signature du présent contrat pour se rétracter. Cette rétractation doit être notifiée par lettre recommandée avec accusé de réception adressée à l'Organisme. Dans ce cas, aucune somme ne peut être exigée du Stagiaire.");

  // Article 8
  writeArticleTitle("Article 8 — Paiement anticipé (Art. L.6353-6)");
  writeParagraph("Conformément à l'article L.6353-6 du Code du travail, aucun paiement ne peut être exigé avant l'expiration du délai de rétractation de 10 jours. À l'issue de ce délai, un acompte maximum de 30% du prix convenu peut être versé. Le solde donne lieu à échelonnement des paiements au fur et à mesure du déroulement de l'action de formation.");

  // Article 9
  writeArticleTitle("Article 9 — Interruption de la formation (Art. L.6353-7)");
  writeParagraph("En cas de cessation anticipée de la formation du fait de l'Organisme ou d'abandon pour un motif relevant de la force majeure dûment reconnu, seules les prestations effectivement dispensées sont dues au prorata temporis de leur valeur prévue au contrat.");

  // Article 10
  writeArticleTitle("Article 10 — Obligations du Stagiaire");
  writeParagraph("Le Stagiaire s'engage à : suivre la formation avec assiduité, respecter le règlement intérieur de l'Organisme, participer aux évaluations prévues, informer l'Organisme de tout empêchement dans les meilleurs délais.");

  // Article 11
  writeArticleTitle("Article 11 — Règlement intérieur");
  writeParagraph("Le Stagiaire déclare avoir pris connaissance du règlement intérieur de l'Organisme de formation, qui lui a été remis préalablement à la signature du présent contrat et s'engage à le respecter.");

  // Article 12
  writeArticleTitle("Article 12 — Responsabilité et assurance");
  writeParagraph("L'Organisme a souscrit une assurance de responsabilité civile professionnelle. Le Stagiaire doit être couvert par sa propre assurance responsabilité civile pendant la durée de la formation.");

  // Article 13
  writeArticleTitle("Article 13 — Protection des données personnelles (RGPD)");
  writeParagraph("Les données personnelles recueillies dans le cadre du présent contrat font l'objet d'un traitement informatique destiné à la gestion administrative et pédagogique de la formation. Conformément au RGPD, le Stagiaire dispose d'un droit d'accès, de rectification, de suppression et de portabilité de ses données.");

  // Article 14
  writeArticleTitle("Article 14 — Règlement des litiges");
  writeParagraph("En cas de contestation, les parties conviennent de rechercher une solution amiable. Le Stagiaire peut recourir gratuitement au service du médiateur de la consommation. À défaut d'accord amiable, le litige sera soumis aux tribunaux compétents.");

  // Article 15
  writeArticleTitle("Article 15 — Dispositions générales");
  writeParagraph("Le présent contrat est soumis au droit français. Il annule et remplace tout accord antérieur entre les parties relatif à la même formation. Toute modification doit faire l'objet d'un avenant signé par les deux parties.");

  // ===== SIGNATURES - Bloc structuré avec boxes =====
  yPos += paraGap * 2;
  checkPageBreak(60);

  // Ligne séparatrice Gold
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.rect(marginLeft, yPos, contentWidth, 1, "F");
  yPos += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("SIGNATURES", marginLeft, yPos);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text(`Fait en double exemplaire, le ${format(new Date(), "dd/MM/yyyy")}`, marginLeft, yPos);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += 6;

  const halfW = (contentWidth - 10) / 2;
  const sigBoxH = 38;

  // Box gauche - Organisme
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.setDrawColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, yPos, halfW, sigBoxH, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Pour l'Organisme de formation", marginLeft + 4, yPos + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  doc.text("(Cachet et signature)", marginLeft + 4, yPos + 12);

  // Stamp placed below the text labels, not overlapping
  const stampAdded = addStampImage(doc, company, marginLeft + 4, yPos + 15, 35, 20);

  // Box droite - Stagiaire
  const rightX = marginLeft + halfW + 10;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(rightX, yPos, halfW, sigBoxH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Le Stagiaire", rightX + 4, yPos + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(fullName, rightX + 4, yPos + 12);
  doc.setFontSize(7);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("(Signature précédée de la mention", rightX + 4, yPos + 24);
  doc.text("\"Lu et approuvé, bon pour accord\")", rightX + 4, yPos + 28);

  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += sigBoxH + 8;

  // Mention légale finale
  checkPageBreak(10);
  doc.setFontSize(7);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("Le présent contrat est conclu conformément aux dispositions des articles L.6353-3 à L.6353-7 du Code du travail.", marginLeft, yPos);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);

  // Ajouter les footers sur toutes les pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i);
  }

  return doc;
}

// ==================== CONVOCATION PDF ====================
export function generateConvocationPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo = DEFAULT_COMPANY
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // ── Header ──
  const headerEndY = addHeader(doc, company);

  // ── Document title with gold badge ──
  let yPos = headerEndY + 4;
  const titleText = "CONVOCATION À LA FORMATION";
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const titleW = doc.getTextWidth(titleText) + 28;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - titleW) / 2, yPos - 7, titleW, 16, 3, 3, "F");
  doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
  doc.text(titleText, pageWidth / 2, yPos + 1, { align: "center" });

  // Session reference under title
  if (session.numero_session) {
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
    doc.text(`Réf. Session : ${session.numero_session}`, pageWidth / 2, yPos, { align: "center" });
  }

  // ── Date d'émission (top-right) ──
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  const emissionDate = `Fait le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`;
  doc.text(emissionDate, pageWidth - marginRight, yPos, { align: "right" });

  // ── Destinataire block (right-aligned, formal letter style) ──
  yPos += 8;
  const contactX = pageWidth - 80;
  const contactEndY = addContactBlock(doc, contact, contactX, yPos, "");

  // ── Body starts after contact block ──
  yPos = Math.max(contactEndY, yPos + 35) + 4;
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);

  // Objet line
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Objet : ", marginLeft, yPos);
  const objetLabelW = doc.getTextWidth("Objet : ");
  doc.setFont("helvetica", "normal");
  doc.text("Convocation à votre session de formation", marginLeft + objetLabelW, yPos);

  yPos += 10;
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${fullName},`, marginLeft, yPos);

  yPos += 7;
  const introLines = doc.splitTextToSize(
    "Nous avons le plaisir de vous confirmer votre inscription à la formation ci-dessous. Nous vous remercions de votre confiance et vous invitons à prendre connaissance des informations suivantes.",
    contentWidth
  ) as string[];
  doc.text(introLines, marginLeft, yPos);
  yPos += introLines.length * 5 + 6;

  // ── Section 1: Formation details (cream box with gold left border) ──
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(marginLeft, yPos - 2, 3, 16, 1, 1, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("INFORMATIONS DE FORMATION", marginLeft + 7, yPos + 6);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += 18;

  // Build detail rows
  interface DetailRow { label: string; value: string }
  const details: DetailRow[] = [];

  details.push({ label: "Formation", value: session.nom });
  details.push({
    label: "Dates",
    value: `Du ${format(new Date(session.date_debut), "EEEE dd MMMM yyyy", { locale: fr })} au ${format(new Date(session.date_fin), "EEEE dd MMMM yyyy", { locale: fr })}`
  });

  const hours = formatSessionHours(session);
  if (hours) details.push({ label: "Horaires", value: hours });

  const address = formatFullAddress(session);
  if (address) details.push({ label: "Lieu", value: address });

  if (session.duree_heures) details.push({ label: "Durée totale", value: `${session.duree_heures} heures` });
  if (session.formateur) details.push({ label: "Formateur", value: session.formateur });

  // Calculate box height with generous padding
  const rowH = 10;
  const boxPadY = 10;
  const rowGap = 2; // extra gap between rows for divider clearance
  let totalBoxH = boxPadY * 2;
  // Pre-calculate multi-line values
  const detailRendered: { label: string; lines: string[]; lineH: number }[] = [];
  for (const d of details) {
    const maxValW = contentWidth - 48;
    const lines = doc.splitTextToSize(d.value, maxValW) as string[];
    const lineH = lines.length * 5.5;
    detailRendered.push({ label: d.label, lines, lineH: Math.max(lineH, rowH) });
    totalBoxH += Math.max(lineH, rowH) + rowGap;
  }

  // Cream background
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(marginLeft, yPos, contentWidth, totalBoxH, 3, 3, "F");

  // Gold left accent
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(marginLeft, yPos, 3, totalBoxH, 1.5, 1.5, "F");

  let rowY = yPos + boxPadY + 4;
  doc.setFontSize(9.5);
  for (const row of detailRendered) {
    // Label
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.text(row.label, marginLeft + 8, rowY);

    // Value
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
    doc.text(row.lines, marginLeft + 42, rowY);

    // Subtle divider drawn below text with clearance
    rowY += row.lineH + rowGap;
    if (row !== detailRendered[detailRendered.length - 1]) {
      doc.setDrawColor(COLORS.creamDark.r, COLORS.creamDark.g, COLORS.creamDark.b);
      doc.setLineWidth(0.3);
      doc.line(marginLeft + 6, rowY - 1, marginLeft + contentWidth - 6, rowY - 1);
    }
  }

  yPos += totalBoxH + 10;

  // ── Section 2: Documents à apporter ──
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(marginLeft, yPos - 2, 3, 16, 1, 1, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("DOCUMENTS À APPORTER", marginLeft + 7, yPos + 6);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += 18;

  const docsTooBring = [
    "Pièce d'identité en cours de validité",
    "Permis de conduire",
    "Attestation d'inscription (cette convocation)",
  ];

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  for (const item of docsTooBring) {
    // Green bullet
    doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.circle(marginLeft + 4, yPos - 1.2, 1.2, "F");
    doc.text(item, marginLeft + 10, yPos);
    yPos += 7;
  }

  // ── Section 3: Informations pratiques ──
  yPos += 4;
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(marginLeft, yPos - 2, 3, 16, 1, 1, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("INFORMATIONS PRATIQUES", marginLeft + 7, yPos + 6);
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  yPos += 18;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  const practicalLines = doc.splitTextToSize(
    "Nous vous prions de bien vouloir vous présenter 15 minutes avant le début de la formation. En cas d'empêchement, merci de nous prévenir dans les plus brefs délais.",
    contentWidth
  ) as string[];
  doc.text(practicalLines, marginLeft, yPos);
  yPos += practicalLines.length * 5 + 6;

  // ── Contact support box ──
  const contactBoxH = 16;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(marginLeft, yPos, contentWidth, contactBoxH, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Contact :", marginLeft + 6, yPos + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`${company.phone}  |  ${company.email}`, marginLeft + 28, yPos + 6);
  doc.setFontSize(8);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("N'hésitez pas à nous contacter pour toute question relative à votre formation.", marginLeft + 6, yPos + 12);
  yPos += contactBoxH + 12;

  // ── Closing & signature ──
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  doc.text("Dans l'attente de vous accueillir, nous vous prions d'agréer nos salutations distinguées.", marginLeft, yPos);

  yPos += 12;
  // Stamp / signature
  const stampAdded = addStampImage(doc, company, marginLeft, yPos, 32, 18);
  yPos += stampAdded ? 22 : 4;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("L'équipe Formation", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  doc.text(company.name, marginLeft, yPos + 5);

  // ── Footer ──
  addFooter(doc);

  return doc;
}

// ==================== PROGRAMME DE FORMATION PDF ====================
export function generateProgrammePDF(
  session: SessionInfo,
  company: CompanyInfo = DEFAULT_COMPANY
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 30;
  let pageNumber = 1;
  
  const formationType = getFormationType(session.nom, session.formation_type);
  const programme = getProgramme(formationType);
  const objectifs = getObjectifs(formationType);
  const prerequis = getPrerequis(formationType);
  
  // Calculate total hours
  const totalHeures = programme.reduce((sum, m) => sum + m.dureeHeures, 0);
  
  // Helper to check if we need a new page
  const checkPageBreak = (neededSpace: number = 30): number => {
    if (yPos + neededSpace > pageHeight - bottomMargin) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber++;
      const newHeaderY = addHeader(doc, company);
      return newHeaderY + 5;
    }
    return yPos;
  };
  
  const headerEndY = addHeader(doc, company);
  
  // Title
  let yPos = addDocumentTitle(
    doc, 
    "PROGRAMME DE FORMATION", 
    headerEndY,
    session.nom
  );
  
  // Information session box
  yPos += 5;
  const infoBoxHeight = 35;
  addInfoBox(doc, yPos, infoBoxHeight);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`Durée : ${totalHeures} heures`, 30, yPos);
  yPos += 6;
  doc.text(`Dates : Du ${format(new Date(session.date_debut), "dd MMMM yyyy", { locale: fr })} au ${format(new Date(session.date_fin), "dd MMMM yyyy", { locale: fr })}`, 30, yPos);
  yPos += 6;
  doc.text(`Lieu : ${formatFullAddress(session)}`, 30, yPos);
  
  yPos += infoBoxHeight - 12;
  
  // Objectifs pédagogiques
  yPos += 5;
  yPos = checkPageBreak(40);
  yPos = addSectionTitle(doc, "Objectifs de la formation", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  objectifs.forEach(obj => {
    yPos = checkPageBreak(8);
    const objLines = doc.splitTextToSize(`• ${obj}`, pageWidth - 50);
    doc.text(objLines, 25, yPos);
    yPos += objLines.length * 5;
  });
  
  // Prérequis
  yPos += 8;
  yPos = checkPageBreak(30);
  yPos = addSectionTitle(doc, "Prérequis", yPos);
  yPos += 2;
  doc.setFontSize(10);
  
  prerequis.forEach(prereq => {
    yPos = checkPageBreak(8);
    const prereqLines = doc.splitTextToSize(`• ${prereq}`, pageWidth - 50);
    doc.text(prereqLines, 25, yPos);
    yPos += prereqLines.length * 5;
  });
  
  // Contenu pédagogique (modules)
  yPos += 10;
  yPos = checkPageBreak(20);
  yPos = addSectionTitle(doc, "Contenu pédagogique", yPos);
  yPos += 2;
  
  // Afficher chaque module avec son contenu détaillé
  programme.forEach((module, index) => {
    yPos = checkPageBreak(35);
    
    // Titre du module avec fond Forest Green
    doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.roundedRect(20, yPos - 4, pageWidth - 40, 13, 2, 2, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    doc.text(`Module ${module.numero} : ${module.titre}`, 25, yPos + 3);
    
    yPos += 14;
    
    // Contenu du module
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    
    module.contenu.forEach(item => {
      yPos = checkPageBreak(6);
      const itemLines = doc.splitTextToSize(`• ${item}`, pageWidth - 55);
      doc.text(itemLines, 28, yPos);
      yPos += itemLines.length * 4.5;
    });
    
    // Objectifs du module si disponibles
    if (module.objectifs && module.objectifs.length > 0) {
      yPos += 3;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
      doc.text("Objectifs du module :", 28, yPos);
      yPos += 4;
      doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
      module.objectifs.forEach(obj => {
        yPos = checkPageBreak(5);
        doc.text(`→ ${obj}`, 32, yPos);
        yPos += 4;
      });
    }
    
    yPos += 8;
  });
  
  // Récapitulatif total
  yPos = checkPageBreak(30);
  yPos += 5;
  
  const recapBoxY = yPos;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(20, recapBoxY, pageWidth - 40, 20, 3, 3, "F");
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(20, recapBoxY, 4, 20, 2, 2, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(`Durée totale : ${totalHeures} heures`, 30, recapBoxY + 9);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  doc.text(`${programme.length} modules de formation`, 30, recapBoxY + 15);
  
  // Modalités
  yPos = recapBoxY + 30;
  yPos = checkPageBreak(35);
  yPos = addSectionTitle(doc, "Modalités pédagogiques et évaluation", yPos);
  yPos += 2;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  doc.text("• Formation en présentiel avec supports pédagogiques remis", 25, yPos);
  yPos += 5;
  doc.text("• Alternance théorie / exercices pratiques / études de cas", 25, yPos);
  yPos += 5;
  doc.text("• QCM d'évaluation continue et examens blancs", 25, yPos);
  yPos += 5;
  doc.text("• Attestation de fin de formation", 25, yPos);
  
  // Footer
  addFooter(doc, pageNumber);
  
  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i < totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i);
  }
  
  return doc;
}

// ==================== PROGRAMME STANDALONE PDF (sans session) ====================
export function generateProgrammeStandalonePDF(
  formationType: TypeFormation,
  company: CompanyInfo = DEFAULT_COMPANY
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 30;
  let pageNumber = 1;
  
  const programme = getProgramme(formationType);
  const objectifs = getObjectifs(formationType);
  const prerequis = getPrerequis(formationType);
  
  // Calculate total hours
  const totalHeures = programme.reduce((sum, m) => sum + m.dureeHeures, 0);
  
  // Get formation label
  const formationLabels: Record<string, string> = {
    VTC: "Formation Continue VTC",
    TAXI: "Formation Continue TAXI",
    "TAXI-75": "Formation Continue TAXI - Paris (75)",
    VMDTR: "Formation Continue VMDTR",
    RECUPERATION_POINTS: "Stage de récupération de points",
  };
  const formationLabel = formationLabels[formationType] || formationType;
  
  let yPos = 0;
  
  // Helper to check if we need a new page
  const checkPageBreak = (neededSpace: number = 30): number => {
    if (yPos + neededSpace > pageHeight - bottomMargin) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber++;
      const newHeaderY = addHeader(doc, company);
      return newHeaderY + 5;
    }
    return yPos;
  };
  
  const headerEndY = addHeader(doc, company);
  
  // Title
  yPos = addDocumentTitle(
    doc, 
    "PROGRAMME DE FORMATION", 
    headerEndY,
    formationLabel
  );
  
  // Information box
  yPos += 5;
  const infoBoxHeight = 25;
  addInfoBox(doc, yPos, infoBoxHeight);
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(`Durée totale : ${totalHeures} heures`, 30, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`Modules : ${programme.length} | Modalité : Présentiel`, 30, yPos);
  
  yPos += infoBoxHeight - 6;
  
  // Objectifs pédagogiques
  yPos += 5;
  yPos = checkPageBreak(40);
  yPos = addSectionTitle(doc, "Objectifs de la formation", yPos);
  yPos += 2;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  objectifs.forEach(obj => {
    yPos = checkPageBreak(8);
    const objLines = doc.splitTextToSize(`• ${obj}`, pageWidth - 50);
    doc.text(objLines, 25, yPos);
    yPos += objLines.length * 5;
  });
  
  // Prérequis
  yPos += 8;
  yPos = checkPageBreak(30);
  yPos = addSectionTitle(doc, "Prérequis", yPos);
  yPos += 2;
  doc.setFontSize(10);
  
  prerequis.forEach(prereq => {
    yPos = checkPageBreak(8);
    const prereqLines = doc.splitTextToSize(`• ${prereq}`, pageWidth - 50);
    doc.text(prereqLines, 25, yPos);
    yPos += prereqLines.length * 5;
  });
  
  // Contenu pédagogique (modules)
  yPos += 10;
  yPos = checkPageBreak(20);
  yPos = addSectionTitle(doc, "Contenu pédagogique", yPos);
  yPos += 2;
  
  // Afficher chaque module avec son contenu détaillé
  programme.forEach((module, index) => {
    yPos = checkPageBreak(35);
    
    // Titre du module avec fond Forest Green
    doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.roundedRect(20, yPos - 4, pageWidth - 40, 13, 2, 2, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    doc.text(`Module ${module.numero} : ${module.titre}`, 25, yPos + 3);
    
    yPos += 14;
    
    // Contenu du module
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    
    module.contenu.forEach(item => {
      yPos = checkPageBreak(6);
      const itemLines = doc.splitTextToSize(`• ${item}`, pageWidth - 55);
      doc.text(itemLines, 28, yPos);
      yPos += itemLines.length * 4.5;
    });
    
    // Objectifs du module si disponibles
    if (module.objectifs && module.objectifs.length > 0) {
      yPos += 3;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
      doc.text("Objectifs du module :", 28, yPos);
      yPos += 4;
      doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
      module.objectifs.forEach(obj => {
        yPos = checkPageBreak(5);
        doc.text(`→ ${obj}`, 32, yPos);
        yPos += 4;
      });
    }
    
    yPos += 8;
  });
  
  // Récapitulatif total
  yPos = checkPageBreak(30);
  yPos += 5;
  
  const recapBoxY = yPos;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(20, recapBoxY, pageWidth - 40, 20, 3, 3, "F");
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(20, recapBoxY, 4, 20, 2, 2, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(`Durée totale : ${totalHeures} heures`, 30, recapBoxY + 9);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  doc.text(`${programme.length} modules de formation`, 30, recapBoxY + 15);
  
  // Modalités
  yPos = recapBoxY + 30;
  yPos = checkPageBreak(35);
  yPos = addSectionTitle(doc, "Modalités pédagogiques et évaluation", yPos);
  yPos += 2;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  doc.text("• Formation en présentiel avec supports pédagogiques remis", 25, yPos);
  yPos += 5;
  doc.text("• Alternance théorie / exercices pratiques / études de cas", 25, yPos);
  yPos += 5;
  doc.text("• QCM d'évaluation continue et examens blancs", 25, yPos);
  yPos += 5;
  doc.text("• Attestation de fin de formation", 25, yPos);
  
  // Sanction de la formation
  yPos += 10;
  yPos = checkPageBreak(25);
  yPos = addSectionTitle(doc, "Sanction de la formation", yPos);
  yPos += 2;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  const sanctionText = formationType === "TAXI-75" 
    ? "Cette formation permet de maintenir sa carte professionnelle de conducteur de taxi sur la zone de Paris (75). Elle répond aux exigences réglementaires de formation continue obligatoire."
    : formationType === "TAXI"
    ? "Cette formation permet de maintenir sa carte professionnelle de conducteur de taxi. Elle répond aux exigences réglementaires de formation continue obligatoire."
    : formationType === "VTC"
    ? "Cette formation permet de maintenir sa carte professionnelle de conducteur VTC. Elle répond aux exigences réglementaires de formation continue obligatoire."
    : formationType === "VMDTR"
    ? "Cette formation permet de maintenir son attestation de capacité professionnelle pour le transport de personnes à mobilité réduite."
    : "Attestation de fin de formation remise à l'issue du stage.";
  
  const sanctionLines = doc.splitTextToSize(sanctionText, pageWidth - 50);
  doc.text(sanctionLines, 25, yPos);
  
  // Footer
  addFooter(doc, pageNumber);
  
  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i < totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i);
  }
  
  return doc;
}

// Helper function
function getFinancementLabel(type: string): string {
  const labels: Record<string, string> = {
    personnel: "Personnel",
    entreprise: "Entreprise",
    cpf: "CPF",
    opco: "OPCO",
  };
  return labels[type] || type;
}

// Export to download
export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
