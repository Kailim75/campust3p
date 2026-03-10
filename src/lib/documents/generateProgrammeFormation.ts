// ═══════════════════════════════════════════════════════════════
// Générateur PDF — Programme de Formation (version enrichie)
// Architecture : tronc commun + données par filière
// ═══════════════════════════════════════════════════════════════

import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getProgramme,
  getPrerequis,
  getObjectifs,
  type TypeFormation,
  type ModuleFormation,
} from "@/constants/formations";
import {
  getPublicVise,
  getCompetencesVisees,
  getModalitesPedagogiques,
  getMoyensPedagogiques,
  getSuiviEvaluation,
  getEncadrement,
  getAccessibilite,
  getSanction,
  getReferencesReglementaires,
  getIntituleComplet,
} from "@/constants/programmesPedagogiques";
import { DOCUMENT_COLORS, DOCUMENT_FONTS } from "@/lib/document-styles";
import type { CompanyInfo, SessionInfo } from "@/lib/pdf-generator";

// ─── Aliases ────────────────────────────────────────────────────
const C = DOCUMENT_COLORS;
const F = DOCUMENT_FONTS;

// ─── Helpers internes ───────────────────────────────────────────

/** Detect formation type from session name / type */
function resolveFormationType(sessionName: string, formationType?: string): TypeFormation {
  const raw = (formationType || sessionName || "").toUpperCase();
  if (raw.includes("VMDTR") || raw.includes("MOTO")) return "VMDTR";
  if (raw.includes("TAXI") && (raw.includes("75") || raw.includes("PARIS"))) return "TAXI-75";
  if (raw.includes("TAXI")) return "TAXI";
  return "VTC";
}

function formatFullAddress(session: SessionInfo): string {
  const parts = [session.adresse_rue, session.adresse_code_postal, session.adresse_ville].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : session.lieu || "En présentiel";
}




// ─── PDF Drawing Primitives ─────────────────────────────────────

interface PdfContext {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  contentWidth: number;
  bottomMargin: number;
  yPos: number;
  pageNumber: number;
  company: CompanyInfo;
}

function createContext(doc: jsPDF, company: CompanyInfo): PdfContext {
  return {
    doc,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    marginLeft: 20,
    marginRight: 20,
    contentWidth: doc.internal.pageSize.getWidth() - 40,
    bottomMargin: 30,
    yPos: 0,
    pageNumber: 1,
    company,
  };
}

function checkPageBreak(ctx: PdfContext, neededSpace: number): void {
  if (ctx.yPos + neededSpace > ctx.pageHeight - ctx.bottomMargin) {
    drawFooter(ctx);
    ctx.doc.addPage();
    ctx.pageNumber++;
    ctx.yPos = drawHeader(ctx) + 5;
  }
}

function drawHeader(ctx: PdfContext): number {
  const { doc, pageWidth, company } = ctx;

  // Build accreditations
  const accredParts: string[] = [];
  accredParts.push(`SIRET: ${company.siret}`);
  accredParts.push(`NDA: ${company.nda}`);
  if (company.qualiopi_numero) accredParts.push(`Qualiopi: ${company.qualiopi_numero}`);
  const accredLine = accredParts.join(" | ");

  const accredParts2: string[] = [];
  if (company.code_rncp) accredParts2.push(`RNCP: ${company.code_rncp}`);
  if (company.code_rs) accredParts2.push(`RS: ${company.code_rs}`);
  if (company.agrement_prefecture) accredParts2.push(`Agrément Préf.: ${company.agrement_prefecture}`);

  doc.setFont(F.primary, "normal");
  doc.setFontSize(6.5);
  const allAccred = [accredLine];
  if (accredParts2.length > 0) allAccred.push(accredParts2.join(" | "));

  const wrappedLines: string[] = [];
  allAccred.forEach(l => {
    const wrapped = doc.splitTextToSize(l, pageWidth - 40) as string[];
    wrapped.forEach(w => wrappedLines.push(w));
  });

  const accredStartY = 30;
  const lineStep = 6;
  const accredBottomY = wrappedLines.length > 0 ? accredStartY + wrappedLines.length * lineStep : accredStartY;
  const headerHeight = Math.max(38, accredBottomY + 4);

  // Forest Green band
  doc.setFillColor(C.forestGreen.r, C.forestGreen.g, C.forestGreen.b);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Company name
  doc.setFontSize(16);
  doc.setFont(F.primary, "bold");
  doc.setTextColor(C.white.r, C.white.g, C.white.b);
  doc.text(company.name, 20, 14);

  // Contact line
  doc.setFontSize(7);
  doc.setFont(F.primary, "normal");
  doc.setTextColor(C.creamLight.r, C.creamLight.g, C.creamLight.b);
  doc.text(`${company.address} | Tél: ${company.phone} | ${company.email}`, 20, 22);

  // Accreditations
  doc.setFontSize(6.5);
  let yAcc = accredStartY;
  wrappedLines.forEach(l => {
    doc.text(l, 20, yAcc);
    yAcc += lineStep;
  });

  // Gold accent line
  doc.setFillColor(C.gold.r, C.gold.g, C.gold.b);
  doc.rect(0, headerHeight, pageWidth, 2, "F");

  // Reset
  doc.setTextColor(C.warmGray800.r, C.warmGray800.g, C.warmGray800.b);

  return headerHeight + 8;
}

function drawFooter(ctx: PdfContext): void {
  const { doc, pageWidth, pageHeight, pageNumber } = ctx;

  doc.setFillColor(C.gold.r, C.gold.g, C.gold.b);
  doc.rect(20, pageHeight - 25, pageWidth - 40, 1, "F");

  doc.setFontSize(7);
  doc.setTextColor(C.warmGray500.r, C.warmGray500.g, C.warmGray500.b);
  doc.text(`Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`, 20, pageHeight - 18);

  doc.setFillColor(C.forestGreen.r, C.forestGreen.g, C.forestGreen.b);
  doc.roundedRect(pageWidth - 35, pageHeight - 22, 20, 12, 2, 2, "F");
  doc.setTextColor(C.white.r, C.white.g, C.white.b);
  doc.setFontSize(9);
  doc.text(`${pageNumber}`, pageWidth - 25, pageHeight - 14, { align: "center" });

  doc.setTextColor(C.warmGray800.r, C.warmGray800.g, C.warmGray800.b);
}

function drawSectionTitle(ctx: PdfContext, title: string): void {
  checkPageBreak(ctx, 22);
  const { doc } = ctx;

  // Vertical accent bar
  doc.setFillColor(C.forestGreen.r, C.forestGreen.g, C.forestGreen.b);
  doc.roundedRect(20, ctx.yPos - 2, 3, 16, 1, 1, "F");

  doc.setFontSize(11);
  doc.setFont(F.primary, "bold");
  doc.setTextColor(C.forestGreen.r, C.forestGreen.g, C.forestGreen.b);
  doc.text(title, 27, ctx.yPos + 6);

  doc.setTextColor(C.warmGray800.r, C.warmGray800.g, C.warmGray800.b);
  doc.setFont(F.primary, "normal");
  ctx.yPos += 18;
}

function drawBulletList(ctx: PdfContext, items: string[], indent: number = 25, fontSize: number = 9.5): void {
  const { doc, pageWidth } = ctx;
  doc.setFontSize(fontSize);
  doc.setFont(F.primary, "normal");
  doc.setTextColor(C.warmGray700.r, C.warmGray700.g, C.warmGray700.b);

  items.forEach(item => {
    checkPageBreak(ctx, 8);
    const lines = doc.splitTextToSize(`• ${item}`, pageWidth - indent - 22) as string[];
    doc.text(lines, indent, ctx.yPos);
    ctx.yPos += lines.length * 4.8;
  });
}

function drawNumberedList(ctx: PdfContext, items: string[], indent: number = 25, fontSize: number = 9.5): void {
  const { doc, pageWidth } = ctx;
  doc.setFontSize(fontSize);
  doc.setFont(F.primary, "normal");
  doc.setTextColor(C.warmGray700.r, C.warmGray700.g, C.warmGray700.b);

  items.forEach((item, i) => {
    checkPageBreak(ctx, 8);
    const lines = doc.splitTextToSize(`${i + 1}. ${item}`, pageWidth - indent - 22) as string[];
    doc.text(lines, indent, ctx.yPos);
    ctx.yPos += lines.length * 4.8;
  });
}

function drawInfoBox(ctx: PdfContext, height: number): void {
  const { doc, pageWidth } = ctx;
  doc.setFillColor(C.creamLight.r, C.creamLight.g, C.creamLight.b);
  doc.roundedRect(20, ctx.yPos, pageWidth - 40, height, 4, 4, "F");
  doc.setFillColor(C.gold.r, C.gold.g, C.gold.b);
  doc.roundedRect(20, ctx.yPos, 4, height, 2, 2, "F");
}

// ─── Main Generator ─────────────────────────────────────────────

export function generateProgrammeFormationPDF(
  session: SessionInfo,
  company: CompanyInfo,
): jsPDF {
  const doc = new jsPDF();
  const ctx = createContext(doc, company);

  const formationType = resolveFormationType(session.nom, session.formation_type);
  const programme = getProgramme(formationType);
  const objectifs = getObjectifs(formationType);
  const prerequis = getPrerequis(formationType);
  const publicVise = getPublicVise(formationType);
  const competences = getCompetencesVisees(formationType);
  const modalites = getModalitesPedagogiques();
  const moyens = getMoyensPedagogiques();
  const suivi = getSuiviEvaluation();
  const encadrement = getEncadrement();
  const accessibilite = getAccessibilite();
  const sanction = getSanction(formationType);
  const references = getReferencesReglementaires(formationType);
  const intituleComplet = getIntituleComplet(formationType);

  const totalHeures = programme.reduce((sum, m) => sum + m.dureeHeures, 0);

  // ──── PAGE 1 : Header ────
  ctx.yPos = drawHeader(ctx);

  // ──── Title badge ────
  ctx.yPos += 3;
  doc.setFontSize(13);
  doc.setFont(F.primary, "bold");
  const titleText = "PROGRAMME DE FORMATION";
  const titleWidth = doc.getTextWidth(titleText) + 30;
  doc.setFillColor(C.gold.r, C.gold.g, C.gold.b);
  doc.roundedRect((ctx.pageWidth - titleWidth) / 2, ctx.yPos - 8, titleWidth, 16, 3, 3, "F");
  doc.setTextColor(C.forestGreenDark.r, C.forestGreenDark.g, C.forestGreenDark.b);
  doc.text(titleText, ctx.pageWidth / 2, ctx.yPos + 1, { align: "center" });
  ctx.yPos += 12;

  // Subtitle: intitulé complet
  doc.setFontSize(10);
  doc.setFont(F.primary, "bold");
  doc.setTextColor(C.forestGreen.r, C.forestGreen.g, C.forestGreen.b);
  const subtitleLines = doc.splitTextToSize(intituleComplet, ctx.contentWidth - 20) as string[];
  subtitleLines.forEach(line => {
    doc.text(line, ctx.pageWidth / 2, ctx.yPos, { align: "center" });
    ctx.yPos += 5;
  });
  ctx.yPos += 3;

  // ──── Info box: identification de l'action ────
  const infoBoxHeight = 38;
  drawInfoBox(ctx, infoBoxHeight);
  const infoStartY = ctx.yPos + 8;

  doc.setFontSize(10);
  doc.setFont(F.primary, "normal");
  doc.setTextColor(C.warmGray700.r, C.warmGray700.g, C.warmGray700.b);

  const infoLines = [
    `Durée totale : ${totalHeures} heures`,
    `Dates : Du ${format(new Date(session.date_debut), "dd MMMM yyyy", { locale: fr })} au ${format(new Date(session.date_fin), "dd MMMM yyyy", { locale: fr })}`,
    `Lieu : ${formatFullAddress(session)}`,
    `Modalité : Présentiel | ${programme.length} modules`,
  ];

  let infoY = infoStartY;
  infoLines.forEach((line, i) => {
    if (i === 0) {
      doc.setFont(F.primary, "bold");
      doc.setTextColor(C.forestGreen.r, C.forestGreen.g, C.forestGreen.b);
    } else {
      doc.setFont(F.primary, "normal");
      doc.setTextColor(C.warmGray700.r, C.warmGray700.g, C.warmGray700.b);
    }
    doc.text(line, 30, infoY);
    infoY += 7;
  });

  ctx.yPos += infoBoxHeight + 8;

  // ──── Références réglementaires (compact) ────
  if (references.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont(F.primary, "italic");
    doc.setTextColor(C.warmGray500.r, C.warmGray500.g, C.warmGray500.b);
    references.forEach(ref => {
      checkPageBreak(ctx, 5);
      const refLines = doc.splitTextToSize(ref, ctx.contentWidth - 10) as string[];
      doc.text(refLines, 25, ctx.yPos);
      ctx.yPos += refLines.length * 3.8;
    });
    ctx.yPos += 5;
  }

  // ──── Public visé ────
  drawSectionTitle(ctx, "Public visé");
  drawBulletList(ctx, publicVise);
  ctx.yPos += 5;

  // ──── Prérequis ────
  drawSectionTitle(ctx, "Prérequis");
  drawBulletList(ctx, prerequis);
  ctx.yPos += 5;

  // ──── Objectifs pédagogiques ────
  drawSectionTitle(ctx, "Objectifs pédagogiques");
  drawNumberedList(ctx, objectifs);
  ctx.yPos += 5;

  // ──── Compétences visées ────
  drawSectionTitle(ctx, "Compétences visées");
  drawBulletList(ctx, competences);
  ctx.yPos += 5;

  // ──── Programme détaillé (modules) ────
  drawSectionTitle(ctx, "Programme détaillé");
  ctx.yPos += 2;

  programme.forEach((mod) => {
    checkPageBreak(ctx, 35);

    // Module header bar
    doc.setFillColor(C.forestGreen.r, C.forestGreen.g, C.forestGreen.b);
    doc.roundedRect(20, ctx.yPos - 4, ctx.contentWidth, 13, 2, 2, "F");

    doc.setFont(F.primary, "bold");
    doc.setFontSize(10);
    doc.setTextColor(C.white.r, C.white.g, C.white.b);
    doc.text(`Module ${mod.numero} — ${mod.titre}`, 25, ctx.yPos + 3);

    // Duration badge on right
    const durText = `${mod.dureeHeures}h`;
    const durW = doc.getTextWidth(durText) + 8;
    doc.setFillColor(C.gold.r, C.gold.g, C.gold.b);
    doc.roundedRect(ctx.pageWidth - 20 - durW - 2, ctx.yPos - 3, durW, 10, 2, 2, "F");
    doc.setTextColor(C.forestGreenDark.r, C.forestGreenDark.g, C.forestGreenDark.b);
    doc.setFontSize(9);
    doc.text(durText, ctx.pageWidth - 20 - durW / 2 - 2, ctx.yPos + 3, { align: "center" });

    ctx.yPos += 14;

    // Module content
    doc.setFont(F.primary, "normal");
    doc.setFontSize(9);
    doc.setTextColor(C.warmGray700.r, C.warmGray700.g, C.warmGray700.b);

    mod.contenu.forEach(item => {
      checkPageBreak(ctx, 6);
      const itemLines = doc.splitTextToSize(`• ${item}`, ctx.pageWidth - 55) as string[];
      doc.text(itemLines, 28, ctx.yPos);
      ctx.yPos += itemLines.length * 4.5;
    });

    // Module objectives
    if (mod.objectifs && mod.objectifs.length > 0) {
      ctx.yPos += 2;
      doc.setFont(F.primary, "italic");
      doc.setFontSize(8);
      doc.setTextColor(C.forestGreenLight.r, C.forestGreenLight.g, C.forestGreenLight.b);
      doc.text("Objectifs du module :", 28, ctx.yPos);
      ctx.yPos += 4;
      doc.setTextColor(C.warmGray600.r, C.warmGray600.g, C.warmGray600.b);
      mod.objectifs.forEach(obj => {
        checkPageBreak(ctx, 5);
        doc.text(`→ ${obj}`, 32, ctx.yPos);
        ctx.yPos += 4;
      });
    }

    ctx.yPos += 7;
  });

  // ──── Récapitulatif ────
  checkPageBreak(ctx, 25);
  ctx.yPos += 3;
  const recapY = ctx.yPos;
  doc.setFillColor(C.creamLight.r, C.creamLight.g, C.creamLight.b);
  doc.roundedRect(20, recapY, ctx.contentWidth, 20, 3, 3, "F");
  doc.setFillColor(C.gold.r, C.gold.g, C.gold.b);
  doc.roundedRect(20, recapY, 4, 20, 2, 2, "F");

  doc.setFont(F.primary, "bold");
  doc.setFontSize(11);
  doc.setTextColor(C.forestGreen.r, C.forestGreen.g, C.forestGreen.b);
  doc.text(`Durée totale : ${totalHeures} heures`, 30, recapY + 9);
  doc.setFont(F.primary, "normal");
  doc.setFontSize(9);
  doc.setTextColor(C.warmGray600.r, C.warmGray600.g, C.warmGray600.b);
  doc.text(`${programme.length} modules de formation | Modalité : Présentiel`, 30, recapY + 15);
  ctx.yPos = recapY + 28;

  // ──── Modalités pédagogiques ────
  drawSectionTitle(ctx, "Modalités pédagogiques");
  drawBulletList(ctx, modalites);
  ctx.yPos += 5;

  // ──── Moyens pédagogiques et techniques ────
  drawSectionTitle(ctx, "Moyens pédagogiques et techniques");
  drawBulletList(ctx, moyens);
  ctx.yPos += 5;

  // ──── Suivi et évaluation ────
  drawSectionTitle(ctx, "Suivi et évaluation");
  drawBulletList(ctx, suivi);
  ctx.yPos += 5;

  // ──── Encadrement ────
  drawSectionTitle(ctx, "Encadrement");
  drawBulletList(ctx, encadrement);
  ctx.yPos += 5;

  // ──── Accessibilité ────
  drawSectionTitle(ctx, "Accessibilité");
  drawBulletList(ctx, accessibilite);
  ctx.yPos += 5;

  // ──── Sanction / Documents remis ────
  drawSectionTitle(ctx, "Sanction de la formation — Documents remis");
  drawBulletList(ctx, sanction);

  // ──── Footer on all pages ────
  drawFooter(ctx);
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i < totalPages; i++) {
    doc.setPage(i);
    drawFooter({ ...ctx, pageNumber: i });
  }
  // Reset to last page
  doc.setPage(totalPages);

  return doc;
}

/**
 * Standalone version (without session context) — used from catalogue
 */
export function generateProgrammeStandalonePDFv2(
  formationType: TypeFormation,
  company: CompanyInfo,
): jsPDF {
  // Build a minimal session to reuse the main generator
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);

  const mockSession: SessionInfo = {
    nom: getIntituleComplet(formationType),
    formation_type: formationType,
    date_debut: now.toISOString(),
    date_fin: end.toISOString(),
    lieu: "En présentiel",
  };

  return generateProgrammeFormationPDF(mockSession, company);
}
