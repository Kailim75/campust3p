import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ORGANISME,
  PROGRAMME_VTC, 
  PROGRAMME_TAXI, 
  PROGRAMME_VMDTR,
  getPrerequis, 
  getObjectifs,
  type TypeFormation 
} from "@/constants/formations";

// ==================== CHARTE GRAPHIQUE ====================
const COLORS = {
  // Forest Green - Couleur principale
  forestGreen: { r: 27, g: 77, b: 62 },
  forestGreenLight: { r: 42, g: 107, b: 84 },
  forestGreenDark: { r: 20, g: 61, b: 49 },
  // Cream - Fond
  cream: { r: 245, g: 235, b: 215 },
  creamLight: { r: 251, g: 247, b: 239 },
  creamDark: { r: 232, g: 220, b: 196 },
  // Gold - Accent
  gold: { r: 212, g: 168, b: 83 },
  goldLight: { r: 228, g: 190, b: 115 },
  goldDark: { r: 196, g: 152, b: 67 },
  // Warm Gray
  warmGray500: { r: 137, g: 129, b: 114 },
  warmGray600: { r: 107, g: 107, b: 107 },
  warmGray700: { r: 75, g: 70, b: 60 },
  warmGray800: { r: 44, g: 41, b: 34 },
  // Fonctionnelles
  success: { r: 34, g: 197, b: 94 },
  warning: { r: 245, g: 158, b: 11 },
  error: { r: 239, g: 68, b: 68 },
  white: { r: 255, g: 255, b: 255 },
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
export const DEFAULT_COMPANY: CompanyInfo = {
  name: "Formation T3P",
  address: "123 Rue de la Formation, 75001 Paris",
  phone: "01 23 45 67 89",
  email: "contact@formation-t3p.fr",
  siret: "123 456 789 00012",
  nda: "11 75 12345 75",
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

export interface SessionInfo {
  nom: string;
  formation_type: string;
  date_debut: string;
  date_fin: string;
  lieu?: string;
  duree_heures?: number;
  prix?: number;
  prix_ht?: number;
  tva_percent?: number;
  formateur?: string;
  // Nouvelles informations enrichies
  numero_session?: string;
  heure_debut?: string;
  heure_fin?: string;
  adresse_rue?: string;
  adresse_code_postal?: string;
  adresse_ville?: string;
  objectifs?: string;
  prerequis?: string;
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
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const titleWidth = doc.getTextWidth(title) + 30;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - titleWidth) / 2, yPos - 8, titleWidth, 14, 3, 3, "F");
  
  doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
  doc.text(title, pageWidth / 2, yPos, { align: "center" });
  
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
  doc.roundedRect(20, yPos - 4, 3, 14, 1, 1, "F");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(title, 27, yPos + 4);
  
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  doc.setFont("helvetica", "normal");
  return yPos + 14;
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
    const response = await fetch(url);
    if (!response.ok) return null;
    
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
    return null;
  }
}

// Synchronous helper to add stamp image if already cached
function addStampImage(doc: jsPDF, company: CompanyInfo, x: number, y: number, maxWidth: number = 40, maxHeight: number = 25): boolean {
  if (!company.signature_cachet_url) return false;
  
  const cachedImage = imageCache.get(company.signature_cachet_url);
  if (!cachedImage) return false;
  
  try {
    // Add the image to the PDF
    doc.addImage(cachedImage, 'PNG', x, y, maxWidth, maxHeight);
    return true;
  } catch {
    console.error('Error adding stamp image to PDF');
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
  doc.roundedRect(20, yPos, pageWidth - 40, 12, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text("Description", 25, yPos + 8);
  doc.text("Montant HT", pageWidth - 25, yPos + 8, { align: "right" });
  
  // Table content avec fond cream
  yPos += 12;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.rect(20, yPos, pageWidth - 40, 25, "F");
  
  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  
  const description = session 
    ? `Formation: ${session.nom}\nDu ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}\nDurée: ${session.duree_heures || "-"} heures`
    : "Formation professionnelle";
  
  const lines = description.split("\n");
  lines.forEach((line, i) => {
    doc.text(line, 25, yPos + (i * 5));
  });
  
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.setFont("helvetica", "bold");
  doc.text(`${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, pageWidth - 25, yPos, { align: "right" });
  
  // Financement info
  yPos += lines.length * 5 + 12;
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
  company: CompanyInfo = DEFAULT_COMPANY
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const headerEndY = addHeader(doc, company);
  
  // Title avec style
  let yPos = addDocumentTitle(doc, "ATTESTATION DE FORMATION", headerEndY);
  
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
  
  // Formation details box avec style
  yPos += 12;
  const boxHeight = session.lieu ? 60 : 50;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(30, yPos, pageWidth - 60, boxHeight, 4, 4, "F");
  
  // Bordure accent Forest Green
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(30, yPos, 4, boxHeight, 2, 2, "F");
  
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(session.nom, pageWidth / 2, yPos, { align: "center" });
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`Du ${format(new Date(session.date_debut), "dd MMMM yyyy", { locale: fr })} au ${format(new Date(session.date_fin), "dd MMMM yyyy", { locale: fr })}`, pageWidth / 2, yPos, { align: "center" });
  
  yPos += 10;
  doc.text(`Durée : ${session.duree_heures || "-"} heures`, pageWidth / 2, yPos, { align: "center" });
  
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
  
  // Add stamp image if available
  const stampAdded = addStampImage(doc, company, pageWidth - 70, yPos + 5, 40, 25);
  
  yPos += stampAdded ? 35 : 25;
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
  return parts.join(", ") || "À définir";
}

// Helper function to format session hours
function formatSessionHours(session: SessionInfo): string {
  if (session.heure_debut && session.heure_fin) {
    return `${session.heure_debut} - ${session.heure_fin}`;
  }
  return "9h00 - 12h30 / 13h30 - 17h00";
}

// Helper function to calculate TTC price
function calculateTTC(session: SessionInfo): number {
  const prixHT = session.prix_ht || session.prix || 0;
  const tva = session.tva_percent || 0;
  return prixHT * (1 + tva / 100);
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
function getFormationType(sessionName: string): TypeFormation {
  const name = sessionName.toUpperCase();
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
  doc.text(`Représenté par ${ORGANISME.responsablePedagogique.nom}, ${ORGANISME.responsablePedagogique.fonction}`, 25, yPos);
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
  
  yPos += 2;
  const art2BoxHeight = 58;
  addInfoBox(doc, yPos, art2BoxHeight);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`• Intitulé : `, 30, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(session.nom, 55, yPos);
  doc.setFont("helvetica", "normal");
  
  yPos += 6;
  doc.text(`• Type d'action : Action de formation professionnelle continue`, 30, yPos);
  
  yPos += 6;
  doc.text(`• Dates : Du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}`, 30, yPos);
  
  yPos += 6;
  doc.text(`• Durée : ${session.duree_heures || 35} heures`, 30, yPos);
  
  yPos += 6;
  doc.text(`• Horaires : ${formatSessionHours(session)}`, 30, yPos);
  
  yPos += 6;
  doc.text(`• Lieu : ${formatFullAddress(session)}`, 30, yPos);
  
  yPos += 6;
  doc.text(`• Modalités : Formation en présentiel | Effectif max : 12 stagiaires`, 30, yPos);
  
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
  doc.text(`• Responsable pédagogique : ${ORGANISME.responsablePedagogique.nom}`, 25, yPos);
  
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
  
  const prixHT = session.prix_ht || session.prix || 0;
  const tvaPercent = session.tva_percent || 0;
  const prixTTC = calculateTTC(session);
  
  const financeBoxHeight = 42;
  addInfoBox(doc, yPos, financeBoxHeight);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.text("Le coût total de la formation s'élève à :", 30, yPos);
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text(`• Montant HT : ${prixHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 35, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  if (tvaPercent > 0) {
    doc.text(`• TVA (${tvaPercent}%) : ${(prixHT * tvaPercent / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 35, yPos);
    yPos += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`• Montant TTC : ${prixTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 35, yPos);
    doc.setFont("helvetica", "normal");
  } else {
    doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
    doc.text("• TVA non applicable - Article 261.4.4°a du CGI", 35, yPos);
    yPos += 6;
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    doc.setFont("helvetica", "bold");
    doc.text(`• Montant total TTC : ${prixHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 35, yPos);
    doc.setFont("helvetica", "normal");
  }
  
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
  
  // Add stamp image if available
  const stampAdded = addStampImage(doc, company, col1X - 5, yPos + 2, 40, 25);
  
  if (!stampAdded) {
    doc.text("(Cachet et signature)", col1X, yPos);
  }
  
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
    doc.roundedRect((pageWidth - annexeTitleWidth) / 2, yPos - 5, annexeTitleWidth, 12, 3, 3, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
    doc.text(annexeTitle, pageWidth / 2, yPos + 3, { align: "center" });
    
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
      doc.roundedRect(20, yPos - 4, pageWidth - 40, 10, 2, 2, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      doc.text(`${module.titre}`, 25, yPos + 2);
      doc.text(`${module.duree}`, pageWidth - 30, yPos + 2, { align: "right" });
      
      yPos += 12;
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
    doc.roundedRect((pageWidth - annexe2TitleWidth) / 2, yPos - 5, annexe2TitleWidth, 12, 3, 3, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.forestGreenDark.r, COLORS.forestGreenDark.g, COLORS.forestGreenDark.b);
    doc.text(annexe2Title, pageWidth / 2, yPos + 3, { align: "center" });
    
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
  
  const headerEndY = addHeader(doc, company);
  
  // Title
  let yPos = headerEndY + 8;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRAT DE FORMATION PROFESSIONNELLE", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("(Articles L.6353-3 à L.6353-7 du Code du travail)", pageWidth / 2, yPos, { align: "center" });
  
  if (session.numero_session) {
    yPos += 5;
    doc.setTextColor(100);
    doc.text(`Référence : ${session.numero_session}`, pageWidth / 2, yPos, { align: "center" });
    doc.setTextColor(0);
  }
  
  // Parties
  yPos += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNÉS :", 20, yPos);
  
  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  // Organisme
  doc.setFont("helvetica", "bold");
  doc.text("L'organisme de formation :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(`${company.name} - SIRET : ${company.siret}`, 25, yPos);
  yPos += 6;
  const contratOrgAddressLines = doc.splitTextToSize(company.address, pageWidth - 50);
  doc.text(contratOrgAddressLines, 25, yPos);
  yPos += contratOrgAddressLines.length * 6;
  doc.text(`Déclaration d'activité N° ${company.nda} enregistrée auprès du préfet de région`, 25, yPos);
  yPos += 6;
  doc.text(`(Cette déclaration ne vaut pas agrément de l'État)`, 25, yPos);
  yPos += 6;
  doc.text(`Ci-après dénommé "l'Organisme"`, 25, yPos);
  
  // Stagiaire
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Et le stagiaire :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.text(fullName, 25, yPos);
  if (contact.date_naissance) {
    yPos += 4;
    doc.text(`Né(e) le ${format(new Date(contact.date_naissance), "dd/MM/yyyy")}${contact.ville_naissance ? ` à ${contact.ville_naissance}` : ""}`, 25, yPos);
  }
  if (contact.rue) {
    yPos += 4;
    doc.text(contact.rue, 25, yPos);
  }
  if (contact.code_postal || contact.ville) {
    yPos += 4;
    doc.text(`${contact.code_postal || ""} ${contact.ville || ""}`.trim(), 25, yPos);
  }
  if (contact.email) {
    yPos += 4;
    doc.text(`Email : ${contact.email}`, 25, yPos);
  }
  if (contact.telephone) {
    yPos += 4;
    doc.text(`Tél : ${contact.telephone}`, 25, yPos);
  }
  yPos += 4;
  doc.text(`Ci-après dénommé "le Stagiaire"`, 25, yPos);
  
  // Article 1 - Objet
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Article 1 - Objet du contrat", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  const art1 = `Le présent contrat a pour objet la réalisation par l'Organisme, au bénéfice du Stagiaire, de l'action de formation définie ci-après.`;
  const splitArt1 = doc.splitTextToSize(art1, pageWidth - 40);
  doc.text(splitArt1, 20, yPos);
  
  // Article 2 - Nature et caractéristiques (Obligatoire L.6353-4)
  yPos += splitArt1.length * 6 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Article 2 - Nature et caractéristiques de l'action de formation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(`• Intitulé de la formation : ${session.nom}`, 22, yPos);
  yPos += 6;
  const objText = `• Objectif : ${session.objectifs || "Acquisition des compétences professionnelles visées"}`;
  const splitObjText = doc.splitTextToSize(objText, pageWidth - 45);
  doc.text(splitObjText, 22, yPos);
  yPos += splitObjText.length * 6;
  doc.text(`• Dates : Du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}`, 22, yPos);
  yPos += 6;
  doc.text(`• Durée totale : ${session.duree_heures || "-"} heures`, 22, yPos);
  yPos += 6;
  doc.text(`• Horaires : ${formatSessionHours(session)}`, 22, yPos);
  yPos += 6;
  const lieuText = `• Lieu de formation : ${formatFullAddress(session)}`;
  const splitLieuText = doc.splitTextToSize(lieuText, pageWidth - 45);
  doc.text(splitLieuText, 22, yPos);
  yPos += splitLieuText.length * 6;
  doc.text(`• Modalités de déroulement : En présentiel`, 22, yPos);
  
  // Article 3 - Niveau et prérequis
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Article 3 - Niveau requis et public concerné", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  const prerequis = session.prerequis || "Aucun prérequis spécifique n'est demandé pour cette formation.";
  const splitPre = doc.splitTextToSize(prerequis, pageWidth - 40);
  doc.text(splitPre, 20, yPos);
  
  // Page 2
  doc.addPage();
  const page2HeaderEndY = addHeader(doc, company);
  yPos = page2HeaderEndY + 5;
  
  // Article 4 - Prix (Obligatoire L.6353-4)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Article 4 - Prix de la formation et modalités de paiement", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  
  const prixHT2 = session.prix_ht || session.prix || 0;
  const tvaPercent2 = session.tva_percent || 0;
  const prixTTC2 = calculateTTC(session);
  
  doc.text(`Le prix de la formation est fixé à :`, 20, yPos);
  yPos += 6;
  doc.text(`• Prix HT : ${prixHT2.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
  yPos += 6;
  if (tvaPercent2 > 0) {
    doc.text(`• TVA (${tvaPercent2}%) : ${(prixHT2 * tvaPercent2 / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
    yPos += 6;
    doc.text(`• Prix TTC : ${prixTTC2.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
  } else {
    doc.text("• TVA non applicable - Article 261.4.4°a du CGI", 25, yPos);
    yPos += 6;
    doc.text(`• Prix net à payer : ${prixHT2.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
  }
  yPos += 10;
  doc.text("Modalités de règlement : Le paiement s'effectue à la signature du présent contrat,", 20, yPos);
  yPos += 6;
  doc.text("ou selon l'échéancier convenu entre les parties.", 20, yPos);
  
  // Article 5 - Délai de rétractation (Obligatoire L.6353-5)
  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Article 5 - Délai de rétractation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  const art5 = "Conformément à l'article L.6353-5 du Code du travail, le Stagiaire dispose d'un délai de DIX JOURS à compter de la signature du présent contrat pour se rétracter. Cette rétractation doit être notifiée par lettre recommandée avec accusé de réception adressée à l'Organisme. Dans ce cas, aucune somme ne peut être exigée du Stagiaire.";
  const splitArt5 = doc.splitTextToSize(art5, pageWidth - 40);
  doc.text(splitArt5, 20, yPos);
  
  // Article 6 - Paiement anticipé (Obligatoire L.6353-6)
  yPos += splitArt5.length * 6 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Article 6 - Paiement anticipé", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  const art6 = "Conformément à l'article L.6353-6 du Code du travail, aucun paiement ne peut être exigé avant l'expiration du délai de rétractation de 10 jours. À l'issue de ce délai, un acompte maximum de 30% du prix convenu peut être versé.";
  const splitArt6 = doc.splitTextToSize(art6, pageWidth - 40);
  doc.text(splitArt6, 20, yPos);
  
  // Article 7 - Interruption
  yPos += splitArt6.length * 6 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Article 7 - Interruption de la formation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  const art7 = "En cas d'interruption de la formation pour force majeure dûment reconnue (maladie, accident...), le contrat est résilié. Seules les prestations effectivement réalisées sont dues au prorata de leur valeur prévue au contrat.";
  const splitArt7 = doc.splitTextToSize(art7, pageWidth - 40);
  doc.text(splitArt7, 20, yPos);
  
  // Article 8 - Litige
  yPos += splitArt7.length * 6 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Article 8 - Règlement des litiges", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text("En cas de litige, les parties s'engagent à rechercher une solution amiable.", 20, yPos);
  yPos += 6;
  doc.text("À défaut, le litige sera porté devant les juridictions compétentes.", 20, yPos);
  
  // Article 9 - Règlement intérieur
  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Article 9 - Règlement intérieur", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text("Le Stagiaire déclare avoir pris connaissance du règlement intérieur de l'Organisme de formation", 20, yPos);
  yPos += 6;
  doc.text("qui lui a été remis préalablement à la signature du présent contrat.", 20, yPos);
  
  // Signatures
  yPos += 18;
  doc.setFont("helvetica", "bold");
  doc.text(`Fait en double exemplaire, à _____________, le ${format(new Date(), "dd/MM/yyyy")}`, 20, yPos);
  
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.text("Pour l'Organisme de formation", 30, yPos);
  doc.text("Le Stagiaire", pageWidth - 50, yPos);
  
  yPos += 5;
  doc.setFontSize(8);
  
  // Add stamp image if available
  const stampAdded = addStampImage(doc, company, 25, yPos + 2, 40, 25);
  
  if (!stampAdded) {
    doc.text("(Cachet et signature)", 30, yPos);
  }
  doc.text("(Signature précédée de", pageWidth - 50, yPos);
  doc.text("\"Lu et approuvé\")", pageWidth - 50, yPos + 4);
  
  // Mention légale
  yPos += 25;
  doc.setFontSize(7);
  doc.setTextColor(100);
  const mention = "Le présent contrat est conclu conformément aux dispositions des articles L.6353-3 à L.6353-7 du Code du travail.";
  doc.text(mention, 20, yPos);
  doc.setTextColor(0);
  
  addFooter(doc, 2);
  doc.setPage(1);
  addFooter(doc, 1);
  
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
  
  const headerEndY = addHeader(doc, company);
  
  // Title with session reference
  let yPos = headerEndY + 8;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CONVOCATION A LA FORMATION", pageWidth / 2, yPos, { align: "center" });
  
  // Session reference
  if (session.numero_session) {
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Réf. Session : ${session.numero_session}`, pageWidth / 2, yPos, { align: "center" });
    doc.setTextColor(0);
  }
  
  // Destinataire
  yPos += 15;
  yPos = addContactBlock(doc, contact, pageWidth - 80, yPos, "");
  
  // Corps
  yPos = Math.max(yPos, 105);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.text(`${fullName},`, 20, yPos);
  
  yPos += 10;
  const intro = `Nous avons le plaisir de vous confirmer votre inscription à la formation suivante :`;
  doc.text(intro, 20, yPos);
  
  // Formation box - enrichi
  yPos += 15;
  doc.setFillColor(245, 245, 245);
  const boxHeight = session.formateur ? 75 : 65;
  doc.roundedRect(20, yPos, pageWidth - 40, boxHeight, 3, 3, "F");
  
  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(session.nom, pageWidth / 2, yPos, { align: "center" });
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Dates : Du ${format(new Date(session.date_debut), "EEEE dd MMMM yyyy", { locale: fr })} au ${format(new Date(session.date_fin), "EEEE dd MMMM yyyy", { locale: fr })}`, 30, yPos);
  
  yPos += 9;
  doc.text(`Horaires : ${formatSessionHours(session)}`, 30, yPos);
  
  yPos += 9;
  doc.text(`Lieu : ${formatFullAddress(session)}`, 30, yPos);
  
  yPos += 9;
  doc.text(`Durée totale : ${session.duree_heures || "-"} heures`, 30, yPos);
  
  if (session.formateur) {
    yPos += 9;
    doc.text(`Formateur : ${session.formateur}`, 30, yPos);
  }
  
  // Documents à apporter
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Documents à apporter le jour de la formation :", 20, yPos);
  
  yPos += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("• Pièce d'identité en cours de validité", 25, yPos);
  yPos += 7;
  doc.text("• Permis de conduire", 25, yPos);
  yPos += 7;
  doc.text("• Attestation d'inscription (cette convocation)", 25, yPos);
  
  // Prérequis si présents
  if (session.prerequis) {
    yPos += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Prérequis :", 20, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    const prerequisText = doc.splitTextToSize(session.prerequis, pageWidth - 50);
    doc.text(prerequisText, 25, yPos);
    yPos += prerequisText.length * 6;
  }
  
  // Contact
  yPos = Math.min(yPos + 15, 225);
  doc.setFontSize(11);
  doc.text(`Pour toute question, contactez-nous au ${company.phone} ou par email à ${company.email}`, 20, yPos);
  
  // Signature
  yPos += 20;
  doc.text("Cordialement,", 20, yPos);
  yPos += 10;
  
  // Add stamp image if available
  const stampAdded = addStampImage(doc, company, 20, yPos, 35, 22);
  yPos += stampAdded ? 25 : 5;
  
  doc.text("L'equipe Formation", 20, yPos);
  
  addFooter(doc);
  
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
