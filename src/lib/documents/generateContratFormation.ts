// ═══════════════════════════════════════════════════════════════
// Contrat de Formation Professionnelle — PDF Generator V2
// Art. L6353-3 à L6353-7 du Code du travail
// Personne physique finançant elle-même sa formation
// ═══════════════════════════════════════════════════════════════

import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DOCUMENT_COLORS, DOCUMENT_FONTS } from "../document-styles";
import type { ContactInfo, SessionInfo, CompanyInfo } from "../pdf-generator";
import { ORGANISME } from "@/constants/formations";

const C = DOCUMENT_COLORS;

// ── Validation pré-génération ──────────────────────────────────

export interface ContratValidationError {
  field: string;
  message: string;
  severity: "blocking" | "warning";
}

/**
 * Valide les données obligatoires avant génération du contrat.
 * Retourne un tableau d'erreurs. Si au moins une erreur est "blocking",
 * la génération doit être interdite.
 */
export function validateContratData(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo
): ContratValidationError[] {
  const errors: ContratValidationError[] = [];

  // ── Organisme ──
  if (!company.name || company.name.includes("[")) {
    errors.push({ field: "company.name", message: "Nom de l'organisme non configuré", severity: "blocking" });
  }
  if (!company.siret || company.siret.includes("[")) {
    errors.push({ field: "company.siret", message: "SIRET non configuré", severity: "blocking" });
  }
  if (!company.address || company.address.includes("[")) {
    errors.push({ field: "company.address", message: "Adresse de l'organisme non configurée", severity: "blocking" });
  }
  if (!company.email || company.email.includes("[")) {
    errors.push({ field: "company.email", message: "Email de l'organisme non configuré", severity: "blocking" });
  }
  if (!company.nda || company.nda.includes("[")) {
    errors.push({ field: "company.nda", message: "Numéro de déclaration d'activité (NDA) non configuré", severity: "warning" });
  }

  // ── Stagiaire ──
  if (!contact.nom) {
    errors.push({ field: "contact.nom", message: "Nom du stagiaire obligatoire", severity: "blocking" });
  }
  if (!contact.prenom) {
    errors.push({ field: "contact.prenom", message: "Prénom du stagiaire obligatoire", severity: "blocking" });
  }
  if (!contact.date_naissance) {
    errors.push({ field: "contact.date_naissance", message: "Date de naissance du stagiaire recommandée", severity: "warning" });
  }
  if (!contact.rue && !contact.ville) {
    errors.push({ field: "contact.adresse", message: "Adresse du stagiaire recommandée", severity: "warning" });
  }

  // ── Session ──
  if (!session.nom) {
    errors.push({ field: "session.nom", message: "Intitulé de la formation obligatoire", severity: "blocking" });
  }
  if (!session.date_debut || !session.date_fin) {
    errors.push({ field: "session.dates", message: "Dates de début et fin obligatoires", severity: "blocking" });
  }
  if (!session.duree_heures) {
    errors.push({ field: "session.duree_heures", message: "Durée en heures obligatoire", severity: "blocking" });
  }
  if (!session.formation_type) {
    errors.push({ field: "session.formation_type", message: "Type de formation obligatoire", severity: "warning" });
  }

  return errors;
}

/**
 * Retourne true si la génération est possible (pas d'erreur bloquante).
 */
export function canGenerateContrat(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo
): boolean {
  return !validateContratData(contact, session, company).some(e => e.severity === "blocking");
}

// ── PDF helpers ────────────────────────────────────────────────

function setColor(doc: jsPDF, color: { r: number; g: number; b: number }) {
  doc.setTextColor(color.r, color.g, color.b);
}

function setFill(doc: jsPDF, color: { r: number; g: number; b: number }) {
  doc.setFillColor(color.r, color.g, color.b);
}

interface ContratContext {
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

function checkPageBreak(ctx: ContratContext, needed: number): void {
  if (ctx.yPos + needed > ctx.pageHeight - ctx.bottomMargin) {
    addFooter(ctx);
    ctx.doc.addPage();
    ctx.pageNum++;
    ctx.yPos = addHeader(ctx) + 5;
  }
}

function addHeader(ctx: ContratContext): number {
  const { doc, company, pageWidth, mL } = ctx;
  const headerH = 32;

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

  // Admin refs on right
  const refs: string[] = [];
  if (company.siret && !company.siret.includes("[")) refs.push(`SIRET ${company.siret}`);
  if (company.nda && !company.nda.includes("[") && company.nda.trim()) refs.push(`NDA ${company.nda}`);
  if (refs.length > 0) {
    doc.setFontSize(6.5);
    doc.setTextColor(170, 195, 175);
    refs.forEach((r, i) => doc.text(r, pageWidth - ctx.mR, 13 + i * 4, { align: "right" }));
  }
  if (company.qualiopi_numero) {
    doc.setFontSize(6);
    doc.setTextColor(C.gold.r, C.gold.g, C.gold.b);
    doc.text("Certifié Qualiopi", pageWidth - ctx.mR, 28, { align: "right" });
  }

  setColor(doc, C.warmGray800);
  return headerH + 6;
}

function addFooter(ctx: ContratContext): void {
  const { doc, pageWidth, pageHeight, pageNum } = ctx;

  setFill(doc, C.gold);
  doc.rect(ctx.mL, pageHeight - 22, pageWidth - ctx.mL - ctx.mR, 0.5, "F");

  doc.setFontSize(6.5);
  setColor(doc, C.warmGray500);
  doc.text(`Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`, ctx.mL, pageHeight - 16);
  doc.text(`Page ${pageNum}`, pageWidth - ctx.mR, pageHeight - 16, { align: "right" });
  setColor(doc, C.warmGray800);
}

function writeArticle(ctx: ContratContext, title: string): void {
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

function writeParagraph(ctx: ContratContext, text: string, indent: number = 0): void {
  ctx.doc.setFontSize(9);
  ctx.doc.setFont(DOCUMENT_FONTS.primary, "normal");
  setColor(ctx.doc, C.warmGray700);
  const lines = ctx.doc.splitTextToSize(text, ctx.cW - indent) as string[];
  for (const line of lines) {
    checkPageBreak(ctx, ctx.lineH + 1);
    ctx.doc.text(line, ctx.mL + indent, ctx.yPos);
    ctx.yPos += ctx.lineH;
  }
  ctx.yPos += 2; // inter-paragraph breathing
  setColor(ctx.doc, C.warmGray800);
}

function writeBullet(ctx: ContratContext, text: string): void {
  ctx.doc.setFontSize(9);
  setColor(ctx.doc, C.warmGray700);
  const lines = ctx.doc.splitTextToSize(`• ${text}`, ctx.cW - 10) as string[];
  for (let i = 0; i < lines.length; i++) {
    checkPageBreak(ctx, ctx.lineH + 1);
    ctx.doc.text(lines[i], ctx.mL + (i === 0 ? 5 : 10), ctx.yPos);
    ctx.yPos += ctx.lineH;
  }
  ctx.yPos += 1; // breathing between bullets
  setColor(ctx.doc, C.warmGray800);
}

function drawInfoBox(ctx: ContratContext, items: Array<{ label: string; value: string }>): void {
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

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  return `${h}h${m}`;
}

function isValidTime(t?: string): t is string {
  return !!t && t !== "00:00:00" && t !== "00:00";
}

function formatSessionHours(s: SessionInfo): string {
  if (isValidTime(s.heure_debut_matin) && isValidTime(s.heure_fin_matin) && isValidTime(s.heure_debut_aprem) && isValidTime(s.heure_fin_aprem)) {
    return `${formatTime(s.heure_debut_matin)} - ${formatTime(s.heure_fin_matin)} / ${formatTime(s.heure_debut_aprem)} - ${formatTime(s.heure_fin_aprem)}`;
  }
  if (isValidTime(s.heure_debut) && isValidTime(s.heure_fin)) {
    return `${formatTime(s.heure_debut)} - ${formatTime(s.heure_fin)}`;
  }
  return "";
}

function formatAddress(s: SessionInfo): string {
  const parts: string[] = [];
  if (s.adresse_rue) parts.push(s.adresse_rue);
  if (s.adresse_code_postal || s.adresse_ville) parts.push(`${s.adresse_code_postal || ""} ${s.adresse_ville || ""}`.trim());
  if (parts.length === 0 && s.lieu) return s.lieu;
  return parts.join(", ");
}

function getPrice(s: SessionInfo): number {
  return s.prix_ht || s.prix || 0;
}

/**
 * Détermine le label T3P lisible à partir du formation_type technique.
 */
function getFormationLabel(formationType: string): string {
  const labels: Record<string, string> = {
    vtc: "Formation VTC (Voiture de Transport avec Chauffeur)",
    taxi: "Formation Taxi",
    taxi_75: "Formation Taxi (Paris et petite couronne)",
    vmdtr: "Formation VMDTR (Véhicule Motorisé à Deux ou Trois Roues)",
    mobilite_taxi: "Formation Mobilité Taxi",
  };
  return labels[formationType.toLowerCase()] || formationType;
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════

export function generateContratFormationV2(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo
): jsPDF {
  const doc = new jsPDF();
  const ctx: ContratContext = {
    doc,
    company,
    contact,
    session,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    mL: 20,
    mR: 20,
    cW: doc.internal.pageSize.getWidth() - 40,
    bottomMargin: 32,
    lineH: 5.2,
    pageNum: 1,
    yPos: 0,
  };

  ctx.yPos = addHeader(ctx);

  const prix = getPrice(session);
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();

  // ═══ TITRE ═══
  ctx.yPos += 4;
  doc.setFontSize(13);
  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  const titleText = "CONTRAT DE FORMATION PROFESSIONNELLE";
  const titleW = doc.getTextWidth(titleText) + 24;
  setFill(doc, C.gold);
  doc.roundedRect((ctx.pageWidth - titleW) / 2, ctx.yPos - 7, titleW, 14, 3, 3, "F");
  setColor(doc, C.forestGreenDark);
  doc.text(titleText, ctx.pageWidth / 2, ctx.yPos, { align: "center" });

  ctx.yPos += 6;
  doc.setFontSize(7.5);
  doc.setFont(DOCUMENT_FONTS.primary, "normal");
  setColor(doc, C.warmGray500);
  doc.text("En application des articles L.6353-3 à L.6353-7 du Code du travail", ctx.pageWidth / 2, ctx.yPos, { align: "center" });

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
  const ndaText = company.nda && !company.nda.includes("[") && company.nda.trim()
    ? company.nda
    : null;
  const orgLines: string[] = [company.name];
  if (company.siret && !company.siret.includes("[")) orgLines.push(`SIRET : ${company.siret}`);
  orgLines.push(company.address);
  if (ndaText) orgLines.push(`Déclaration d'activité enregistrée sous le N° ${ndaText} auprès du Préfet de région`);
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
  for (const line of orgLines) {
    doc.text(line, ctx.mL + 8, orgY);
    orgY += ctx.lineH;
  }
  doc.setFontSize(7);
  setColor(doc, C.warmGray500);
  doc.text("(Cette déclaration ne vaut pas agrément de l'État) — Ci-après dénommé « l'Organisme »", ctx.mL + 8, orgY);
  setColor(doc, C.warmGray800);
  ctx.yPos += orgBoxH + 4;

  // Box Stagiaire
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
  doc.text("Le stagiaire (personne physique finançant personnellement sa formation) :", ctx.mL + 8, stagY);
  stagY += ctx.lineH + 2;
  setColor(doc, C.warmGray700);
  for (let i = 0; i < stagParts.length; i++) {
    doc.setFont(DOCUMENT_FONTS.primary, i === 0 ? "bold" : "normal");
    setColor(doc, i === 0 ? C.warmGray800 : C.warmGray700);
    doc.text(stagParts[i], ctx.mL + 8, stagY);
    stagY += ctx.lineH;
  }
  doc.setFontSize(7);
  setColor(doc, C.warmGray500);
  doc.text("Ci-après dénommé « le Stagiaire »", ctx.mL + 8, stagY);
  setColor(doc, C.warmGray800);
  ctx.yPos += stagBoxH + 3;

  // ═══════════════════════════════════════════════════════════
  // ARTICLES — numérotation stable (toujours 1 à 18)
  // ═══════════════════════════════════════════════════════════

  // Article 1 — Objet
  writeArticle(ctx, "Article 1 — Objet du contrat");
  writeParagraph(ctx, "Le présent contrat est conclu en application des articles L.6353-3 à L.6353-7 du Code du travail. Il est établi entre l'Organisme de formation et le Stagiaire, personne physique, qui entreprend une formation à ses frais personnels.");
  writeParagraph(ctx, "L'Organisme s'engage à organiser l'action de formation définie ci-après et le Stagiaire s'engage à suivre cette formation avec assiduité.");

  // Article 2 — Nature et caractéristiques
  writeArticle(ctx, "Article 2 — Nature, durée et caractéristiques de l'action de formation");
  const formationLabel = session.formation_type ? getFormationLabel(session.formation_type) : session.nom;
  const art2Items: Array<{ label: string; value: string }> = [
    { label: "Intitulé", value: session.nom },
    { label: "Nature de l'action", value: `${formationLabel} — Action de formation professionnelle (Art. L6313-1 du Code du travail)` },
    { label: "Dates", value: `Du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}` },
  ];
  if (session.duree_heures) art2Items.push({ label: "Durée totale", value: `${session.duree_heures} heures` });
  const hours = formatSessionHours(session);
  if (hours) art2Items.push({ label: "Horaires", value: hours });
  const addr = formatAddress(session);
  if (addr) art2Items.push({ label: "Lieu de formation", value: addr });
  art2Items.push({ label: "Modalité", value: "En présentiel" });
  art2Items.push({ label: "Effectif", value: "Formation dispensée en groupe (effectif limité selon les capacités d'accueil de l'organisme)" });
  drawInfoBox(ctx, art2Items);

  // Article 3 — Objectifs pédagogiques
  writeArticle(ctx, "Article 3 — Objectifs pédagogiques");
  const objectifText = session.objectifs || "Acquisition des compétences professionnelles visées par la formation, telles que définies dans le programme annexé au présent contrat.";
  writeParagraph(ctx, objectifText);

  // Article 4 — Public visé et prérequis
  writeArticle(ctx, "Article 4 — Public visé et prérequis");
  writeParagraph(ctx, "Public visé : toute personne physique souhaitant obtenir ou renouveler sa carte professionnelle dans le domaine du transport public particulier de personnes (T3P).");
  const prerequisText = session.prerequis || "Être titulaire d'un permis de conduire en cours de validité (catégorie B). Aucun autre prérequis spécifique n'est demandé. Les conditions d'accès détaillées figurent dans le programme annexé.";
  writeParagraph(ctx, prerequisText);

  // Article 5 — Programme
  writeArticle(ctx, "Article 5 — Programme de formation");
  writeParagraph(ctx, "Le programme détaillé de la formation figure en ANNEXE 1 du présent contrat. Il précise les objectifs pédagogiques par module, le contenu, les méthodes pédagogiques et les modalités d'évaluation de la formation.");

  // Article 6 — Modalités de déroulement
  writeArticle(ctx, "Article 6 — Modalités de déroulement de l'action");
  writeParagraph(ctx, "La formation se déroule en présentiel, dans les locaux de l'Organisme ou sur les parcours prévus pour les épreuves pratiques, aux dates et horaires indiqués à l'article 2.");
  writeParagraph(ctx, "Le Stagiaire bénéficie d'un suivi pédagogique individualisé et d'une assistance technique pendant toute la durée de la formation.");

  // Article 7 — Moyens pédagogiques et techniques
  writeArticle(ctx, "Article 7 — Moyens pédagogiques, techniques et d'encadrement");
  writeParagraph(ctx, "Les moyens mis en œuvre comprennent :");
  writeBullet(ctx, "Supports de cours remis à chaque stagiaire (papier et/ou numérique)");
  writeBullet(ctx, "Exercices pratiques, mises en situation et études de cas");
  writeBullet(ctx, "Salle de formation équipée (vidéoprojecteur, tableau interactif)");
  writeBullet(ctx, "Véhicule(s) homologué(s) pour les épreuves pratiques de conduite, le cas échéant");
  if (session.formateur) {
    ctx.yPos += 2;
    writeParagraph(ctx, `Formateur référent : ${session.formateur}.`);
  } else {
    ctx.yPos += 2;
    writeParagraph(ctx, "La formation est encadrée par des formateurs qualifiés, dont les références sont communiquées au Stagiaire en début de formation.");
  }

  // Article 8 — Contrôle des connaissances et évaluation
  writeArticle(ctx, "Article 8 — Modalités de contrôle des connaissances et d'évaluation");
  writeParagraph(ctx, "Les acquis du Stagiaire sont évalués tout au long de la formation selon les modalités suivantes :");
  writeBullet(ctx, "Évaluations formatives continues (QCM, exercices, mises en situation)");
  writeBullet(ctx, "Évaluation sommative en fin de formation");
  writeBullet(ctx, "Feuilles d'émargement signées par le Stagiaire et le formateur");
  writeParagraph(ctx, "Un bilan de fin de formation est établi, attestant du niveau d'acquisition des compétences.");

  // Article 9 — Sanction de la formation
  writeArticle(ctx, "Article 9 — Sanction de la formation");
  writeParagraph(ctx, "À l'issue de la formation et sous réserve de l'assiduité requise et de la réussite aux évaluations, le Stagiaire reçoit :");
  writeBullet(ctx, "Une attestation de fin de formation mentionnant les objectifs, la nature, la durée et les résultats de l'évaluation (Art. L6353-1 du Code du travail)");
  writeBullet(ctx, "Le cas échéant, une attestation d'aptitude permettant de constituer le dossier de demande de carte professionnelle auprès de la préfecture compétente");

  // Article 10 — Prix et modalités de paiement
  writeArticle(ctx, "Article 10 — Prix de la formation et modalités de paiement");
  checkPageBreak(ctx, 25);

  if (prix > 0) {
    const priceBoxH = 16;
    setFill(doc, { r: 255, g: 251, b: 240 });
    doc.roundedRect(ctx.mL, ctx.yPos, ctx.cW, priceBoxH, 3, 3, "F");
    setFill(doc, C.gold);
    doc.roundedRect(ctx.mL, ctx.yPos, 3, priceBoxH, 1, 1, "F");

    doc.setFontSize(9.5);
    doc.setFont(DOCUMENT_FONTS.primary, "bold");
    setColor(doc, C.forestGreenDark);
    doc.text(`Prix total : ${prix.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, ctx.mL + 8, ctx.yPos + 7);
    doc.setFontSize(7.5);
    doc.setFont(DOCUMENT_FONTS.primary, "normal");
    setColor(doc, C.warmGray600);
    doc.text("TVA non applicable — art. 293 B du CGI", ctx.mL + 8, ctx.yPos + 12);
    setColor(doc, C.warmGray800);
    ctx.yPos += priceBoxH + 3;

    // ⚠ CLAUSE CONFORME ART. L6353-5 ET L6353-6
    writeParagraph(ctx, "Conformément aux articles L.6353-5 et L.6353-6 du Code du travail :");
    writeBullet(ctx, "Aucun paiement ne peut être exigé avant l'expiration du délai de rétractation de 10 jours prévu à l'article 11 ci-après.");
    writeBullet(ctx, `À l'issue de ce délai, un acompte maximum de 30 % du prix convenu, soit ${(prix * 0.3).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €, peut être versé.`);
    writeBullet(ctx, "Le solde donne lieu à échelonnement des paiements au fur et à mesure du déroulement de l'action de formation.");
    writeParagraph(ctx, "Ce tarif comprend la formation, les supports de cours et l'attestation de fin de formation.");
  } else {
    writeParagraph(ctx, "La présente formation est dispensée à titre gratuit. Aucune somme n'est exigée du Stagiaire.");
  }

  // Article 11 — Rétractation (mise en évidence)
  writeArticle(ctx, "Article 11 — Délai de rétractation (Art. L.6353-5)");
  checkPageBreak(ctx, 20);

  const retractBoxH = 14;
  setFill(doc, C.forestGreen);
  doc.roundedRect(ctx.mL, ctx.yPos, ctx.cW, retractBoxH, 3, 3, "F");
  doc.setFontSize(8.5);
  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  setColor(doc, C.white);
  doc.text("⚠ DÉLAI DE RÉTRACTATION : 10 JOURS", ctx.mL + 8, ctx.yPos + 5.5);
  doc.setFontSize(7);
  doc.setFont(DOCUMENT_FONTS.primary, "normal");
  doc.text("À compter de la signature — par lettre recommandée avec accusé de réception", ctx.mL + 8, ctx.yPos + 10.5);
  setColor(doc, C.warmGray800);
  ctx.yPos += retractBoxH + 3;

  writeParagraph(ctx, "Conformément à l'article L.6353-5 du Code du travail, le Stagiaire dispose d'un délai de DIX (10) JOURS à compter de la signature du présent contrat pour se rétracter. Cette rétractation doit être notifiée par lettre recommandée avec accusé de réception adressée à l'Organisme. Dans ce cas, aucune somme ne peut être exigée du Stagiaire.");

  // Article 12 — Cessation anticipée / Abandon
  writeArticle(ctx, "Article 12 — Abandon, cessation anticipée et force majeure (Art. L.6353-7)");
  writeParagraph(ctx, "En cas de cessation anticipée de la formation du fait de l'Organisme ou d'abandon pour un motif relevant de la force majeure dûment reconnu, seules les prestations effectivement dispensées sont dues au prorata temporis de leur valeur prévue au contrat.");
  ctx.yPos += 2;
  writeParagraph(ctx, "Constituent des cas de force majeure : maladie ou accident du stagiaire sur présentation d'un justificatif médical, décès d'un proche, catastrophe naturelle, ou tout événement imprévisible et irrésistible au sens de l'article 1218 du Code civil.");
  ctx.yPos += 2;
  writeParagraph(ctx, "En cas d'abandon par le Stagiaire pour un motif autre que la force majeure, l'Organisme peut facturer les heures effectivement dispensées au prorata du prix convenu, dans la limite du montant restant dû.");

  // Article 13 — Obligations du Stagiaire
  writeArticle(ctx, "Article 13 — Obligations du Stagiaire");
  writeParagraph(ctx, "Le Stagiaire s'engage à :");
  writeBullet(ctx, "Suivre la formation avec assiduité et ponctualité");
  writeBullet(ctx, "Respecter le règlement intérieur de l'Organisme");
  writeBullet(ctx, "Participer aux évaluations prévues dans le programme");
  writeBullet(ctx, "Informer l'Organisme de tout empêchement dans les meilleurs délais");
  writeBullet(ctx, "Ne pas utiliser les supports de cours à des fins commerciales ou de reproduction");

  // Article 14 — Règlement intérieur
  writeArticle(ctx, "Article 14 — Règlement intérieur");
  writeParagraph(ctx, "Le Stagiaire déclare avoir pris connaissance du règlement intérieur de l'Organisme de formation, qui lui a été remis préalablement à la signature du présent contrat conformément à l'article L.6352-3 du Code du travail, et s'engage à le respecter.");

  // Article 15 — RGPD
  writeArticle(ctx, "Article 15 — Protection des données personnelles (RGPD)");
  writeParagraph(ctx, "Les données personnelles recueillies dans le cadre du présent contrat font l'objet d'un traitement destiné à la gestion administrative et pédagogique de la formation, sur le fondement de l'exécution contractuelle (Art. 6.1.b du RGPD).");
  writeParagraph(ctx, "Conformément au Règlement Général sur la Protection des Données (UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée, le Stagiaire dispose d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition au traitement de ses données.");
  writeParagraph(ctx, `Durée de conservation : 5 ans après la fin de la formation (obligation légale). Pour exercer ces droits : ${company.email}. En cas de litige, le Stagiaire peut introduire une réclamation auprès de la CNIL (www.cnil.fr).`);

  // Article 16 — Litiges et médiation
  writeArticle(ctx, "Article 16 — Règlement des litiges et médiation");
  writeParagraph(ctx, "En cas de contestation, les parties conviennent de rechercher une solution amiable. Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, le Stagiaire peut recourir gratuitement au service du médiateur de la consommation :");
  writeParagraph(ctx, `${ORGANISME.mediateur.nom} — ${ORGANISME.mediateur.adresse}, ${ORGANISME.mediateur.codePostal} ${ORGANISME.mediateur.ville}`, 4);
  writeParagraph(ctx, `${ORGANISME.mediateur.email} — ${ORGANISME.mediateur.web}`, 4);
  writeParagraph(ctx, "À défaut d'accord amiable, le litige sera soumis aux tribunaux compétents du ressort du siège de l'Organisme.");

  // Article 17 — Dispositions générales
  writeArticle(ctx, "Article 17 — Dispositions générales");
  writeParagraph(ctx, "Le présent contrat est soumis au droit français. Il annule et remplace tout accord antérieur entre les parties relatif à la même formation. Toute modification doit faire l'objet d'un avenant signé par les deux parties.");
  writeParagraph(ctx, "Si l'une des clauses du présent contrat était déclarée nulle, les autres clauses resteraient en vigueur.");

  // Article 18 — Documents annexes
  writeArticle(ctx, "Article 18 — Documents annexes");
  writeParagraph(ctx, "Sont annexés au présent contrat et en font partie intégrante :");
  writeBullet(ctx, "ANNEXE 1 : Programme détaillé de la formation");
  writeBullet(ctx, "ANNEXE 2 : Règlement intérieur de l'organisme de formation");

  // ═══ SIGNATURES ═══
  ctx.yPos += 10;
  checkPageBreak(ctx, 60);

  setFill(doc, C.gold);
  doc.rect(ctx.mL, ctx.yPos, ctx.cW, 0.5, "F");
  ctx.yPos += 8;

  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  doc.setFontSize(9);
  setColor(doc, C.forestGreen);
  doc.text("SIGNATURES", ctx.mL, ctx.yPos);
  ctx.yPos += 5;

  doc.setFont(DOCUMENT_FONTS.primary, "normal");
  doc.setFontSize(7.5);
  setColor(doc, C.warmGray500);
  doc.text(`Fait en double exemplaire, le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, ctx.mL, ctx.yPos);
  setColor(doc, C.warmGray800);
  ctx.yPos += 8;

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
  doc.text("(Cachet et signature)", ctx.mL + 5, ctx.yPos + 13);

  // Box droite - Stagiaire
  const rightX = ctx.mL + halfW + 10;
  setFill(doc, C.creamLight);
  doc.roundedRect(rightX, ctx.yPos, halfW, sigBoxH, 2, 2, "FD");

  doc.setFont(DOCUMENT_FONTS.primary, "bold");
  setColor(doc, C.forestGreen);
  doc.text("Le Stagiaire", rightX + 5, ctx.yPos + 7);
  doc.setFont(DOCUMENT_FONTS.primary, "normal");
  setColor(doc, C.warmGray700);
  doc.text(fullName, rightX + 5, ctx.yPos + 13);
  doc.setFontSize(6.5);
  setColor(doc, C.warmGray500);
  doc.text("(Signature précédée de la mention", rightX + 5, ctx.yPos + 26);
  doc.text("\"Lu et approuvé, bon pour accord\")", rightX + 5, ctx.yPos + 30);

  ctx.yPos += sigBoxH + 5;

  // Mention légale finale
  checkPageBreak(ctx, 8);
  doc.setFontSize(6.5);
  setColor(doc, C.warmGray500);
  doc.text("Contrat conclu conformément aux articles L.6353-3 à L.6353-7 du Code du travail.", ctx.mL, ctx.yPos);
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
