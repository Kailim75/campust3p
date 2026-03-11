// ═══════════════════════════════════════════════════════════════
// Convention de Formation Professionnelle — PDF Generator
// Art. L6353-1 et L6353-2 du Code du travail
// Acheteur / Employeur / Financeur distinct du stagiaire
// ═══════════════════════════════════════════════════════════════

import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DOCUMENT_COLORS, DOCUMENT_FONTS } from "../document-styles";
import type { ContactInfo, SessionInfo, CompanyInfo } from "../pdf-generator";
import { ORGANISME, getObjectifs, getPrerequis } from "@/constants/formations";
import type { TypeFormation } from "@/constants/formations";

const C = DOCUMENT_COLORS;

function setColor(doc: jsPDF, color: { r: number; g: number; b: number }) {
  doc.setTextColor(color.r, color.g, color.b);
}

function setFill(doc: jsPDF, color: { r: number; g: number; b: number }) {
  doc.setFillColor(color.r, color.g, color.b);
}

interface ConvCtx {
  doc: jsPDF;
  company: CompanyInfo;
  contact: ContactInfo;
  session: SessionInfo;
  pageWidth: number;
  pageHeight: number;
  mL: number;
  mR: number;
  cW: number;
  bottomMargin: number;
  lineH: number;
  pageNum: number;
  yPos: number;
}

function checkPageBreak(ctx: ConvCtx, needed: number): void {
  if (ctx.yPos + needed > ctx.pageHeight - ctx.bottomMargin) {
    addFooter(ctx);
    ctx.doc.addPage();
    ctx.pageNum++;
    ctx.yPos = addHeader(ctx) + 5;
  }
}

function addHeader(ctx: ConvCtx): number {
  const { doc, company, pageWidth, mL, mR } = ctx;

  // Build refs list to compute dynamic height
  const refs: string[] = [];
  if (company.siret && !company.siret.includes("[")) refs.push(`SIRET ${company.siret}`);
  if (company.nda && !company.nda.includes("[") && company.nda.trim()) refs.push(`NDA ${company.nda}`);
  if (company.code_rs) refs.push(`RS ${company.code_rs}`);
  if (company.code_rncp) refs.push(`RNCP ${company.code_rncp}`);
  if (company.agrement_prefecture) refs.push(`Agrément Préf. ${company.agrement_prefecture}`);
  if (company.agrements_autres && company.agrements_autres.length > 0) {
    company.agrements_autres.forEach(a => {
      if (a.nom && a.numero) refs.push(`${a.nom}: ${a.numero}`);
    });
  }
  const totalRefLines = refs.length + (company.qualiopi_numero ? 1 : 0);
  const headerH = Math.max(32, 13 + totalRefLines * 4 + 4);

  setFill(doc, C.forestGreen);
  doc.rect(0, 0, pageWidth, headerH, "F");
  setFill(doc, C.gold);
  doc.rect(0, headerH, pageWidth, 1.5, "F");

  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  doc.setFontSize(14);
  setColor(doc, C.white);
  doc.text(company.name, mL, 13);

  doc.setFontSize(7.5);
  doc.setFont(DOCUMENT_FONTS.primary, "normal");
  doc.setTextColor(210, 225, 215);
  doc.text(company.address, mL, 20);

  const contactLine: string[] = [];
  if (company.phone) contactLine.push(company.phone);
  if (company.email) contactLine.push(company.email);
  if (contactLine.length > 0) doc.text(contactLine.join(" • "), mL, 26);

  if (refs.length > 0) {
    doc.setFontSize(6.5);
    doc.setTextColor(170, 195, 175);
    refs.forEach((r, i) => doc.text(r, pageWidth - mR, 13 + i * 4, { align: "right" }));
  }
  if (company.qualiopi_numero) {
    doc.setFontSize(6);
    doc.setTextColor(C.gold.r, C.gold.g, C.gold.b);
    doc.text("Certifié Qualiopi", pageWidth - mR, 13 + refs.length * 4, { align: "right" });
  }

  setColor(doc, C.warmGray800);
  return headerH + 6;
}

function addFooter(ctx: ConvCtx): void {
  const { doc, pageWidth, pageHeight, mL, mR, pageNum } = ctx;
  setFill(doc, C.gold);
  doc.rect(mL, pageHeight - 22, pageWidth - mL - mR, 0.5, "F");
  doc.setFontSize(6.5);
  setColor(doc, C.warmGray500);
  doc.text(`Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`, mL, pageHeight - 16);
  doc.text(`Page ${pageNum}`, pageWidth - mR, pageHeight - 16, { align: "right" });
  setColor(doc, C.warmGray800);
}

function writeArticle(ctx: ConvCtx, title: string): void {
  ctx.yPos += 8;
  checkPageBreak(ctx, 22);
  setFill(ctx.doc, C.forestGreen);
  ctx.doc.roundedRect(ctx.mL, ctx.yPos - 2, 3, 14, 1, 1, "F");
  ctx.doc.setFont(DOCUMENT_FONTS.primary, "bold");
  ctx.doc.setFontSize(9.5);
  setColor(ctx.doc, C.forestGreen);
  ctx.doc.text(title, ctx.mL + 8, ctx.yPos + 5);
  setColor(ctx.doc, C.warmGray800);
  ctx.doc.setFont(DOCUMENT_FONTS.primary, "normal");
  ctx.yPos += 16;
}

function writeParagraph(ctx: ConvCtx, text: string, indent: number = 0): void {
  ctx.doc.setFontSize(9);
  ctx.doc.setFont(DOCUMENT_FONTS.primary, "normal");
  setColor(ctx.doc, C.warmGray700);
  const lines = ctx.doc.splitTextToSize(text, ctx.cW - indent) as string[];
  for (const line of lines) {
    checkPageBreak(ctx, ctx.lineH + 1);
    ctx.doc.text(line, ctx.mL + indent, ctx.yPos);
    ctx.yPos += ctx.lineH;
  }
  ctx.yPos += 2;
  setColor(ctx.doc, C.warmGray800);
}

function writeBullet(ctx: ConvCtx, text: string): void {
  ctx.doc.setFontSize(9);
  setColor(ctx.doc, C.warmGray700);
  const lines = ctx.doc.splitTextToSize(`• ${text}`, ctx.cW - 10) as string[];
  for (let i = 0; i < lines.length; i++) {
    checkPageBreak(ctx, ctx.lineH + 1);
    ctx.doc.text(lines[i], ctx.mL + (i === 0 ? 5 : 10), ctx.yPos);
    ctx.yPos += ctx.lineH;
  }
  ctx.yPos += 1;
  setColor(ctx.doc, C.warmGray800);
}

function drawInfoBox(ctx: ConvCtx, items: Array<{ label: string; value: string }>): void {
  const visibleItems = items.filter(i => i.value.trim() !== "");
  if (visibleItems.length === 0) return;
  const boxH = visibleItems.length * (ctx.lineH + 1) + 14;
  checkPageBreak(ctx, boxH + 6);
  setFill(ctx.doc, C.creamLight);
  ctx.doc.roundedRect(ctx.mL, ctx.yPos, ctx.cW, boxH, 3, 3, "F");
  setFill(ctx.doc, C.forestGreen);
  ctx.doc.roundedRect(ctx.mL, ctx.yPos, 3, boxH, 1, 1, "F");
  let y = ctx.yPos + 8;
  ctx.doc.setFontSize(9);
  for (const item of visibleItems) {
    ctx.doc.setFont(DOCUMENT_FONTS.primary, "bold");
    setColor(ctx.doc, C.forestGreen);
    ctx.doc.text(`${item.label} :`, ctx.mL + 8, y);
    const labelW = ctx.doc.getTextWidth(`${item.label} : `);
    ctx.doc.setFont(DOCUMENT_FONTS.primary, "normal");
    setColor(ctx.doc, C.warmGray700);
    const valueLines = ctx.doc.splitTextToSize(item.value, ctx.cW - 18 - labelW) as string[];
    ctx.doc.text(valueLines[0] || "", ctx.mL + 8 + labelW, y);
    y += ctx.lineH + 1;
    for (let i = 1; i < valueLines.length; i++) {
      ctx.doc.text(valueLines[i], ctx.mL + 8 + labelW, y);
      y += ctx.lineH;
    }
  }
  setColor(ctx.doc, C.warmGray800);
  ctx.yPos += boxH + 6;
}

// ── Helpers ──

function isValidTime(t?: string): t is string {
  return !!t && t !== "00:00:00" && t !== "00:00";
}
function formatTime(t: string): string { const [h, m] = t.split(":"); return `${h}h${m}`; }

function formatSessionHours(s: SessionInfo): string {
  if (isValidTime(s.heure_debut_matin) && isValidTime(s.heure_fin_matin) && isValidTime(s.heure_debut_aprem) && isValidTime(s.heure_fin_aprem))
    return `${formatTime(s.heure_debut_matin)} - ${formatTime(s.heure_fin_matin)} / ${formatTime(s.heure_debut_aprem)} - ${formatTime(s.heure_fin_aprem)}`;
  if (isValidTime(s.heure_debut) && isValidTime(s.heure_fin))
    return `${formatTime(s.heure_debut)} - ${formatTime(s.heure_fin)}`;
  return "";
}

function formatAddress(s: SessionInfo): string {
  const parts: string[] = [];
  if (s.adresse_rue) parts.push(s.adresse_rue);
  if (s.adresse_code_postal || s.adresse_ville) parts.push(`${s.adresse_code_postal || ""} ${s.adresse_ville || ""}`.trim());
  if (parts.length === 0 && s.lieu) return s.lieu;
  return parts.join(", ");
}

function getPrice(s: SessionInfo): number { return s.prix_ht || s.prix || 0; }

function getFormationType(name: string): TypeFormation {
  const n = name.toUpperCase();
  if (n.includes("TAXI 75") || n.includes("TAXI-75") || n.includes("PARIS")) return "TAXI-75";
  if (n.includes("VMDTR")) return "VMDTR";
  if (n.includes("VTC")) return "VTC";
  if (n.includes("TAXI")) return "TAXI";
  return "VTC";
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════

export function generateConventionFormationV2(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo
): jsPDF {
  const doc = new jsPDF();
  const ctx: ConvCtx = {
    doc, company, contact, session,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    mL: 20, mR: 20,
    cW: doc.internal.pageSize.getWidth() - 40,
    bottomMargin: 32, lineH: 5.2, pageNum: 1, yPos: 0,
  };

  ctx.yPos = addHeader(ctx);
  const prix = getPrice(session);
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  const formationType = getFormationType(session.nom);

  // ═══ TITRE ═══
  ctx.yPos += 4;
  doc.setFontSize(13);
  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  const titleText = "CONVENTION DE FORMATION PROFESSIONNELLE";
  const titleW = doc.getTextWidth(titleText) + 24;
  setFill(doc, C.gold);
  doc.roundedRect((ctx.pageWidth - titleW) / 2, ctx.yPos - 7, titleW, 14, 3, 3, "F");
  setColor(doc, C.forestGreenDark);
  doc.text(titleText, ctx.pageWidth / 2, ctx.yPos, { align: "center" });

  ctx.yPos += 6;
  doc.setFontSize(7.5);
  doc.setFont(DOCUMENT_FONTS.primary, "normal");
  setColor(doc, C.warmGray500);
  doc.text("Articles L.6353-1 à L.6353-2 du Code du travail", ctx.pageWidth / 2, ctx.yPos, { align: "center" });

  if (session.numero_session) {
    ctx.yPos += 4;
    doc.setFontSize(8);
    setColor(doc, C.forestGreenLight);
    doc.text(`Réf : ${session.numero_session}`, ctx.pageWidth / 2, ctx.yPos, { align: "center" });
  }
  setColor(doc, C.warmGray800);

  // ═══ PARTIES ═══
  ctx.yPos += 8;
  doc.setFontSize(9.5);
  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  setColor(doc, C.forestGreen);
  doc.text("ENTRE LES SOUSSIGNÉS :", ctx.mL, ctx.yPos);
  ctx.yPos += 6;

  // Box Organisme
  const orgLines: string[] = [company.name];
  if (company.siret && !company.siret.includes("[")) orgLines.push(`SIRET : ${company.siret}`);
  orgLines.push(company.address);
  if (company.nda && !company.nda.includes("[") && company.nda.trim()) orgLines.push(`Déclaration d'activité N° ${company.nda}`);
  const orgBoxH = orgLines.length * ctx.lineH + 14;

  setFill(doc, C.creamLight);
  doc.roundedRect(ctx.mL, ctx.yPos, ctx.cW, orgBoxH, 3, 3, "F");
  setFill(doc, C.gold);
  doc.roundedRect(ctx.mL, ctx.yPos, 3, orgBoxH, 1, 1, "F");

  let orgY = ctx.yPos + 6;
  doc.setFontSize(8);
  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  setColor(doc, C.forestGreen);
  doc.text("L'organisme de formation :", ctx.mL + 8, orgY);
  orgY += ctx.lineH + 2;
  doc.setFont(DOCUMENT_FONTS.primary, "normal");
  setColor(doc, C.warmGray700);
  for (const line of orgLines) { doc.text(line, ctx.mL + 8, orgY); orgY += ctx.lineH; }
  doc.setFontSize(7);
  setColor(doc, C.warmGray500);
  doc.text("(ne vaut pas agrément de l'État) — Ci-après dénommé « l'Organisme »", ctx.mL + 8, orgY);
  ctx.yPos += orgBoxH + 4;

  // Box Bénéficiaire (distinct du Stagiaire: c'est le financeur/employeur dans une convention)
  const stagParts: string[] = [fullName];
  if (contact.date_naissance) {
    stagParts.push(`Né(e) le ${format(new Date(contact.date_naissance), "dd MMMM yyyy", { locale: fr })}${contact.ville_naissance ? ` à ${contact.ville_naissance}` : ""}`);
  }
  if (contact.rue) stagParts.push(contact.rue);
  if (contact.code_postal || contact.ville) stagParts.push(`${contact.code_postal || ""} ${contact.ville || ""}`.trim());
  if (contact.email) stagParts.push(`Email : ${contact.email}`);
  if (contact.telephone) stagParts.push(`Tél : ${contact.telephone}`);
  const stagBoxH = stagParts.length * ctx.lineH + 14;

  setFill(doc, C.creamLight);
  doc.roundedRect(ctx.mL, ctx.yPos, ctx.cW, stagBoxH, 3, 3, "F");
  setFill(doc, C.forestGreen);
  doc.roundedRect(ctx.mL, ctx.yPos, 3, stagBoxH, 1, 1, "F");

  let stagY = ctx.yPos + 6;
  doc.setFontSize(8);
  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  setColor(doc, C.forestGreen);
  doc.text("Le Bénéficiaire :", ctx.mL + 8, stagY);
  stagY += ctx.lineH + 2;
  for (let i = 0; i < stagParts.length; i++) {
    doc.setFont(DOCUMENT_FONTS.primary, i === 0 ? "bold" : "normal");
    setColor(doc, i === 0 ? C.warmGray800 : C.warmGray700);
    doc.text(stagParts[i], ctx.mL + 8, stagY);
    stagY += ctx.lineH;
  }
  doc.setFontSize(7);
  setColor(doc, C.warmGray500);
  doc.text("Ci-après dénommé « le Bénéficiaire »", ctx.mL + 8, stagY);
  setColor(doc, C.warmGray800);
  ctx.yPos += stagBoxH + 3;

  // ═══ ARTICLES ═══

  // Article 1 — Objet
  writeArticle(ctx, "Article 1 — Objet de la convention");
  writeParagraph(ctx, `La présente convention est établie conformément aux articles L.6353-1 et suivants du Code du travail. L'Organisme s'engage à organiser l'action de formation intitulée "${session.nom}". Cette formation entre dans le cadre des actions de formation au sens de l'article L.6313-1 du Code du travail.`);

  // Article 2 — Nature et caractéristiques
  writeArticle(ctx, "Article 2 — Nature et caractéristiques de l'action");
  const art2Items: Array<{ label: string; value: string }> = [
    { label: "Intitulé", value: session.nom },
    { label: "Type d'action", value: "Action de formation professionnelle continue" },
    { label: "Dates", value: `Du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}` },
  ];
  if (session.duree_heures) art2Items.push({ label: "Durée", value: `${session.duree_heures} heures` });
  const hours = formatSessionHours(session);
  if (hours) art2Items.push({ label: "Horaires", value: hours });
  const addr = formatAddress(session);
  if (addr) art2Items.push({ label: "Lieu", value: addr });
  art2Items.push({ label: "Modalité", value: "En présentiel | Effectif max : 12 stagiaires" });
  drawInfoBox(ctx, art2Items);

  // Article 3 — Objectifs
  writeArticle(ctx, "Article 3 — Objectifs pédagogiques");
  writeParagraph(ctx, "À l'issue de la formation, le stagiaire sera capable de :");
  ctx.yPos += 2;
  const objectifs = getObjectifs(formationType);
  objectifs.forEach((obj, i) => {
    writeBullet(ctx, `${i + 1}. ${obj}`);
  });
  ctx.yPos += 2;
  ctx.doc.setFontSize(7.5);
  ctx.doc.setFont(DOCUMENT_FONTS.primary, "italic");
  setColor(ctx.doc, C.warmGray500);
  checkPageBreak(ctx, 6);
  ctx.doc.text(`Cette formation prépare à l'examen ${formationType} organisé par la CMA.`, ctx.mL, ctx.yPos);
  ctx.doc.setFont(DOCUMENT_FONTS.primary, "normal");
  ctx.yPos += ctx.lineH + 2;

  // Article 4 — Programme
  writeArticle(ctx, "Article 4 — Programme de formation");
  writeParagraph(ctx, "Le programme détaillé de la formation figure en ANNEXE 1 de la présente convention.");

  // Article 5 — Prérequis
  writeArticle(ctx, "Article 5 — Prérequis");
  writeParagraph(ctx, "Pour s'inscrire à cette formation, le candidat doit satisfaire aux conditions suivantes :");
  const prerequis = getPrerequis(formationType);
  prerequis.forEach((p, i) => writeBullet(ctx, `${i + 1}. ${p}`));

  // Article 6 — Public et accessibilité
  writeArticle(ctx, "Article 6 — Public visé et accessibilité");
  writeParagraph(ctx, `Public : Toute personne répondant aux prérequis et souhaitant exercer l'activité de conducteur ${formationType}.`);
  ctx.yPos += 2;
  writeParagraph(ctx, `Accessibilité handicap : Notre référent handicap est à votre disposition au ${company.phone || ORGANISME.referentHandicap.telephone} ou ${company.email} pour étudier les adaptations nécessaires. Nos locaux sont accessibles aux PMR.`);
  writeParagraph(ctx, "Délai d'accès : Inscription possible jusqu'à 3 jours ouvrés avant le début de la formation.");

  // Article 7 — Moyens pédagogiques
  writeArticle(ctx, "Article 7 — Moyens pédagogiques et techniques");
  writeParagraph(ctx, "La formation est dispensée en présentiel. Les moyens mis en œuvre comprennent :");
  writeBullet(ctx, "Formateurs qualifiés et expérimentés dans le transport de personnes");
  writeBullet(ctx, "Salle de formation équipée (vidéoprojecteur, tableau interactif)");
  writeBullet(ctx, "Supports de cours (papier et/ou numérique)");
  writeBullet(ctx, "Plateforme e-learning pour révisions");
  writeBullet(ctx, "QCM d'entraînement et simulations d'examen blanc");

  // Article 8 — Évaluation
  writeArticle(ctx, "Article 8 — Modalités d'évaluation et de validation");
  writeParagraph(ctx, "Évaluation continue : QCM de contrôle des connaissances, exercices pratiques notés.");
  writeParagraph(ctx, "Évaluation finale : Examen blanc dans les conditions réelles de l'examen CMA.");
  writeParagraph(ctx, "Validation : Attestation de fin de formation mentionnant les compétences acquises, attestation d'assiduité, questionnaire de satisfaction.");

  // Article 9 — Dispositions financières
  writeArticle(ctx, "Article 9 — Dispositions financières");

  if (prix > 0) {
    checkPageBreak(ctx, 20);
    const priceBoxH = 16;
    setFill(doc, { r: 255, g: 251, b: 240 });
    doc.roundedRect(ctx.mL, ctx.yPos, ctx.cW, priceBoxH, 3, 3, "F");
    setFill(doc, C.gold);
    doc.roundedRect(ctx.mL, ctx.yPos, 3, priceBoxH, 1, 1, "F");

    doc.setFontSize(9.5);
    doc.setFont(DOCUMENT_FONTS.primary, "bold");
    setColor(doc, C.forestGreenDark);
    doc.text(`Coût total : ${prix.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, ctx.mL + 8, ctx.yPos + 7);
    doc.setFontSize(7.5);
    doc.setFont(DOCUMENT_FONTS.primary, "normal");
    setColor(doc, C.warmGray600);
    doc.text("TVA non applicable — art. 293 B du CGI", ctx.mL + 8, ctx.yPos + 12);
    ctx.yPos += priceBoxH + 3;

    writeParagraph(ctx, "Ce tarif comprend : formation, supports de cours, accès e-learning, attestation.");
    writeParagraph(ctx, "Ce tarif ne comprend pas : frais d'inscription CMA, déplacements et hébergement éventuels.");
  } else {
    writeParagraph(ctx, "La présente formation est dispensée à titre gratuit dans le cadre du financement accordé.");
  }

  // Article 10 — Rétractation
  writeArticle(ctx, "Article 10 — Délai de rétractation");
  writeParagraph(ctx, `Conformément à l'article L.6353-5 du Code du travail, le Bénéficiaire dispose d'un délai de DIX (10) JOURS à compter de la signature de la présente convention pour se rétracter par lettre recommandée avec accusé de réception adressée à ${company.name}, ${company.address}. En cas de rétractation dans ce délai, les sommes versées sont intégralement remboursées dans un délai de 30 jours.`);

  // Article 11 — Cessation anticipée
  writeArticle(ctx, "Article 11 — Cessation anticipée");
  writeParagraph(ctx, "En cas d'abandon sans motif légitime : heures effectuées au prorata.");
  writeParagraph(ctx, "Motifs légitimes (maladie, force majeure, décès d'un proche) : réinscription sans frais sur session ultérieure.");
  writeParagraph(ctx, "Cessation du fait de l'organisme : remboursement au prorata des heures non effectuées.");

  // Article 12 — Assiduité
  writeArticle(ctx, "Article 12 — Assiduité et sanctions");
  writeParagraph(ctx, "La présence à l'intégralité de la formation est obligatoire pour obtenir l'attestation et être autorisé à se présenter à l'examen CMA.");
  writeParagraph(ctx, "Toute absence supérieure à 4h non justifiée entraîne la non-délivrance de l'attestation.");

  // Article 13 — Assurance
  writeArticle(ctx, "Article 13 — Assurance et responsabilité");
  writeParagraph(ctx, "Le Bénéficiaire déclare être couvert par une assurance responsabilité civile. L'Organisme est assuré pour sa responsabilité civile professionnelle.");

  // Article 14 — RGPD
  writeArticle(ctx, "Article 14 — Protection des données personnelles (RGPD)");
  writeParagraph(ctx, `Conformément au RGPD et à la loi Informatique et Libertés, le Bénéficiaire dispose d'un droit d'accès, de rectification, d'opposition et de suppression des données le concernant. Les données sont utilisées uniquement pour la gestion administrative et les obligations légales (DREETS, Qualiopi). Conservation : 3 ans. Contact : ${company.email}`);

  // Article 15 — Règlement intérieur
  writeArticle(ctx, "Article 15 — Règlement intérieur");
  writeParagraph(ctx, "Le Bénéficiaire déclare avoir pris connaissance du règlement intérieur de l'Organisme annexé à la présente convention (ANNEXE 2) et s'engage à le respecter.");

  // Article 16 — Médiation et litiges
  writeArticle(ctx, "Article 16 — Médiation et règlement des différends");
  writeParagraph(ctx, "En cas de litige, les parties s'engagent à rechercher une solution amiable.");
  writeParagraph(ctx, `Médiation : ${ORGANISME.mediateur.nom} — ${ORGANISME.mediateur.adresse}, ${ORGANISME.mediateur.codePostal} ${ORGANISME.mediateur.ville} — ${ORGANISME.mediateur.web}`, 4);
  writeParagraph(ctx, "À défaut d'accord amiable, le litige sera porté devant les tribunaux compétents.");

  // Article 17 — Modification
  writeArticle(ctx, "Article 17 — Modification de la convention");
  writeParagraph(ctx, "Toute modification de la présente convention fera l'objet d'un avenant signé par les deux parties.");

  // Article 18 — Documents annexes
  writeArticle(ctx, "Article 18 — Documents annexes");
  writeParagraph(ctx, "Sont annexés à la présente convention :");
  writeBullet(ctx, "ANNEXE 1 : Programme détaillé de la formation");
  writeBullet(ctx, "ANNEXE 2 : Règlement intérieur de l'organisme de formation");
  writeBullet(ctx, "ANNEXE 3 : Conditions générales de vente");

  // ═══ SIGNATURES ═══
  ctx.yPos += 10;
  checkPageBreak(ctx, 60);

  setFill(doc, C.gold);
  doc.rect(ctx.mL, ctx.yPos, ctx.cW, 0.5, "F");
  ctx.yPos += 8;

  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  doc.setFontSize(9);
  setColor(doc, C.warmGray800);
  doc.text(`Fait en double exemplaire original, le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, ctx.mL, ctx.yPos);
  ctx.yPos += 10;

  const halfW = (ctx.cW - 10) / 2;
  const sigBoxH = 42;

  // Box gauche - Organisme
  setFill(doc, C.creamLight);
  doc.setDrawColor(C.forestGreen.r, C.forestGreen.g, C.forestGreen.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(ctx.mL, ctx.yPos, halfW, sigBoxH, 2, 2, "FD");

  doc.setFontSize(7.5);
  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  setColor(doc, C.forestGreen);
  doc.text("Pour l'Organisme de formation", ctx.mL + 5, ctx.yPos + 7);
  doc.setFont(DOCUMENT_FONTS.primary, "normal");
  setColor(doc, C.warmGray600);
  doc.text(company.name, ctx.mL + 5, ctx.yPos + 13);
  doc.text("(Cachet et signature)", ctx.mL + 5, ctx.yPos + 19);

  // Box droite - Bénéficiaire
  const rightX = ctx.mL + halfW + 10;
  setFill(doc, C.creamLight);
  doc.roundedRect(rightX, ctx.yPos, halfW, sigBoxH, 2, 2, "FD");

  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  setColor(doc, C.forestGreen);
  doc.text("Le Bénéficiaire", rightX + 5, ctx.yPos + 7);
  doc.setFont(DOCUMENT_FONTS.primary, "normal");
  setColor(doc, C.warmGray700);
  doc.text(fullName, rightX + 5, ctx.yPos + 13);
  doc.setFontSize(6.5);
  setColor(doc, C.warmGray500);
  doc.text("(Signature précédée de la mention", rightX + 5, ctx.yPos + 26);
  doc.text("\"Lu et approuvé, bon pour accord\")", rightX + 5, ctx.yPos + 30);

  ctx.yPos += sigBoxH + 8;

  checkPageBreak(ctx, 8);
  doc.setFontSize(6.5);
  setColor(doc, C.warmGray500);
  doc.text("Convention conclue conformément aux articles L.6353-1 et L.6353-2 du Code du travail.", ctx.mL, ctx.yPos);
  setColor(doc, C.warmGray800);

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    ctx.pageNum = i;
    addFooter(ctx);
  }

  return doc;
}
