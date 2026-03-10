// ============================================================
// GÉNÉRATEUR PDF COMPLET POUR CONVENTIONS T3P CAMPUS
// Convention + Règlement Intérieur + CGV avec export ZIP
// ============================================================

import jsPDF from "jspdf";
import JSZip from "jszip";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ORGANISME,
  getProgramme,
  getPrerequis,
  getObjectifs,
  type TypeFormation,
  type Beneficiaire,
  type Formation,
  type ModuleFormation,
} from "@/constants/formations";
import {
  REGLEMENT_INTERIEUR,
  type Article,
  type SousArticle,
} from "@/templates/reglementInterieur";
import {
  CONDITIONS_GENERALES_VENTE,
  type ArticleCGV,
  type SousArticleCGV,
} from "@/templates/conditionsGeneralesVente";

// ==================== IMPORT CHARTE GRAPHIQUE CENTRALISÉE ====================
import { 
  DOCUMENT_COLORS,
  DOCUMENT_FONTS,
  DOCUMENT_LAYOUT,
  loadImageAsBase64 
} from "./document-styles";

// Cache local pour les images (logo, cachet)
const convImageCache: Map<string, string> = new Map();

// Alias pour compatibilité
const COLORS = {
  forestGreen: DOCUMENT_COLORS.forestGreen,
  forestGreenLight: DOCUMENT_COLORS.forestGreenLight,
  cream: DOCUMENT_COLORS.cream,
  creamLight: DOCUMENT_COLORS.creamLight,
  gold: DOCUMENT_COLORS.gold,
  goldDark: DOCUMENT_COLORS.goldDark,
  warmGray600: DOCUMENT_COLORS.warmGray600,
  warmGray700: DOCUMENT_COLORS.warmGray700,
  warmGray800: DOCUMENT_COLORS.warmGray800,
  white: DOCUMENT_COLORS.white,
};

// Interface pour les données dynamiques du centre
export interface ConventionCompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  nda: string;
  qualiopi_numero?: string;
  agrement_prefecture?: string;
  code_rs?: string;
  logo_url?: string;
  signature_cachet_url?: string;
  ville?: string;
  responsable_nom?: string;
  responsable_fonction?: string;
}

// ==================== CONFIGURATION PDF ====================
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 25;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FOOTER_HEIGHT = 15;

// ==================== HELPERS ====================
function formatDateFr(date: Date): string {
  return format(date, "dd MMMM yyyy", { locale: fr });
}

function formatDateShort(date: Date): string {
  return format(date, "dd/MM/yyyy");
}

// Extract ville from address string (e.g. "10 rue X, 92120 Montrouge" -> "Montrouge")
function extractVille(address?: string): string {
  if (!address) return "";
  // Try to match pattern: code_postal VILLE
  const match = address.match(/\d{5}\s+(.+?)(?:,|$)/);
  return match ? match[1].trim() : "";
}

// ==================== HEADER T3P CAMPUS ====================
function addHeader(doc: jsPDF, title: string, company?: ConventionCompanyInfo): number {
  const orgNom = company?.name || ORGANISME.nom;
  const orgAdresse = company?.address || `${ORGANISME.adresse}, ${ORGANISME.codePostal} ${ORGANISME.ville}`;
  const orgTel = company?.phone || ORGANISME.telephone;
  const orgEmail = company?.email || ORGANISME.email;
  const orgSiret = company?.siret || ORGANISME.siret;
  const orgNda = company?.nda || ORGANISME.nda;

  // Build legal info line — skip empty fields
  const legalParts: string[] = [];
  if (orgSiret && !orgSiret.includes("[")) legalParts.push(`SIRET: ${orgSiret}`);
  if (orgNda && !orgNda.includes("[")) legalParts.push(`NDA: ${orgNda}`);
  if (company?.qualiopi_numero) legalParts.push(`Qualiopi: ${company.qualiopi_numero}`);
  if (company?.agrement_prefecture) legalParts.push(`Agrément Préf.: ${company.agrement_prefecture}`);
  if (company?.code_rs) legalParts.push(`RS: ${company.code_rs}`);
  const legalInfo = legalParts.length > 0 ? legalParts.join(" | ") : "";

  // Bandeau vert Forest
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.rect(0, 0, PAGE_WIDTH, 42, "F");

  // Logo (à droite du header)
  if (company?.logo_url) {
    const cachedLogo = convImageCache.get(company.logo_url);
    if (cachedLogo) {
      try {
        doc.addImage(cachedLogo, 'PNG', PAGE_WIDTH - MARGIN_RIGHT - 28, 4, 28, 14);
      } catch { /* ignore */ }
    }
  }

  // Logo/Nom
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text(orgNom, MARGIN_LEFT, 16);

  // Coordonnées
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.text(orgAdresse, MARGIN_LEFT, 24);
  doc.text(`Tél: ${orgTel} | Email: ${orgEmail}`, MARGIN_LEFT, 30);

  // Informations légales (only if not empty)
  if (legalInfo) {
    doc.setFontSize(7);
    doc.text(legalInfo, MARGIN_LEFT, 37);
  }

  // Titre du document (bande dorée)
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.rect(0, 42, PAGE_WIDTH, 12, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(title, PAGE_WIDTH / 2, 50, { align: "center" });

  return 65; // Position Y après header
}

// ==================== FOOTER ====================
function addFooter(doc: jsPDF, pageNum: number, totalPages: number, company?: ConventionCompanyInfo): void {
  const footerY = PAGE_HEIGHT - FOOTER_HEIGHT;
  const orgNom = company?.name || ORGANISME.nom;
  const orgSiret = company?.siret || ORGANISME.siret;

  // Ligne de séparation
  doc.setDrawColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);

  // Texte footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);

  doc.text(`${orgNom} - SIRET: ${orgSiret}`, MARGIN_LEFT, footerY + 6);
  doc.text(`Page ${pageNum}/${totalPages}`, PAGE_WIDTH / 2, footerY + 6, { align: "center" });
  doc.text(`Généré le ${formatDateShort(new Date())}`, PAGE_WIDTH - MARGIN_RIGHT, footerY + 6, { align: "right" });
}

// ==================== CHECK PAGE BREAK ====================
function checkPageBreak(doc: jsPDF, yPos: number, requiredSpace: number): number {
  const maxY = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT;
  if (yPos + requiredSpace > maxY) {
    doc.addPage();
    return MARGIN_TOP + 10;
  }
  return yPos;
}

// ==================== SECTION TITLE ====================
function addSectionTitle(doc: jsPDF, title: string, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 15);

  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 8, 1, 1, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text(title, MARGIN_LEFT + 4, yPos + 5.5);

  return yPos + 14;
}

// ==================== ARTICLE TITLE ====================
function addArticleTitle(doc: jsPDF, numero: number | string, title: string, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(`Article ${numero} - ${title}`, MARGIN_LEFT, yPos);

  // Ligne sous le titre
  doc.setDrawColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, yPos + 2, MARGIN_LEFT + 80, yPos + 2);

  return yPos + 8;
}

// ==================== SOUS-ARTICLE TITLE ====================
function addSousArticleTitle(doc: jsPDF, numero: string, title: string, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 10);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  doc.text(`${numero}. ${title}`, MARGIN_LEFT + 5, yPos);

  return yPos + 6;
}

// ==================== PARAGRAPH ====================
function addParagraph(doc: jsPDF, text: string, yPos: number, indent: number = 0): number {
  yPos = checkPageBreak(doc, yPos, 10);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);

  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent);
  lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 5);
    doc.text(line, MARGIN_LEFT + indent, yPos);
    yPos += 4.5;
  });

  return yPos + 2;
}

// ==================== INFO BOX ====================
function addInfoBox(doc: jsPDF, title: string, lines: string[], yPos: number): number {
  const boxHeight = 8 + lines.length * 5;
  yPos = checkPageBreak(doc, yPos, boxHeight + 5);

  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.setDrawColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_LEFT, yPos, CONTENT_WIDTH, boxHeight, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(title, MARGIN_LEFT + 4, yPos + 5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  let lineY = yPos + 10;
  lines.forEach((line) => {
    doc.text(line, MARGIN_LEFT + 4, lineY);
    lineY += 5;
  });

  return yPos + boxHeight + 6;
}

// ==================== SIGNATURE BLOCK ====================
function addSignatureBlock(doc: jsPDF, yPos: number, formation?: Formation, beneficiaire?: Beneficiaire): number {
  yPos = checkPageBreak(doc, yPos, 50);

  const halfWidth = CONTENT_WIDTH / 2 - 5;

  // Titre section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("SIGNATURES", MARGIN_LEFT, yPos);
  yPos += 8;

  // Box gauche - Organisme
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.setDrawColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(MARGIN_LEFT, yPos, halfWidth, 40, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Pour l'organisme de formation", MARGIN_LEFT + 4, yPos + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(ORGANISME.responsablePedagogique.nom, MARGIN_LEFT + 4, yPos + 12);
  doc.text(ORGANISME.responsablePedagogique.fonction, MARGIN_LEFT + 4, yPos + 17);
  doc.text(`Fait à ${ORGANISME.ville}, le ${formatDateShort(new Date())}`, MARGIN_LEFT + 4, yPos + 24);

  // Box droite - Bénéficiaire
  const rightX = MARGIN_LEFT + halfWidth + 10;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(rightX, yPos, halfWidth, 40, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Pour le stagiaire", rightX + 4, yPos + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  if (beneficiaire) {
    doc.text(`${beneficiaire.civilite} ${beneficiaire.prenom} ${beneficiaire.nom}`, rightX + 4, yPos + 12);
    doc.text("(Signature précédée de la mention", rightX + 4, yPos + 24);
    doc.text("\"Lu et approuvé\")", rightX + 4, yPos + 29);
  } else {
    doc.text("Nom et signature du stagiaire", rightX + 4, yPos + 12);
    doc.text("(Précédée de la mention \"Lu et approuvé\")", rightX + 4, yPos + 17);
  }

  return yPos + 50;
}

// ============================================================
// GÉNÉRATION CONVENTION DE FORMATION
// ============================================================
export function generateConventionPDF(formation: Formation, beneficiaire: Beneficiaire): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let yPos = addHeader(doc, "CONVENTION DE FORMATION PROFESSIONNELLE");
  yPos += 2;

  // Référence légale
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  doc.text("(Articles L.6353-1 à L.6353-2 du Code du travail)", PAGE_WIDTH / 2, yPos, { align: "center" });
  yPos += 8;

  // --- ENTRE LES SOUSSIGNÉS ---
  yPos = addSectionTitle(doc, "ENTRE LES SOUSSIGNÉS", yPos);

  // Organisme
  yPos = addInfoBox(doc, "L'organisme de formation :", [
    `${ORGANISME.raisonSociale} (${ORGANISME.nom})`,
    `Adresse: ${ORGANISME.adresse}, ${ORGANISME.codePostal} ${ORGANISME.ville}`,
    `SIRET: ${ORGANISME.siret} | NDA: ${ORGANISME.nda}`,
    `Représenté par: ${ORGANISME.responsablePedagogique.nom}, ${ORGANISME.responsablePedagogique.fonction}`,
  ], yPos);

  // Bénéficiaire
  yPos = addInfoBox(doc, "Le bénéficiaire :", [
    `${beneficiaire.civilite} ${beneficiaire.prenom} ${beneficiaire.nom}`,
    `Né(e) le: ${formatDateFr(beneficiaire.dateNaissance)}`,
    `Adresse: ${beneficiaire.adresse}, ${beneficiaire.codePostal} ${beneficiaire.ville}`,
    `Tél: ${beneficiaire.telephone} | Email: ${beneficiaire.email}`,
  ], yPos);

  yPos += 4;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  doc.text("IL A ÉTÉ CONVENU CE QUI SUIT :", PAGE_WIDTH / 2, yPos, { align: "center" });
  yPos += 10;

  // --- ARTICLE 1 : OBJET ---
  yPos = addArticleTitle(doc, 1, "OBJET DE LA CONVENTION", yPos);
  yPos = addParagraph(doc, `La présente convention a pour objet de définir les conditions dans lesquelles ${ORGANISME.nom} s'engage à dispenser une formation professionnelle au bénéficiaire.`, yPos);

  // --- ARTICLE 2 : NATURE ET CARACTÉRISTIQUES ---
  yPos = addArticleTitle(doc, 2, "NATURE ET CARACTÉRISTIQUES DE LA FORMATION", yPos);
  yPos = addInfoBox(doc, "Détails de la formation :", [
    `Intitulé: Formation ${formation.type} - ${formation.intitule}`,
    `Type: ${formation.type} | Modalité: ${formation.modalite}`,
    `Dates: du ${formatDateFr(formation.dateDebut)} au ${formatDateFr(formation.dateFin)}`,
    `Durée: ${formation.dureeHeures} heures`,
    `Horaires: ${formation.horaires.matin} / ${formation.horaires.apresMidi}`,
    `Lieu: ${ORGANISME.adresse}, ${ORGANISME.codePostal} ${ORGANISME.ville}`,
  ], yPos);

  // --- ARTICLE 3 : OBJECTIFS PÉDAGOGIQUES ---
  yPos = addArticleTitle(doc, 3, "OBJECTIFS PÉDAGOGIQUES", yPos);
  const objectifs = getObjectifs(formation.type);
  objectifs.forEach((obj, i) => {
    yPos = addParagraph(doc, `${i + 1}. ${obj}`, yPos, 5);
  });

  // --- ARTICLE 4 : PROGRAMME DE FORMATION DÉTAILLÉ ---
  yPos = addArticleTitle(doc, 4, "PROGRAMME DE FORMATION", yPos);
  
  // Introduction avec type de formation
  const typeFormationLabel = formation.type === "VTC" 
    ? "Conducteur de Voiture de Transport avec Chauffeur (VTC)" 
    : formation.type === "TAXI" 
      ? "Conducteur de Taxi" 
      : "Conducteur de Véhicule Motorisé à Deux ou Trois Roues (VMDTR)";
  
  yPos = addParagraph(doc, `Cette formation ${typeFormationLabel} d'une durée totale de ${formation.dureeHeures} heures comprend les modules réglementaires suivants :`, yPos);
  yPos += 4;

  const programme = getProgramme(formation.type);
  
  // Afficher chaque module avec son contenu détaillé
  programme.forEach((module: ModuleFormation) => {
    // Titre du module
    yPos = checkPageBreak(doc, yPos, 25);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.text(`MODULE ${module.numero} : ${module.titre.toUpperCase()} (${module.dureeHeures}h)`, MARGIN_LEFT + 3, yPos);
    yPos += 5;
    
    // Contenu du module (sous-thèmes)
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    
    module.contenu.forEach((item: string) => {
      yPos = checkPageBreak(doc, yPos, 4);
      const bulletText = `  • ${item}`;
      const lines = doc.splitTextToSize(bulletText, CONTENT_WIDTH - 10);
      lines.forEach((line: string) => {
        yPos = checkPageBreak(doc, yPos, 4);
        doc.text(line, MARGIN_LEFT + 5, yPos);
        yPos += 3.5;
      });
    });
    
    yPos += 3;
  });
  
  yPos += 2;

  // --- ARTICLE 5 : PRÉREQUIS ---
  yPos = addArticleTitle(doc, 5, "PRÉREQUIS RÉGLEMENTAIRES", yPos);
  const prerequis = getPrerequis(formation.type);
  prerequis.forEach((prereq) => {
    yPos = addParagraph(doc, `• ${prereq}`, yPos, 5);
  });

  // --- ARTICLE 6 : PUBLIC VISÉ ET ACCESSIBILITÉ ---
  yPos = addArticleTitle(doc, 6, "PUBLIC VISÉ ET ACCESSIBILITÉ", yPos);
  yPos = addParagraph(doc, "Cette formation s'adresse à toute personne souhaitant exercer la profession de conducteur de transport public particulier de personnes.", yPos);
  yPos = addParagraph(doc, `En situation de handicap ? Notre référent handicap (${ORGANISME.referentHandicap.nom} - ${ORGANISME.referentHandicap.telephone}) est à votre disposition pour adapter la formation.`, yPos);

  // --- ARTICLE 7 : MOYENS PÉDAGOGIQUES ---
  yPos = addArticleTitle(doc, 7, "MOYENS PÉDAGOGIQUES ET TECHNIQUES", yPos);
  yPos = addParagraph(doc, "• Salle de formation équipée (vidéoprojecteur, tableau blanc, supports numériques)", yPos, 5);
  yPos = addParagraph(doc, "• Supports de cours remis aux stagiaires (format papier et/ou numérique)", yPos, 5);
  yPos = addParagraph(doc, "• Exercices pratiques, mises en situation et cas concrets", yPos, 5);
  yPos = addParagraph(doc, "• Formateurs qualifiés et expérimentés dans le secteur T3P", yPos, 5);

  // --- ARTICLE 8 : MODALITÉS D'ÉVALUATION ---
  yPos = addArticleTitle(doc, 8, "MODALITÉS D'ÉVALUATION ET DE VALIDATION", yPos);
  yPos = addParagraph(doc, "• Évaluation continue tout au long de la formation (QCM, exercices)", yPos, 5);
  yPos = addParagraph(doc, "• Examen blanc dans les conditions de l'examen officiel", yPos, 5);
  yPos = addParagraph(doc, "• Attestation de fin de formation remise à chaque stagiaire", yPos, 5);
  yPos = addParagraph(doc, "• Présentation à l'examen de la Chambre des Métiers et de l'Artisanat (CMA)", yPos, 5);

  // --- ARTICLE 9 : DISPOSITIONS FINANCIÈRES ---
  yPos = addArticleTitle(doc, 9, "DISPOSITIONS FINANCIÈRES", yPos);
  const prixTTC = formation.tarifHT * 1.2;
  yPos = addInfoBox(doc, "Tarification :", [
    `Prix HT: ${formation.tarifHT.toFixed(2)} €`,
    `TVA (20%): ${(formation.tarifHT * 0.2).toFixed(2)} €`,
    `Prix TTC: ${prixTTC.toFixed(2)} €`,
  ], yPos);
  yPos = addParagraph(doc, "Le règlement s'effectue par virement bancaire, carte bancaire, ou via les dispositifs de financement (CPF, OPCO, etc.).", yPos);

  // --- ARTICLE 10 : DÉLAI DE RÉTRACTATION ---
  yPos = addArticleTitle(doc, 10, "DÉLAI DE RÉTRACTATION", yPos);
  yPos = addParagraph(doc, "Conformément à l'article L.6353-5 du Code du travail, le bénéficiaire dispose d'un délai de 14 jours calendaires à compter de la signature pour se rétracter, par lettre recommandée avec accusé de réception.", yPos);

  // --- ARTICLE 11 : CESSATION ANTICIPÉE ---
  yPos = addArticleTitle(doc, 11, "CAS DE CESSATION ANTICIPÉE", yPos);
  yPos = addParagraph(doc, "En cas de cessation anticipée pour motif légitime (force majeure, maladie justifiée), seules les heures effectivement réalisées seront facturées.", yPos);

  // --- ARTICLE 12 : ASSIDUITÉ ---
  yPos = addArticleTitle(doc, 12, "ASSIDUITÉ ET SANCTIONS DES ABSENCES", yPos);
  yPos = addParagraph(doc, "Le stagiaire s'engage à suivre l'intégralité de la formation et à respecter les horaires. Toute absence non justifiée pourra entraîner l'exclusion de la formation sans remboursement.", yPos);

  // --- ARTICLE 13 : ASSURANCE ET RESPONSABILITÉ ---
  yPos = addArticleTitle(doc, 13, "ASSURANCE ET RESPONSABILITÉ", yPos);
  yPos = addParagraph(doc, `L'organisme de formation a souscrit une assurance responsabilité civile professionnelle auprès de ${ORGANISME.assurance.nom}. Le stagiaire est couvert pendant les heures de formation.`, yPos);

  // --- ARTICLE 14 : PROTECTION DES DONNÉES (RGPD) ---
  yPos = addArticleTitle(doc, 14, "PROTECTION DES DONNÉES PERSONNELLES (RGPD)", yPos);
  yPos = addParagraph(doc, "Les données personnelles collectées sont traitées conformément au RGPD. Le stagiaire dispose d'un droit d'accès, de rectification et de suppression en contactant : " + ORGANISME.email, yPos);

  // --- ARTICLE 15 : RÈGLEMENT INTÉRIEUR ---
  yPos = addArticleTitle(doc, 15, "RÈGLEMENT INTÉRIEUR", yPos);
  yPos = addParagraph(doc, "Le stagiaire déclare avoir pris connaissance du règlement intérieur (Annexe 2) et s'engage à le respecter.", yPos);

  // --- ARTICLE 16 : MÉDIATION ---
  yPos = addArticleTitle(doc, 16, "MÉDIATION ET RÈGLEMENT DES DIFFÉRENDS", yPos);
  yPos = addParagraph(doc, `En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, le médiateur compétent est : ${ORGANISME.mediateur.nom}, ${ORGANISME.mediateur.adresse}, ${ORGANISME.mediateur.codePostal} ${ORGANISME.mediateur.ville} - ${ORGANISME.mediateur.web}`, yPos);

  // --- ARTICLE 17 : MODIFICATION ---
  yPos = addArticleTitle(doc, 17, "MODIFICATION DE LA CONVENTION", yPos);
  yPos = addParagraph(doc, "Toute modification de la présente convention devra faire l'objet d'un avenant signé par les deux parties.", yPos);

  // --- ARTICLE 18 : DOCUMENTS ANNEXES ---
  yPos = addArticleTitle(doc, 18, "DOCUMENTS ANNEXES", yPos);
  yPos = addParagraph(doc, "Font partie intégrante de la présente convention :", yPos);
  yPos = addParagraph(doc, "• Annexe 1 : Programme détaillé de la formation", yPos, 5);
  yPos = addParagraph(doc, "• Annexe 2 : Règlement intérieur", yPos, 5);
  yPos = addParagraph(doc, "• Annexe 3 : Conditions Générales de Vente (CGV)", yPos, 5);

  // --- SIGNATURES ---
  yPos += 10;
  yPos = addSignatureBlock(doc, yPos, formation, beneficiaire);

  // Add footers
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  return doc;
}

// ============================================================
// GÉNÉRATION RÈGLEMENT INTÉRIEUR
// ============================================================
export function generateReglementInterieurPDF(company?: ConventionCompanyInfo): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let yPos = addHeader(doc, REGLEMENT_INTERIEUR.titre, company);
  yPos += 2;

  // Référence légale
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  doc.text(`(${REGLEMENT_INTERIEUR.reference_legale})`, PAGE_WIDTH / 2, yPos, { align: "center" });
  yPos += 5;
  doc.text(`En vigueur à compter du ${REGLEMENT_INTERIEUR.date_application}`, PAGE_WIDTH / 2, yPos, { align: "center" });
  yPos += 10;

  // Préambule
  yPos = addSectionTitle(doc, "PRÉAMBULE", yPos);
  REGLEMENT_INTERIEUR.preambule.forEach((para) => {
    yPos = addParagraph(doc, para, yPos);
  });
  yPos += 5;

  // Articles
  REGLEMENT_INTERIEUR.articles.forEach((article: Article) => {
    yPos = addArticleTitle(doc, article.numero, article.titre, yPos);

    if (article.contenu) {
      article.contenu.forEach((para) => {
        yPos = addParagraph(doc, para, yPos);
      });
    }

    if (article.sous_articles) {
      article.sous_articles.forEach((sousArticle: SousArticle) => {
        yPos = addSousArticleTitle(doc, sousArticle.numero, sousArticle.titre, yPos);
        sousArticle.contenu.forEach((para) => {
          yPos = addParagraph(doc, para, yPos, 5);
        });
      });
    }

    yPos += 3;
  });

  // Signature
  yPos += 10;
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  const ville = company?.ville || extractVille(company?.address) || ORGANISME.ville;
  doc.text(`Fait à ${ville}, le ${formatDateShort(new Date())}`, MARGIN_LEFT, yPos);
  yPos += 10;
  doc.setFont("helvetica", "bold");
  const sigNom = company?.responsable_nom || REGLEMENT_INTERIEUR.signataire.nom;
  const sigFonction = company?.responsable_fonction || REGLEMENT_INTERIEUR.signataire.fonction;
  doc.text(sigNom, MARGIN_LEFT, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.text(sigFonction, MARGIN_LEFT, yPos);

  // Add footers
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, company);
  }

  return doc;
}

// ============================================================
// GÉNÉRATION CONDITIONS GÉNÉRALES DE VENTE
// ============================================================
export function generateCGVPDF(company?: ConventionCompanyInfo): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let yPos = addHeader(doc, CONDITIONS_GENERALES_VENTE.titre, company);
  yPos += 2;

  // Version
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  doc.text(`Version du ${CONDITIONS_GENERALES_VENTE.version}`, PAGE_WIDTH / 2, yPos, { align: "center" });
  yPos += 10;

  // Articles
  CONDITIONS_GENERALES_VENTE.articles.forEach((article: ArticleCGV) => {
    yPos = addArticleTitle(doc, article.numero, article.titre, yPos);

    if (article.contenu) {
      article.contenu.forEach((para) => {
        if (para.trim()) {
          yPos = addParagraph(doc, para, yPos);
        }
      });
    }

    if (article.sous_articles) {
      article.sous_articles.forEach((sousArticle: SousArticleCGV) => {
        yPos = addSousArticleTitle(doc, sousArticle.numero, sousArticle.titre, yPos);
        sousArticle.contenu.forEach((para) => {
          if (para.trim()) {
            yPos = addParagraph(doc, para, yPos, 5);
          }
        });
      });
    }

    yPos += 3;
  });

  // Signature
  yPos += 10;
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  const ville = company?.ville || extractVille(company?.address) || ORGANISME.ville;
  doc.text(`Fait à ${ville}, le ${formatDateShort(new Date())}`, MARGIN_LEFT, yPos);
  yPos += 10;
  doc.setFont("helvetica", "bold");
  const sigNom = company?.responsable_nom || CONDITIONS_GENERALES_VENTE.signataire.nom;
  const sigFonction = company?.responsable_fonction || CONDITIONS_GENERALES_VENTE.signataire.fonction;
  doc.text(sigNom, MARGIN_LEFT, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.text(sigFonction, MARGIN_LEFT, yPos);

  // Add footers
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, company);
  }

  return doc;
}

// ============================================================
// Preload images for convention documents
export async function preloadConventionImages(company?: ConventionCompanyInfo): Promise<void> {
  const promises: Promise<string | null>[] = [];
  if (company?.logo_url) {
    promises.push(
      loadImageAsBase64(company.logo_url).then(b64 => {
        if (b64) convImageCache.set(company.logo_url!, b64);
        return b64;
      })
    );
  }
  if (company?.signature_cachet_url) {
    promises.push(
      loadImageAsBase64(company.signature_cachet_url).then(b64 => {
        if (b64) convImageCache.set(company.signature_cachet_url!, b64);
        return b64;
      })
    );
  }
  await Promise.all(promises);
}

// ============================================================
// GÉNÉRATION ZIP AVEC LES 3 DOCUMENTS
// ============================================================
export async function generateConventionZIP(
  formation: Formation,
  beneficiaire: Beneficiaire
): Promise<Blob> {
  const zip = new JSZip();

  // Générer les 3 PDFs
  const conventionPDF = generateConventionPDF(formation, beneficiaire);
  const reglementPDF = generateReglementInterieurPDF();
  const cgvPDF = generateCGVPDF();

  // Nom de fichier base
  const nomComplet = `${beneficiaire.nom}_${beneficiaire.prenom}`.replace(/\s+/g, "_");
  const dateStr = formatDateShort(formation.dateDebut).replace(/\//g, "-");

  // Ajouter les PDFs au ZIP
  zip.file(`Convention_${nomComplet}_${dateStr}.pdf`, conventionPDF.output("blob"));
  zip.file(`Reglement_Interieur_T3P_CAMPUS.pdf`, reglementPDF.output("blob"));
  zip.file(`CGV_T3P_CAMPUS.pdf`, cgvPDF.output("blob"));

  // Générer le ZIP
  return await zip.generateAsync({ type: "blob" });
}

// ============================================================
// UTILITAIRE DE TÉLÉCHARGEMENT
// ============================================================
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}
