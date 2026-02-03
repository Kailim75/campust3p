// ============================================================
// GÉNÉRATEUR PDF D'ATTESTATIONS - CONFORME CHARTE GRAPHIQUE T3P
// Attestations de fin de formation avec format normalisé
// ============================================================

import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DOCUMENT_COLORS,
  DOCUMENT_FONTS,
  DOCUMENT_LAYOUT,
  type OrganismeInfo,
  addDocumentHeader,
  addDocumentFooter,
  addDocumentTitle,
  addInfoBox,
  addSignatureBlock,
  addLegalMentions,
  checkPageBreak,
  formatDateFr,
  formatDateShort,
  preloadOrganismeImages,
} from "./document-styles";

// ==================== TYPES ====================
export interface AttestationData {
  // Stagiaire
  civilite: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  paysNaissance?: string;
  
  // Formation
  intituleFormation: string;
  typeFormation: string;
  dateDebut?: string;
  dateFin?: string;
  dureeHeures: number;
  modulesContenus?: string;
  
  // Émission
  dateEmission: string;
  numeroCertificat: string;
}

// ==================== HELPER FUNCTIONS ====================
function addAttestationSection(
  doc: jsPDF,
  title: string,
  yPos: number
): number {
  yPos = checkPageBreak(doc, yPos, 20);
  
  doc.setFontSize(DOCUMENT_FONTS.sizes.subheading);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.forestGreen.r,
    DOCUMENT_COLORS.forestGreen.g,
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.text(title, DOCUMENT_LAYOUT.marginLeft, yPos);
  
  // Ligne décorative sous le titre
  doc.setDrawColor(
    DOCUMENT_COLORS.gold.r,
    DOCUMENT_COLORS.gold.g,
    DOCUMENT_COLORS.gold.b
  );
  doc.setLineWidth(0.5);
  doc.line(
    DOCUMENT_LAYOUT.marginLeft,
    yPos + 2,
    DOCUMENT_LAYOUT.marginLeft + 60,
    yPos + 2
  );
  
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray800.r,
    DOCUMENT_COLORS.warmGray800.g,
    DOCUMENT_COLORS.warmGray800.b
  );
  
  return yPos + DOCUMENT_LAYOUT.spacing.xl;
}

function addLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number
): number {
  doc.setFontSize(DOCUMENT_FONTS.sizes.small);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray600.r,
    DOCUMENT_COLORS.warmGray600.g,
    DOCUMENT_COLORS.warmGray600.b
  );
  doc.text(`${label} :`, x, y);
  
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray800.r,
    DOCUMENT_COLORS.warmGray800.g,
    DOCUMENT_COLORS.warmGray800.b
  );
  doc.text(value, x + 40, y);
  
  return y + 6;
}

// ==================== MAIN GENERATOR ====================
export async function generateAttestationPDF(
  data: AttestationData,
  organisme: OrganismeInfo
): Promise<jsPDF> {
  // Précharger les images
  await preloadOrganismeImages(organisme);
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header avec identité organisme
  let yPos = addDocumentHeader(doc, organisme);
  
  // Titre du document avec badge doré
  yPos = addDocumentTitle(doc, "ATTESTATION DE FIN DE FORMATION", yPos, {
    subtitle: "Article L.6353-1 du Code du travail",
    reference: data.numeroCertificat,
  });
  
  yPos += DOCUMENT_LAYOUT.spacing.lg;
  
  // Section STAGIAIRE
  yPos = addAttestationSection(doc, "BÉNÉFICIAIRE DE LA FORMATION", yPos);
  
  // Box avec informations stagiaire
  const stagiaireBoxHeight = 35;
  addInfoBox(doc, yPos, stagiaireBoxHeight);
  
  let innerY = yPos + DOCUMENT_LAYOUT.spacing.lg;
  
  // Nom complet en gras
  doc.setFontSize(DOCUMENT_FONTS.sizes.heading);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.forestGreen.r,
    DOCUMENT_COLORS.forestGreen.g,
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.text(
    `${data.civilite} ${data.prenom} ${data.nom}`.toUpperCase(),
    DOCUMENT_LAYOUT.marginLeft + 10,
    innerY
  );
  innerY += 8;
  
  // Date et lieu de naissance
  if (data.dateNaissance) {
    doc.setFontSize(DOCUMENT_FONTS.sizes.small);
    doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
    doc.setTextColor(
      DOCUMENT_COLORS.warmGray700.r,
      DOCUMENT_COLORS.warmGray700.g,
      DOCUMENT_COLORS.warmGray700.b
    );
    
    const dateNaissance = formatDateFr(data.dateNaissance);
    const lieu = data.lieuNaissance || "";
    const pays = data.paysNaissance || "France";
    
    doc.text(
      `Né(e) le ${dateNaissance}${lieu ? ` à ${lieu}` : ""}${pays !== "France" ? ` (${pays})` : ""}`,
      DOCUMENT_LAYOUT.marginLeft + 10,
      innerY
    );
  }
  
  yPos += stagiaireBoxHeight + DOCUMENT_LAYOUT.spacing.xl;
  
  // Section FORMATION
  yPos = addAttestationSection(doc, "FORMATION SUIVIE", yPos);
  
  // Box avec détails formation
  const formationBoxHeight = 50;
  addInfoBox(doc, yPos, formationBoxHeight);
  
  innerY = yPos + DOCUMENT_LAYOUT.spacing.lg;
  
  // Intitulé de la formation
  doc.setFontSize(DOCUMENT_FONTS.sizes.heading);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.forestGreen.r,
    DOCUMENT_COLORS.forestGreen.g,
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.text(data.intituleFormation, DOCUMENT_LAYOUT.marginLeft + 10, innerY);
  innerY += 10;
  
  // Détails en deux colonnes
  doc.setFontSize(DOCUMENT_FONTS.sizes.small);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray700.r,
    DOCUMENT_COLORS.warmGray700.g,
    DOCUMENT_COLORS.warmGray700.b
  );
  
  // Dates
  if (data.dateDebut && data.dateFin) {
    const dateDebut = formatDateShort(data.dateDebut);
    const dateFin = formatDateShort(data.dateFin);
    
    doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
    doc.text("Période :", DOCUMENT_LAYOUT.marginLeft + 10, innerY);
    doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
    doc.text(`du ${dateDebut} au ${dateFin}`, DOCUMENT_LAYOUT.marginLeft + 35, innerY);
    innerY += 6;
  }
  
  // Durée
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.text("Durée :", DOCUMENT_LAYOUT.marginLeft + 10, innerY);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.text(`${data.dureeHeures} heures`, DOCUMENT_LAYOUT.marginLeft + 35, innerY);
  
  // Type de formation à droite
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.text("Type :", pageWidth / 2 + 10, innerY);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.text(data.typeFormation, pageWidth / 2 + 30, innerY);
  
  yPos += formationBoxHeight + DOCUMENT_LAYOUT.spacing.xl;
  
  // Section MODULES (si présent)
  if (data.modulesContenus) {
    yPos = addAttestationSection(doc, "CONTENU PÉDAGOGIQUE", yPos);
    
    const modules = data.modulesContenus.split("\n").filter(m => m.trim());
    const moduleBoxHeight = Math.min(modules.length * 5 + 10, 60);
    
    addInfoBox(doc, yPos, moduleBoxHeight, { withGoldAccent: false });
    
    innerY = yPos + DOCUMENT_LAYOUT.spacing.md;
    doc.setFontSize(DOCUMENT_FONTS.sizes.tiny);
    doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
    doc.setTextColor(
      DOCUMENT_COLORS.warmGray700.r,
      DOCUMENT_COLORS.warmGray700.g,
      DOCUMENT_COLORS.warmGray700.b
    );
    
    modules.forEach((module, index) => {
      if (innerY < yPos + moduleBoxHeight - 5) {
        doc.text(`• ${module.trim()}`, DOCUMENT_LAYOUT.marginLeft + 8, innerY);
        innerY += 5;
      }
    });
    
    yPos += moduleBoxHeight + DOCUMENT_LAYOUT.spacing.lg;
  }
  
  // Section ATTESTATION
  yPos = checkPageBreak(doc, yPos, 50);
  
  // Texte d'attestation formel
  doc.setFontSize(DOCUMENT_FONTS.sizes.body);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.normal);
  doc.setTextColor(
    DOCUMENT_COLORS.warmGray800.r,
    DOCUMENT_COLORS.warmGray800.g,
    DOCUMENT_COLORS.warmGray800.b
  );
  
  const attestationText = `Je soussigné(e), ${organisme.responsableLegal?.nom || "le responsable"}, ${organisme.responsableLegal?.fonction || "représentant(e)"} de ${organisme.nomCommercial || organisme.nom}, atteste que le/la stagiaire mentionné(e) ci-dessus a suivi l'intégralité de la formation indiquée et a satisfait aux évaluations prévues.`;
  
  const textLines = doc.splitTextToSize(attestationText, DOCUMENT_LAYOUT.contentWidth);
  textLines.forEach((line: string) => {
    doc.text(line, DOCUMENT_LAYOUT.marginLeft, yPos);
    yPos += 5;
  });
  
  yPos += DOCUMENT_LAYOUT.spacing.xl;
  
  // Date d'émission centrée
  const dateEmission = formatDateFr(data.dateEmission);
  doc.setFont(DOCUMENT_FONTS.primary, DOCUMENT_FONTS.weights.bold);
  doc.setTextColor(
    DOCUMENT_COLORS.forestGreen.r,
    DOCUMENT_COLORS.forestGreen.g,
    DOCUMENT_COLORS.forestGreen.b
  );
  doc.text(
    `Fait à ${organisme.ville || "Paris"}, le ${dateEmission}`,
    pageWidth / 2,
    yPos,
    { align: "center" }
  );
  
  yPos += DOCUMENT_LAYOUT.spacing.xxl;
  
  // Bloc signature
  yPos = addSignatureBlock(doc, yPos, organisme, {
    civilite: data.civilite,
    prenom: data.prenom,
    nom: data.nom,
  });
  
  // Mentions légales en bas de page
  yPos = checkPageBreak(doc, yPos, 30);
  yPos = addLegalMentions(doc, yPos, organisme);
  
  // Footer sur toutes les pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addDocumentFooter(doc, i, totalPages, organisme);
  }
  
  return doc;
}

/**
 * Génère et télécharge directement le PDF d'attestation
 */
export async function downloadAttestationPDF(
  data: AttestationData,
  organisme: OrganismeInfo,
  filename?: string
): Promise<void> {
  const doc = await generateAttestationPDF(data, organisme);
  const fileName = filename || `attestation_${data.numeroCertificat}.pdf`;
  doc.save(fileName);
}

/**
 * Génère le PDF et retourne un Blob pour preview
 */
export async function getAttestationPDFBlob(
  data: AttestationData,
  organisme: OrganismeInfo
): Promise<Blob> {
  const doc = await generateAttestationPDF(data, organisme);
  return doc.output("blob");
}

/**
 * Génère le PDF et retourne une URL blob pour iframe
 */
export async function getAttestationPDFUrl(
  data: AttestationData,
  organisme: OrganismeInfo
): Promise<string> {
  const blob = await getAttestationPDFBlob(data, organisme);
  return URL.createObjectURL(blob);
}
