// PDF Generator for Supabase Edge Functions
// Simplified port of src/lib/pdf-generator.ts for server-side generation
// @ts-ignore - jsPDF for Deno
import jsPDFModule from "npm:jspdf@2.5.2";

// Handle both ESM default export and CJS module.exports
const jsPDF = (jsPDFModule as any).jsPDF || (jsPDFModule as any).default?.jsPDF || (jsPDFModule as any).default || jsPDFModule;

// ==================== TYPES ====================
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
  numero_session?: string;
  heure_debut?: string;
  heure_fin?: string;
  heure_debut_matin?: string;
  heure_fin_matin?: string;
  heure_debut_aprem?: string;
  heure_fin_aprem?: string;
  formateur?: string;
  adresse_rue?: string;
  adresse_code_postal?: string;
  adresse_ville?: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  nda: string;
  qualiopi_numero?: string;
}

// ==================== COLORS ====================
const COLORS = {
  forestGreen: { r: 27, g: 77, b: 62 },
  forestGreenDark: { r: 20, g: 61, b: 49 },
  cream: { r: 245, g: 235, b: 215 },
  creamLight: { r: 251, g: 247, b: 239 },
  creamDark: { r: 232, g: 220, b: 196 },
  gold: { r: 212, g: 168, b: 83 },
  warmGray500: { r: 137, g: 129, b: 114 },
  warmGray600: { r: 107, g: 107, b: 107 },
  warmGray700: { r: 75, g: 70, b: 60 },
  warmGray800: { r: 44, g: 41, b: 34 },
  white: { r: 255, g: 255, b: 255 },
};

// ==================== PROGRAMMES T3P ====================
interface ModuleT3P {
  titre: string;
  duree: string;
  contenu: string[];
}

// Modules communs à tous les métiers T3P (formation initiale)
const MODULES_COMMUNS: ModuleT3P[] = [
  { titre: "Module 1 - Gestion", duree: "5h", contenu: ["Choix du statut juridique", "Obligations comptables et fiscales", "Assurances professionnelles", "Calcul du coût de revient et rentabilité"] },
  { titre: "Module 2 - Réglementation T3P", duree: "5h", contenu: ["Cadre juridique national et européen", "Conditions d'accès et d'exercice de la profession", "Obligations du conducteur T3P", "Sanctions administratives et pénales"] },
  { titre: "Module 3 - Français", duree: "5h", contenu: ["Communication professionnelle", "Accueil et prise en charge de la clientèle", "Gestion des réclamations", "Vocabulaire du transport"] },
  { titre: "Module 4 - Anglais (B1 CECRL)", duree: "5h", contenu: ["Vocabulaire professionnel du transport", "Accueil clientèle anglophone", "Situations courantes", "Présentation touristique"] },
  { titre: "Module 5 - Sécurité routière", duree: "5h", contenu: ["Réglementation Code de la route", "Conduite défensive et éco-conduite", "Gestion des situations d'urgence", "Entretien et visite technique du véhicule"] },
];

// Modules communs formation continue (14h)
const MODULES_COMMUNS_FC: ModuleT3P[] = [
  { titre: "Module 1 - Actualisation des connaissances réglementaires", duree: "3h", contenu: ["Évolutions réglementaires T3P", "Nouvelles obligations légales", "Mise à jour du cadre juridique"] },
  { titre: "Module 2 - Sécurité routière - perfectionnement", duree: "3h", contenu: ["Actualisation Code de la route", "Éco-conduite et nouvelles technologies", "Prévention des risques routiers"] },
  { titre: "Module 3 - Gestion et développement", duree: "2h", contenu: ["Optimisation de la gestion d'entreprise", "Actualités fiscales et sociales", "Outils numériques de gestion"] },
  { titre: "Module 4 - Langues (Français & Anglais)", duree: "2h", contenu: ["Perfectionnement communication client", "Anglais professionnel - mise à niveau"] },
  { titre: "Module 5 - Prévention des discriminations et harcèlement", duree: "2h", contenu: ["Rappel du cadre légal", "Les 27 critères de discrimination prohibés", "Obligations de signalement traite/harcèlement"] },
];

const PROGRAMMES_T3P: Record<string, { modules: ModuleT3P[]; sanctionFormation: string }> = {
  // ===== FORMATIONS INITIALES =====
  VTC: {
    modules: [
      ...MODULES_COMMUNS,
      { titre: "Module 6 - Réglementation nationale VTC", duree: "5h", contenu: ["Conditions d'accès spécifiques VTC", "Obligations du conducteur VTC", "Registre VTC et carte professionnelle", "Relations avec les plateformes de mise en relation"] },
      { titre: "Module 7 - Développement commercial", duree: "4h", contenu: ["Stratégie commerciale et fidélisation", "Marketing digital et réseaux sociaux", "Relation client et qualité de service", "Gestion de la e-réputation"] },
    ],
    sanctionFormation: "Attestation de formation initiale VTC permettant de se présenter à l'examen T3P de la CMA",
  },
  TAXI: {
    modules: [
      ...MODULES_COMMUNS,
      { titre: "Module 6 - Réglementation nationale taxi", duree: "5h", contenu: ["Équipements spéciaux (taximètre, lumineux)", "Régime des autorisations de stationnement (ADS)", "Tarification réglementée des courses", "Obligations spécifiques du conducteur de taxi"] },
      { titre: "Module 7 - Réglementation locale taxi", duree: "4h", contenu: ["Réglementation départementale applicable", "Zones de prise en charge", "Stations de taxi et emplacements réservés", "Spécificités locales de la profession"] },
    ],
    sanctionFormation: "Attestation de formation initiale TAXI permettant de se présenter à l'examen T3P de la CMA",
  },
  "TAXI-75": {
    modules: [
      ...MODULES_COMMUNS,
      { titre: "Module 6 - Réglementation nationale taxi", duree: "5h", contenu: ["Équipements spéciaux (taximètre, lumineux)", "Régime des ADS", "Tarification réglementée", "Obligations spécifiques taxi"] },
      { titre: "Module 7 - Réglementation locale taxi Paris (75)", duree: "4h", contenu: ["Préfecture de Police de Paris", "Réglementation spécifique département 75", "Zones de prise en charge parisiennes", "Stations taxi et emplacements réservés à Paris"] },
    ],
    sanctionFormation: "Attestation de formation initiale TAXI Paris (75) permettant de se présenter à l'examen T3P de la CMA de Paris",
  },
  VMDTR: {
    modules: [
      ...MODULES_COMMUNS,
      { titre: "Module 6 - Spécificité VMDTR", duree: "5h", contenu: ["Réglementation spécifique deux/trois roues motorisés", "Équipements de protection obligatoires", "Spécificités de conduite moto-taxi", "Prise en charge passager sur deux/trois roues"] },
      { titre: "Module 7 - Sécurité spécifique VMDTR", duree: "4h", contenu: ["Risques spécifiques à la conduite 2/3 roues", "Techniques de conduite défensive moto", "Entretien et contrôle du véhicule 2/3 roues", "Gestion des conditions météorologiques"] },
    ],
    sanctionFormation: "Attestation de formation initiale VMDTR permettant de se présenter à l'examen T3P de la CMA",
  },
  // ===== FORMATIONS CONTINUES (14h) =====
  "FC-VTC": {
    modules: [
      ...MODULES_COMMUNS_FC,
      { titre: "Module 6 - Actualisation réglementation VTC", duree: "1h", contenu: ["Évolutions spécifiques VTC", "Nouvelles obligations plateformes", "Mise à jour carte professionnelle VTC"] },
      { titre: "Module 7 - Développement commercial VTC", duree: "1h", contenu: ["Nouvelles stratégies de fidélisation", "Évolution du marché VTC", "Outils digitaux et e-réputation"] },
    ],
    sanctionFormation: "Attestation de formation continue VTC permettant le renouvellement de la carte professionnelle",
  },
  "FC-TAXI": {
    modules: [
      ...MODULES_COMMUNS_FC,
      { titre: "Module 6 - Actualisation réglementation taxi", duree: "1h", contenu: ["Évolutions taximètre et équipements", "Actualités ADS et tarification", "Nouvelles obligations taxi"] },
      { titre: "Module 7 - Réglementation locale taxi - mise à jour", duree: "1h", contenu: ["Évolutions réglementation départementale", "Nouvelles zones et stations", "Actualités locales de la profession"] },
    ],
    sanctionFormation: "Attestation de formation continue TAXI permettant le renouvellement de la carte professionnelle",
  },
  "FC-VMDTR": {
    modules: [
      ...MODULES_COMMUNS_FC,
      { titre: "Module 6 - Actualisation spécificité VMDTR", duree: "1h", contenu: ["Évolutions réglementaires 2/3 roues", "Nouveaux équipements de protection", "Actualités de la profession moto-taxi"] },
      { titre: "Module 7 - Sécurité VMDTR - perfectionnement", duree: "1h", contenu: ["Nouvelles techniques de conduite défensive", "Retours d'expérience accidentologie", "Prévention des risques spécifiques"] },
    ],
    sanctionFormation: "Attestation de formation continue VMDTR permettant le renouvellement de la carte professionnelle",
  },
};

function getFormationType(sessionName: string, formationType?: string): string {
  if (formationType) {
    const type = formationType.toUpperCase().replace(/\s+/g, '-');
    // Détection formation continue
    if (type.includes("FC") || type.includes("CONTINUE")) {
      if (type.includes("VMDTR")) return "FC-VMDTR";
      if (type.includes("VTC")) return "FC-VTC";
      if (type.includes("TAXI")) return "FC-TAXI";
    }
    if (type.includes("TAXI-75") || type.includes("TAXI 75") || type.includes("TAXI PARIS")) return "TAXI-75";
    if (type.includes("VMDTR")) return "VMDTR";
    if (type.includes("VTC")) return "VTC";
    if (type.includes("TAXI")) return "TAXI";
  }
  const name = sessionName.toUpperCase();
  // Détection formation continue par le nom de session
  if (name.includes("CONTINUE") || name.includes(" FC ") || name.startsWith("FC ") || name.includes("FC-")) {
    if (name.includes("VMDTR")) return "FC-VMDTR";
    if (name.includes("VTC")) return "FC-VTC";
    if (name.includes("TAXI")) return "FC-TAXI";
  }
  if (name.includes("TAXI 75") || name.includes("TAXI-75") || name.includes("PARIS")) return "TAXI-75";
  if (name.includes("VMDTR")) return "VMDTR";
  if (name.includes("VTC")) return "VTC";
  if (name.includes("TAXI")) return "TAXI";
  return "VTC";
}

// ==================== HELPERS ====================
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatSessionHours(session: SessionInfo): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}h${minutes}`;
  };

  // Use detailed morning/afternoon hours if available
  if (session.heure_debut_matin && session.heure_fin_matin && session.heure_debut_aprem && session.heure_fin_aprem) {
    return `${formatTime(session.heure_debut_matin)} - ${formatTime(session.heure_fin_matin)} / ${formatTime(session.heure_debut_aprem)} - ${formatTime(session.heure_fin_aprem)}`;
  }
  if (session.heure_debut_matin && session.heure_fin_matin) {
    return `${formatTime(session.heure_debut_matin)} - ${formatTime(session.heure_fin_matin)}`;
  }
  if (session.heure_debut_aprem && session.heure_fin_aprem) {
    return `${formatTime(session.heure_debut_aprem)} - ${formatTime(session.heure_fin_aprem)}`;
  }
  if (session.heure_debut && session.heure_fin) {
    return `${formatTime(session.heure_debut)} - ${formatTime(session.heure_fin)}`;
  }
  return "";
}

function addHeader(doc: jsPDF, company: CompanyInfo): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerHeight = 38;

  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text(company.name, 20, 14);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.text(`${company.address} | Tél: ${company.phone} | ${company.email}`, 20, 22);

  doc.setFontSize(6.5);
  doc.text(`SIRET: ${company.siret} | NDA: ${company.nda}`, 20, 30);

  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.rect(0, headerHeight, pageWidth, 2, "F");

  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  return headerHeight + 8;
}

function addFooter(doc: jsPDF, pageNum: number = 1) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.rect(20, pageHeight - 25, pageWidth - 40, 1, "F");

  doc.setFontSize(7);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text(`Document généré le ${new Date().toLocaleDateString("fr-FR")}`, 20, pageHeight - 18);

  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.roundedRect(pageWidth - 35, pageHeight - 22, 20, 12, 2, 2, "F");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.setFontSize(9);
  doc.text(`${pageNum}`, pageWidth - 25, pageHeight - 14, { align: "center" });

  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
}

function addContactBlock(doc: jsPDF, contact: ContactInfo, x: number, y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  doc.text(fullName, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);

  if (contact.rue) { y += 5; doc.text(contact.rue, x, y); }
  if (contact.code_postal || contact.ville) { y += 5; doc.text(`${contact.code_postal || ""} ${contact.ville || ""}`.trim(), x, y); }
  if (contact.email) { y += 5; doc.text(contact.email, x, y); }

  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
  return y + 10;
}

// Helper function to format full address (server-side)
function formatFullAddress(session: SessionInfo): string {
  const parts: string[] = [];
  if (session.adresse_rue) parts.push(session.adresse_rue);
  if (session.adresse_code_postal || session.adresse_ville) {
    parts.push(`${session.adresse_code_postal || ""} ${session.adresse_ville || ""}`.trim());
  }
  if (parts.length === 0 && session.lieu) return session.lieu;
  return parts.join(", ");
}

// ==================== CONVOCATION PDF ====================
export function generateConvocationPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo
): typeof jsPDF.prototype {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const mL = 18;
  const mR = 18;
  const cW = pageWidth - mL - mR;

  // ─── Charte graphique ÉCOLE T3P (ecolet3p.fr) ───
  const cPrimary = { r: 30, g: 70, b: 45 };
  const cPrimaryMid = { r: 40, g: 85, b: 55 };
  const cPrimaryLight = { r: 235, g: 245, b: 238 };
  const cOrange = { r: 234, g: 118, b: 30 };
  const cOrangeLight = { r: 254, g: 243, b: 230 };
  const cText = { r: 33, g: 37, b: 41 };
  const cTextMuted = { r: 100, g: 116, b: 125 };
  const cBorder = { r: 220, g: 228, b: 222 };
  const cBgSubtle = { r: 247, g: 250, b: 248 };
  const cWhite = { r: 255, g: 255, b: 255 };

  // ═══════════════════════════════════════════════════════
  // A. BANDEAU EN-TÊTE — Vert forêt T3P
  // ═══════════════════════════════════════════════════════
  const headerH = 38;
  doc.setFillColor(cPrimary.r, cPrimary.g, cPrimary.b);
  doc.rect(0, 0, pageWidth, headerH, "F");

  // Accent orange fin sous le bandeau
  doc.setFillColor(cOrange.r, cOrange.g, cOrange.b);
  doc.rect(0, headerH, pageWidth, 1.8, "F");

  const textStartX = mL + 2;

  // Nom organisme en blanc
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(cWhite.r, cWhite.g, cWhite.b);
  doc.text(company.name, textStartX, 16);

  // Adresse (ligne 1)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(195, 215, 200);
  doc.text(company.address, textStartX, 23);

  // Téléphone + email (ligne 3)
  const contactParts: string[] = [];
  if (company.phone) contactParts.push(company.phone);
  if (company.email) contactParts.push(company.email);
  if (contactParts.length > 0) {
    doc.text(contactParts.join("  •  "), textStartX, 31);
  }

  // Références admin à droite
  const adminParts: string[] = [];
  if (company.siret && !company.siret.includes("[")) adminParts.push(`SIRET ${company.siret}`);
  if (company.nda && !company.nda.includes("[") && company.nda.trim() !== "") adminParts.push(`NDA ${company.nda}`);
  if (adminParts.length > 0) {
    doc.setFontSize(7);
    doc.setTextColor(155, 185, 160);
    adminParts.forEach((part, i) => {
      doc.text(part, pageWidth - mR, 16 + i * 4, { align: "right" });
    });
  }

  if (company.qualiopi_numero) {
    doc.setFontSize(6.5);
    doc.setTextColor(cOrange.r, cOrange.g, cOrange.b);
    doc.text(`Certifié Qualiopi`, pageWidth - mR, 32, { align: "right" });
  }

  let yPos = headerH + 10;

  // ═══════════════════════════════════════════════════════
  // B. TITRE
  // ═══════════════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(cPrimary.r, cPrimary.g, cPrimary.b);
  doc.text("CONVOCATION À LA FORMATION", pageWidth / 2, yPos, { align: "center" });

  yPos += 4;
  const titleLineW = 60;
  doc.setFillColor(cOrange.r, cOrange.g, cOrange.b);
  doc.rect((pageWidth - titleLineW) / 2, yPos, titleLineW, 1.5, "F");

  yPos += 7;

  // Réf + date
  const metaParts: string[] = [];
  if (session.numero_session) metaParts.push(`Réf. ${session.numero_session}`);
  const now = new Date();
  const emissionDate = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  metaParts.push(`Émise le ${emissionDate}`);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(cTextMuted.r, cTextMuted.g, cTextMuted.b);
  doc.text(metaParts.join("  —  "), pageWidth / 2, yPos, { align: "center" });

  yPos += 8;

  // ═══════════════════════════════════════════════════════
  // C. DESTINATAIRE + INTRO
  // ═══════════════════════════════════════════════════════
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();

  const destBoxX = pageWidth - mR - 78;
  const destLines: string[] = [fullName];
  if (contact.rue) destLines.push(contact.rue);
  if (contact.code_postal || contact.ville) destLines.push(`${contact.code_postal || ""} ${contact.ville || ""}`.trim());
  if (contact.email) destLines.push(contact.email);

  const destBoxH = 8 + destLines.length * 5.5;
  doc.setFillColor(cBgSubtle.r, cBgSubtle.g, cBgSubtle.b);
  doc.roundedRect(destBoxX - 6, yPos - 5, 82, destBoxH, 2, 2, "F");
  doc.setFillColor(cOrange.r, cOrange.g, cOrange.b);
  doc.rect(destBoxX - 6, yPos - 5, 2.5, destBoxH, "F");

  let destY = yPos;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(cPrimary.r, cPrimary.g, cPrimary.b);
  doc.text(destLines[0], destBoxX, destY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(cTextMuted.r, cTextMuted.g, cTextMuted.b);
  for (let i = 1; i < destLines.length; i++) {
    destY += 5.5;
    doc.text(destLines[i], destBoxX, destY);
  }

  // Intro (gauche)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(cText.r, cText.g, cText.b);
  doc.text(`${fullName},`, mL, yPos);

  const introMaxW = destBoxX - mL - 14;
  const introText = "Nous avons le plaisir de vous confirmer votre inscription à la formation ci-dessous. Veuillez prendre connaissance des informations pratiques.";
  doc.setFontSize(9.5);
  const introLines = doc.splitTextToSize(introText, introMaxW) as string[];
  doc.text(introLines, mL, yPos + 7);

  yPos = Math.max(destY + 6, yPos + 7 + introLines.length * 4.8) + 6;

  // ═══════════════════════════════════════════════════════
  // D. DÉTAILS DE LA FORMATION
  // ═══════════════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const nomFormationMaxW = cW - 16;
  const nomFormationLines = doc.splitTextToSize(session.nom, nomFormationMaxW) as string[];
  const sectionHeaderH = 10 + nomFormationLines.length * 5.5;

  doc.setFillColor(cPrimaryMid.r, cPrimaryMid.g, cPrimaryMid.b);
  doc.roundedRect(mL, yPos, cW, sectionHeaderH, 2, 2, "F");

  doc.setFillColor(cOrange.r, cOrange.g, cOrange.b);
  doc.rect(mL + 3, yPos + 3, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(200, 220, 205);
  doc.text("DÉTAILS DE LA FORMATION", mL + 8, yPos + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(cWhite.r, cWhite.g, cWhite.b);
  doc.text(nomFormationLines, mL + 8, yPos + 12);

  yPos += sectionHeaderH + 1;

  // Build rows
  interface ConvRow { label: string; value: string }
  const sessionRows: ConvRow[] = [];

  if (session.formation_type && session.formation_type !== session.nom) {
    sessionRows.push({ label: "Type", value: session.formation_type });
  }

  sessionRows.push({
    label: "Dates",
    value: `Du ${formatDateWithDay(session.date_debut)} au ${formatDateWithDay(session.date_fin)}`
  });

  const hours = formatSessionHours(session);
  if (hours) sessionRows.push({ label: "Horaires", value: hours });
  if (session.duree_heures) sessionRows.push({ label: "Durée", value: `${session.duree_heures} heures` });

  const address = formatFullAddress(session);
  if (address) sessionRows.push({ label: "Lieu", value: address });
  if (session.formateur) sessionRows.push({ label: "Formateur", value: session.formateur });

  const labelW = 30;
  const valX = mL + labelW + 4;
  const maxValW = cW - labelW - 8;

  doc.setFontSize(9);
  const rendered: { label: string; lines: string[]; h: number }[] = [];
  let cardH = 6;
  for (const r of sessionRows) {
    const lines = doc.splitTextToSize(r.value, maxValW) as string[];
    const h = Math.max(lines.length * 4.5, 6);
    rendered.push({ label: r.label, lines, h });
    cardH += h + 3;
  }

  doc.setFillColor(cPrimaryLight.r, cPrimaryLight.g, cPrimaryLight.b);
  doc.setDrawColor(cBorder.r, cBorder.g, cBorder.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(mL, yPos, cW, cardH, 0, 2, "FD");

  doc.setFillColor(cPrimary.r, cPrimary.g, cPrimary.b);
  doc.rect(mL, yPos, 2.5, cardH, "F");

  let rY = yPos + 5;
  for (let i = 0; i < rendered.length; i++) {
    const row = rendered[i];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(cTextMuted.r, cTextMuted.g, cTextMuted.b);
    doc.text(row.label, mL + 7, rY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(cText.r, cText.g, cText.b);
    doc.text(row.lines, valX, rY);

    rY += row.h + 3;
    if (i < rendered.length - 1) {
      doc.setDrawColor(cBorder.r, cBorder.g, cBorder.b);
      doc.setLineWidth(0.15);
      doc.line(mL + 6, rY - 1.5, mL + cW - 6, rY - 1.5);
    }
  }

  yPos += cardH + 8;

  // ═══════════════════════════════════════════════════════
  // E. INFORMATIONS PRATIQUES — bloc orange
  // ═══════════════════════════════════════════════════════
  const sectionHeaderH2 = 9;
  doc.setFillColor(cOrange.r, cOrange.g, cOrange.b);
  doc.roundedRect(mL, yPos, cW, sectionHeaderH2, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(cWhite.r, cWhite.g, cWhite.b);
  doc.text("INFORMATIONS PRATIQUES", mL + 8, yPos + 6.5);

  doc.setFillColor(cWhite.r, cWhite.g, cWhite.b);
  doc.rect(mL + 3, yPos + 2.5, 3, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(cOrange.r, cOrange.g, cOrange.b);
  doc.text("✓", mL + 3.3, yPos + 6);

  yPos += sectionHeaderH2 + 1;

  const practicalItems = [
    "Veuillez vous présenter 15 minutes avant le début de la formation.",
    "Munissez-vous d'une pièce d'identité en cours de validité.",
    "Apportez votre permis de conduire.",
    "Conservez cette convocation et présentez-la le jour de la formation.",
    "En cas d'empêchement, contactez-nous dans les plus brefs délais.",
  ];

  const practCardH = 6 + practicalItems.length * 6;
  doc.setFillColor(cOrangeLight.r, cOrangeLight.g, cOrangeLight.b);
  doc.roundedRect(mL, yPos, cW, practCardH, 0, 2, "F");

  doc.setFillColor(cOrange.r, cOrange.g, cOrange.b);
  doc.rect(mL, yPos, 2.5, practCardH, "F");

  let pY = yPos + 5;
  doc.setFontSize(8.5);
  for (const item of practicalItems) {
    doc.setFillColor(cOrange.r, cOrange.g, cOrange.b);
    doc.circle(mL + 8, pY - 1, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(cText.r, cText.g, cText.b);
    doc.text(item, mL + 12, pY);
    pY += 6;
  }

  yPos += practCardH + 8;

  // ═══════════════════════════════════════════════════════
  // F. CONTACT + SIGNATURE
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(cPrimaryLight.r, cPrimaryLight.g, cPrimaryLight.b);
  doc.roundedRect(mL, yPos, cW, 10, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(cPrimary.r, cPrimary.g, cPrimary.b);
  doc.text("Contact :", mL + 4, yPos + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(cTextMuted.r, cTextMuted.g, cTextMuted.b);
  doc.text(`${company.phone}  •  ${company.email}`, mL + 22, yPos + 6.5);
  yPos += 13;

  // Formule de politesse
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(cText.r, cText.g, cText.b);
  const closingLines = doc.splitTextToSize(
    `Dans l'attente de vous accueillir, nous vous prions d'agréer, ${fullName}, l'expression de nos salutations distinguées.`,
    cW
  ) as string[];
  doc.text(closingLines, mL, yPos);
  yPos += closingLines.length * 4.5 + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(cPrimary.r, cPrimary.g, cPrimary.b);
  doc.text("Le Service Formation", mL, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(cTextMuted.r, cTextMuted.g, cTextMuted.b);
  doc.text(company.name, mL, yPos + 5);

  // ═══════════════════════════════════════════════════════
  // FOOTER — bandeau vert forêt
  // ═══════════════════════════════════════════════════════
  const footerH = 12;
  const footerY = pageHeight - footerH;

  doc.setFillColor(cPrimary.r, cPrimary.g, cPrimary.b);
  doc.rect(0, footerY, pageWidth, footerH, "F");

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(170, 200, 178);
  doc.text(company.name, mL, footerY + 5);
  doc.text(`Document généré le ${now.toLocaleDateString("fr-FR")}`, pageWidth / 2, footerY + 5, { align: "center" });

  const footerRight: string[] = [];
  if (company.siret && !company.siret.includes("[")) footerRight.push(`SIRET ${company.siret}`);
  if (company.nda && !company.nda.includes("[") && company.nda.trim() !== "") footerRight.push(`NDA ${company.nda}`);
  if (footerRight.length > 0) {
    doc.text(footerRight.join("  •  "), pageWidth - mR, footerY + 5, { align: "right" });
  }

  // Filet orange au-dessus du footer
  doc.setFillColor(cOrange.r, cOrange.g, cOrange.b);
  doc.rect(0, footerY - 1, pageWidth, 1, "F");

  return doc;
}

// ==================== ATTESTATION PDF ====================
export function generateAttestationPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo,
  numeroCertificat?: string
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const headerEndY = addHeader(doc, company);

  let yPos = headerEndY + 8;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const titleWidth = doc.getTextWidth("ATTESTATION DE FORMATION") + 30;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - titleWidth) / 2, yPos - 8, titleWidth, 14, 3, 3, "F");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("ATTESTATION DE FORMATION", pageWidth / 2, yPos, { align: "center" });

  if (numeroCertificat) {
    yPos += 10;
    doc.setFontSize(9);
    doc.text(`N° ${numeroCertificat}`, pageWidth / 2, yPos, { align: "center" });
  }

  yPos += 18;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);

  const text1 = `Je soussigné, représentant de ${company.name}, organisme de formation déclaré sous le numéro ${company.nda}, atteste que :`;
  const splitText1 = doc.splitTextToSize(text1, pageWidth - 40);
  doc.text(splitText1, 20, yPos);
  yPos += splitText1.length * 7 + 15;

  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  const nameWidth = doc.getTextWidth(fullName) + 40;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - nameWidth) / 2, yPos - 6, nameWidth, 14, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(fullName, pageWidth / 2, yPos + 3, { align: "center" });

  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  if (contact.date_naissance) {
    doc.text(`Né(e) le ${formatDate(contact.date_naissance)}${contact.ville_naissance ? ` à ${contact.ville_naissance}` : ""}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
  }

  yPos += 8;
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text("a suivi avec succès la formation suivante :", pageWidth / 2, yPos, { align: "center" });

  yPos += 12;
  const boxHeight = session.lieu ? 60 : 50;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(30, yPos, pageWidth - 60, boxHeight, 4, 4, "F");
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
  doc.text(`Du ${formatDate(session.date_debut)} au ${formatDate(session.date_fin)}`, pageWidth / 2, yPos, { align: "center" });

  yPos += 10;
  doc.text(`Durée : ${session.duree_heures || "-"} heures`, pageWidth / 2, yPos, { align: "center" });

  if (session.lieu) {
    yPos += 10;
    doc.text(`Lieu : ${session.lieu}`, pageWidth / 2, yPos, { align: "center" });
  }

  yPos += 45;
  doc.setFontSize(11);
  doc.text(`Fait à Paris, le ${formatDate(new Date().toISOString())}`, pageWidth - 30, yPos, { align: "right" });

  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Le Directeur de l'organisme", pageWidth - 30, yPos, { align: "right" });

  yPos += 25;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("Signature et cachet", pageWidth - 30, yPos, { align: "right" });

  addFooter(doc);
  return doc;
}

// ==================== PROGRAMME PDF (avec vrais modules T3P) ====================
export function generateProgrammePDF(
  session: SessionInfo,
  company: CompanyInfo
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 30;
  let pageNumber = 1;

  const formationType = getFormationType(session.nom, session.formation_type);
  const programme = PROGRAMMES_T3P[formationType] || PROGRAMMES_T3P.VTC;

  const checkPageBreak = (neededSpace: number = 30): number => {
    if (yPos + neededSpace > pageHeight - bottomMargin) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber++;
      const newY = addHeader(doc, company);
      return newY + 5;
    }
    return yPos;
  };

  const headerEndY = addHeader(doc, company);

  // Title
  let yPos = headerEndY + 8;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const titleText = "PROGRAMME DE FORMATION";
  const titleW = doc.getTextWidth(titleText) + 30;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - titleW) / 2, yPos - 8, titleW, 14, 3, 3, "F");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(titleText, pageWidth / 2, yPos, { align: "center" });

  yPos += 12;
  doc.setFontSize(13);
  doc.text(session.nom, pageWidth / 2, yPos, { align: "center" });

  // Infos générales
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);

  // Info box
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(20, yPos - 5, pageWidth - 40, 30, 4, 4, "F");
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(20, yPos - 5, 4, 30, 2, 2, "F");

  doc.text(`Durée : ${session.duree_heures || "-"} heures`, 30, yPos + 3);
  doc.text(`Dates : Du ${formatDate(session.date_debut)} au ${formatDate(session.date_fin)}`, 30, yPos + 10);
  doc.text(`Lieu : ${session.lieu || "À définir"}`, 30, yPos + 17);

  yPos += 35;

  // Sanction de la formation
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Sanction de la formation :", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  yPos += 6;
  const sanctionLines = doc.splitTextToSize(programme.sanctionFormation, pageWidth - 40);
  doc.text(sanctionLines, 20, yPos);
  yPos += sanctionLines.length * 5 + 10;

  // Modules détaillés
  programme.modules.forEach((mod, index) => {
    yPos = checkPageBreak(35 + mod.contenu.length * 5);

    // Module header
    doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.roundedRect(20, yPos - 4, pageWidth - 40, 12, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    doc.text(mod.titre, 25, yPos + 4);

    yPos += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);

    mod.contenu.forEach((item) => {
      yPos = checkPageBreak(6);
      doc.text(`• ${item}`, 25, yPos);
      yPos += 5;
    });

    yPos += 5;
  });

  addFooter(doc, pageNumber);
  return doc;
}

// ==================== CONTRAT DE FORMATION PDF (Qualiopi / DREETS) ====================
export function generateContratFormationPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 30;
  let pageNumber = 1;

  const formationType = getFormationType(session.nom, session.formation_type);
  const programme = PROGRAMMES_T3P[formationType] || PROGRAMMES_T3P.VTC;
  const isFC = formationType.startsWith("FC-");

  const checkPageBreak = (neededSpace: number = 30): number => {
    if (yPos + neededSpace > pageHeight - bottomMargin) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber++;
      const newY = addHeader(doc, company);
      return newY + 5;
    }
    return yPos;
  };

  const addArticle = (num: number, title: string, content: string[]): void => {
    yPos = checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.text(`Article ${num} - ${title}`, 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    yPos += 6;
    for (const line of content) {
      yPos = checkPageBreak(6);
      if (line === "") { yPos += 3; continue; }
      const splitLine = doc.splitTextToSize(line, pageWidth - 40);
      doc.text(splitLine, 20, yPos);
      yPos += splitLine.length * 4.5;
    }
    yPos += 6;
  };

  const headerEndY = addHeader(doc, company);

  // Title
  let yPos = headerEndY + 8;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const titleText = "CONTRAT DE FORMATION PROFESSIONNELLE";
  const titleW = doc.getTextWidth(titleText) + 30;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - titleW) / 2, yPos - 8, titleW, 14, 3, 3, "F");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(titleText, pageWidth / 2, yPos, { align: "center" });

  yPos += 7;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("En application des articles L.6353-3 à L.6353-7 du Code du travail", pageWidth / 2, yPos, { align: "center" });

  // Parties
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("ENTRE LES SOUSSIGNÉS", 20, yPos);

  yPos += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.setFont("helvetica", "bold");
  doc.text("L'organisme de formation :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text(`${company.name} - SIRET : ${company.siret}`, 25, yPos);
  yPos += 4.5;
  doc.text(`${company.address}`, 25, yPos);
  yPos += 4.5;
  doc.text(`Déclaration d'activité N° ${company.nda} (ne vaut pas agrément de l'État)`, 25, yPos);
  yPos += 4.5;
  doc.text(`Ci-après dénommé « l'Organisme »`, 25, yPos);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Et le stagiaire :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.setFont("helvetica", "bold");
  doc.text(fullName, 25, yPos);
  doc.setFont("helvetica", "normal");
  if (contact.date_naissance) { yPos += 4.5; doc.text(`Né(e) le ${formatDate(contact.date_naissance)}${contact.ville_naissance ? ` à ${contact.ville_naissance}` : ""}`, 25, yPos); }
  if (contact.rue) { yPos += 4.5; doc.text(contact.rue, 25, yPos); }
  if (contact.code_postal || contact.ville) { yPos += 4.5; doc.text(`${contact.code_postal || ""} ${contact.ville || ""}`.trim(), 25, yPos); }
  if (contact.email) { yPos += 4.5; doc.text(`Email : ${contact.email}`, 25, yPos); }
  if (contact.telephone) { yPos += 4.5; doc.text(`Tél : ${contact.telephone}`, 25, yPos); }
  yPos += 4.5;
  doc.text(`Ci-après dénommé « le Stagiaire »`, 25, yPos);
  yPos += 8;

  // --- Article 1 - Objet ---
  addArticle(1, "Objet du contrat", [
    `Le présent contrat est conclu en application des articles L.6353-3 à L.6353-7 du Code du travail. L'Organisme s'engage à organiser l'action de formation intitulée « ${session.nom} » et le Stagiaire s'engage à suivre cette formation avec assiduité.`,
  ]);

  // --- Article 2 - Nature et caractéristiques ---
  yPos = checkPageBreak(55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Article 2 - Nature et caractéristiques de l'action de formation", 20, yPos);
  yPos += 7;

  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(20, yPos - 3, pageWidth - 40, 42, 4, 4, "F");
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(20, yPos - 3, 4, 42, 2, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`• Intitulé : ${session.nom}`, 30, yPos + 5);
  doc.text(`• Type : ${isFC ? "Formation continue (renouvellement carte professionnelle)" : "Formation initiale T3P (préparation examen CMA)"}`, 30, yPos + 11);
  doc.text(`• Dates : Du ${formatDate(session.date_debut)} au ${formatDate(session.date_fin)}`, 30, yPos + 17);
  doc.text(`• Durée : ${session.duree_heures || (isFC ? 14 : 35)} heures`, 30, yPos + 23);
  doc.text(`• Horaires : ${formatSessionHours(session)}`, 30, yPos + 29);
  doc.text(`• Lieu : ${session.lieu || "À définir"}`, 30, yPos + 35);
  yPos += 48;

  // --- Article 3 - Objectifs ---
  const objectifs = isFC
    ? [
        `La formation a pour objectif de permettre au Stagiaire de :`,
        `• Actualiser ses connaissances réglementaires pour le renouvellement de sa carte professionnelle`,
        `• Se perfectionner en sécurité routière et éco-conduite`,
        `• Mettre à jour ses compétences en gestion d'entreprise`,
        `• Renforcer sa maîtrise des langues (français et anglais professionnel)`,
        `• Maîtriser la prévention des discriminations et du harcèlement (obligation légale)`,
      ]
    : [
        `La formation a pour objectif de permettre au Stagiaire de :`,
        `• Acquérir les compétences nécessaires à l'exercice de la profession de conducteur de transport public particulier de personnes (T3P)`,
        `• Se préparer à l'examen professionnel organisé par la Chambre des Métiers et de l'Artisanat (CMA)`,
        `• Maîtriser la réglementation spécifique au métier visé`,
        `• Développer les compétences en gestion, sécurité routière, relation client et langues étrangères`,
      ];
  addArticle(3, "Objectifs pédagogiques", objectifs);

  // --- Article 4 - Prérequis ---
  const prerequis = isFC
    ? [
        `• Être titulaire d'une carte professionnelle de conducteur T3P en cours de validité`,
        `• Être titulaire du permis de conduire B en cours de validité`,
      ]
    : [
        `• Être titulaire du permis de conduire B en cours de validité (3 ans d'ancienneté ou 2 ans si conduite accompagnée)`,
        `• Être apte médicalement (visite médicale préfectorale obligatoire)`,
        `• Disposer d'un casier judiciaire compatible avec l'exercice de la profession (bulletin n°2)`,
        `• Maîtriser la langue française (compréhension et expression)`,
      ];
  addArticle(4, "Prérequis et public visé", prerequis);

  // --- Article 5 - Programme ---
  yPos = checkPageBreak(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Article 5 - Programme de formation", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  yPos += 6;
  doc.text(`La formation se décompose en ${programme.modules.length} modules pour une durée totale de ${session.duree_heures || (isFC ? 14 : 35)} heures :`, 20, yPos);
  yPos += 6;

  programme.modules.forEach(mod => {
    yPos = checkPageBreak(6);
    doc.text(`• ${mod.titre}`, 25, yPos);
    yPos += 5;
  });
  yPos += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Le programme détaillé est annexé au présent contrat.", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  yPos += 8;

  // --- Article 6 - Moyens pédagogiques et techniques ---
  addArticle(6, "Moyens pédagogiques, techniques et d'encadrement", [
    "L'Organisme met à disposition les moyens suivants :",
    "• Salle de formation équipée (vidéoprojecteur, tableau blanc, supports numériques)",
    "• Supports pédagogiques remis à chaque stagiaire (livret de formation, fiches de synthèse)",
    "• Accès à une plateforme de formation en ligne (exercices, QCM d'entraînement)",
    "• Formateurs qualifiés et expérimentés dans le domaine du transport de personnes",
    `• ${isFC ? "Véhicule de formation pour les exercices pratiques le cas échéant" : "Véhicule de formation conforme à la réglementation pour les sessions pratiques"}`,
  ]);

  // --- Article 7 - Modalités d'évaluation ---
  addArticle(7, "Modalités d'évaluation et de suivi", [
    "Le dispositif d'évaluation comprend :",
    "• Évaluation diagnostique : positionnement initial du stagiaire en début de formation",
    "• Évaluations formatives : QCM et mises en situation tout au long de la formation",
    "• Évaluation sommative : examen blanc en conditions réelles en fin de formation",
    "• Feuilles d'émargement signées par demi-journée",
    "• Attestation de fin de formation remise au stagiaire",
    "",
    `Sanction de la formation : ${programme.sanctionFormation}`,
  ]);

  // --- Article 8 - Dispositions financières ---
  const prix = session.prix || 0;
  addArticle(8, "Dispositions financières", [
    `Le coût total de la formation s'élève à ${prix.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € net de taxe.`,
    "TVA non applicable - Article 261.4.4°a du CGI.",
    "",
    "Modalités de règlement :",
    "• Le paiement peut s'effectuer par chèque, virement bancaire ou espèces",
    "• Un échéancier de paiement peut être mis en place sur demande",
    "• En cas de financement par un tiers (OPCO, CPF, Pôle Emploi), le Stagiaire fournit l'accord de prise en charge avant le début de la formation",
    "",
    "En cas de non-paiement, l'Organisme se réserve le droit de suspendre la formation après mise en demeure restée infructueuse.",
  ]);

  // --- Article 9 - Délai de rétractation ---
  addArticle(9, "Délai de rétractation", [
    `Conformément à l'article L.6353-5 du Code du travail, à compter de la date de signature du présent contrat, le Stagiaire dispose d'un délai de dix (10) jours pour se rétracter.`,
    `La rétractation doit être notifiée par lettre recommandée avec accusé de réception adressée à : ${company.name}, ${company.address}.`,
    "Aucune somme ne peut être exigée du Stagiaire avant l'expiration de ce délai.",
  ]);

  // --- Article 10 - Interruption et abandon ---
  addArticle(10, "Interruption de la formation", [
    "En cas d'abandon par le Stagiaire pour un motif non lié à un cas de force majeure :",
    "• Les heures de formation effectuées restent dues",
    "• Aucun remboursement ne sera effectué pour les heures non suivies",
    "",
    "En cas de cessation anticipée de la formation pour cause de force majeure dûment reconnue, seules les heures réalisées seront facturées au prorata.",
    "",
    "L'Organisme se réserve le droit d'exclure le Stagiaire en cas de manquement grave au règlement intérieur, sans qu'aucun remboursement ne soit dû.",
  ]);

  // --- Article 11 - Assiduité et obligations ---
  addArticle(11, "Obligations du Stagiaire", [
    "Le Stagiaire s'engage à :",
    "• Suivre la formation avec assiduité et participer activement aux activités pédagogiques",
    "• Respecter les horaires et signer les feuilles d'émargement",
    "• Respecter le règlement intérieur de l'Organisme",
    "• Se présenter muni des documents requis (pièce d'identité, permis de conduire)",
    "• Ne pas utiliser les supports de formation à des fins commerciales ou les diffuser à des tiers",
    "",
    "Toute absence non justifiée pourra entraîner la non-délivrance de l'attestation de formation.",
  ]);

  // --- Article 12 - Règlement intérieur ---
  addArticle(12, "Règlement intérieur", [
    "Le Stagiaire déclare avoir pris connaissance du règlement intérieur de l'Organisme, remis en annexe du présent contrat.",
    "Ce règlement fixe les règles d'hygiène, de sécurité, de discipline et les sanctions applicables conformément aux articles L.6352-3 et suivants du Code du travail.",
  ]);

  // --- Article 13 - Protection des données ---
  addArticle(13, "Protection des données personnelles (RGPD)", [
    "Conformément au Règlement Général sur la Protection des Données (UE 2016/679) :",
    "• Les données personnelles collectées sont traitées pour les besoins de la gestion administrative et pédagogique de la formation",
    "• Elles sont conservées pendant une durée de 5 ans après la fin de la formation",
    "• Le Stagiaire dispose d'un droit d'accès, de rectification, d'effacement et de portabilité",
    `• Contact DPO : ${company.email}`,
  ]);

  // --- Article 14 - Réclamations ---
  addArticle(14, "Réclamations et médiation", [
    `Toute réclamation relative à la formation doit être adressée par écrit à : ${company.name}, ${company.email}.`,
    "L'Organisme s'engage à accuser réception sous 48h et à apporter une réponse sous 15 jours ouvrés.",
    "",
    "En cas de litige non résolu, le Stagiaire peut recourir gratuitement au médiateur de la consommation inscrit sur la liste des médiateurs notifiée à la Commission européenne.",
  ]);

  // --- Article 15 - Droit applicable ---
  addArticle(15, "Droit applicable et attribution de compétence", [
    "Le présent contrat est régi par le droit français.",
    "En cas de contestation, et après épuisement des voies amiables, le litige sera soumis aux tribunaux compétents du ressort du siège de l'Organisme.",
  ]);

  // Signatures
  yPos += 5;
  yPos = checkPageBreak(60);
  doc.setFontSize(9);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`Fait en deux exemplaires originaux, à ${session.lieu || "Paris"}, le ${formatDate(new Date().toISOString())}`, 20, yPos);

  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("L'Organisme de formation", 25, yPos);
  doc.text("Le Stagiaire", pageWidth - 60, yPos);

  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(company.name, 25, yPos);
  doc.text(fullName, pageWidth - 60, yPos);

  yPos += 18;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("Signature et cachet", 25, yPos);
  doc.text('Mention "Lu et approuvé" + signature', pageWidth - 60, yPos);

  yPos += 10;
  doc.setFontSize(7);
  doc.text("Paraphes sur chaque page : ________    ________", pageWidth / 2, yPos, { align: "center" });

  addFooter(doc, pageNumber);
  return doc;
}

// ==================== RÈGLEMENT INTÉRIEUR PDF ====================
export function generateReglementInterieurPDF(company: CompanyInfo): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 30;
  let pageNumber = 1;

  let yPos = 0;

  const checkPageBreak = (neededSpace: number = 20): number => {
    if (yPos + neededSpace > pageHeight - bottomMargin) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber++;
      const newY = addHeader(doc, company);
      return newY + 5;
    }
    return yPos;
  };

  const headerEndY = addHeader(doc, company);

  // Title
  yPos = headerEndY + 8;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const titleText = "RÈGLEMENT INTÉRIEUR";
  const titleW = doc.getTextWidth(titleText) + 30;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - titleW) / 2, yPos - 8, titleW, 14, 3, 3, "F");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(titleText, pageWidth / 2, yPos, { align: "center" });

  yPos += 7;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("Articles L.6352-3 et suivants et R.6352-1 à R.6352-15 du Code du travail", pageWidth / 2, yPos, { align: "center" });

  // Préambule
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  const preambule = `Le présent règlement s'applique à tous les stagiaires inscrits à une formation dispensée par ${company.name}, et ce pour toute la durée de la formation suivie. Il a pour objet de définir les règles d'hygiène et de sécurité, les règles générales et permanentes relatives à la discipline ainsi que la nature et l'échelle des sanctions applicables aux stagiaires.`;
  const splitPre = doc.splitTextToSize(preambule, pageWidth - 40);
  doc.text(splitPre, 20, yPos);
  yPos += splitPre.length * 4.5 + 6;
  doc.setFont("helvetica", "normal");

  // Helper to add article content
  const addRIArticle = (num: number, title: string, items: string[]): void => {
    yPos = checkPageBreak(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.text(`Article ${num} - ${title}`, 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
    yPos += 6;
    for (const line of items) {
      yPos = checkPageBreak(5);
      if (line === "") { yPos += 2; continue; }
      const splitLine = doc.splitTextToSize(line, pageWidth - 44);
      doc.text(splitLine, 22, yPos);
      yPos += splitLine.length * 4;
    }
    yPos += 4;
  };

  addRIArticle(1, "CHAMP D'APPLICATION", [
    `Le présent règlement s'applique à l'ensemble des stagiaires inscrits à une session de formation organisée par ${company.name}, quels que soient le type de formation, sa durée et son mode de financement.`,
  ]);

  addRIArticle(2, "DISPOSITIONS GÉNÉRALES", [
    "Chaque stagiaire est tenu de respecter les dispositions du présent règlement intérieur, les instructions données par la direction et les formateurs, les consignes générales et particulières de sécurité et les règles d'hygiène applicables aux locaux.",
    "",
    "Conformément aux principes de laïcité et de neutralité, le port de signes ou de tenues par lesquels les stagiaires manifestent ostensiblement une appartenance religieuse est interdit dans l'enceinte de l'établissement.",
    "",
    "Aucun stagiaire ne doit subir de discrimination au sens de l'article L.1132-1 du Code du travail. Tout comportement discriminatoire, raciste, sexiste ou homophobe est strictement interdit et passible de sanctions.",
  ]);

  addRIArticle(3, "RÈGLES D'HYGIÈNE ET DE SÉCURITÉ", [
    "Les stagiaires doivent se présenter dans un état de propreté corporelle conforme aux règles d'hygiène, maintenir en état de propreté les locaux et le matériel, et ne pas introduire de nourriture dans les salles de formation.",
    "",
    "Consignes de sécurité :",
    "• Respecter les consignes de sécurité incendie affichées dans les locaux",
    "• Signaler immédiatement tout incident ou accident au responsable de formation",
    "• Ne pas pénétrer dans les locaux en état d'ivresse ou sous l'emprise de stupéfiants",
    "• Ne pas entraver les voies de circulation et sorties de secours",
    "• Participer aux exercices d'évacuation",
    "",
    "Il est strictement interdit de fumer et de vapoter dans l'ensemble des locaux (décret n°2006-1386).",
    "",
    "Tout accident survenu pendant la formation ou sur le trajet doit être immédiatement déclaré à l'organisme.",
    "",
    "Numéros d'urgence : SAMU 15 • Pompiers 18 • Police 17 • Urgence européenne 112",
  ]);

  addRIArticle(4, "DISCIPLINE GÉNÉRALE", [
    "Horaires et assiduité :",
    "• Respecter scrupuleusement les horaires de formation",
    "• Signer la feuille d'émargement à chaque demi-journée",
    "• En cas d'absence, prévenir l'organisme et fournir un justificatif sous 48h",
    "• Toute absence non justifiée peut entraîner la non-délivrance de l'attestation",
    "",
    "Comportement :",
    "• Adopter un comportement respectueux envers formateurs, personnel et stagiaires",
    "• Sont interdits : violences, injures, harcèlement, dégradations, vol",
    "",
    "Téléphones et appareils électroniques : éteints ou silencieux pendant les cours. Photos et enregistrements interdits sans autorisation.",
    "",
    "Les supports pédagogiques sont protégés par le droit d'auteur et strictement réservés à un usage personnel.",
    "",
    "Il est interdit de consommer de l'alcool ou des stupéfiants dans l'enceinte de l'établissement. Tout manquement entraîne une exclusion immédiate.",
  ]);

  addRIArticle(5, "REPRÉSENTATION DES STAGIAIRES", [
    "Pour les formations d'une durée supérieure à 500 heures, il est procédé simultanément à l'élection d'un délégué titulaire et d'un délégué suppléant (article L.6352-6 du Code du travail).",
  ]);

  addRIArticle(6, "SANCTIONS ET PROCÉDURES DISCIPLINAIRES", [
    "Tout manquement aux prescriptions du présent règlement pourra faire l'objet d'une sanction (article R.6352-3 du Code du travail).",
    "",
    "Échelle des sanctions par ordre croissant de gravité :",
    "1. Rappel à l'ordre oral",
    "2. Avertissement écrit",
    "3. Exclusion temporaire (1 à 3 jours)",
    "4. Exclusion définitive de la formation",
    "",
    "Procédure disciplinaire :",
    "Aucune sanction ne peut être infligée sans que le stagiaire ait été informé des griefs retenus contre lui. Le stagiaire est convoqué par LRAR et peut se faire assister lors de l'entretien. La sanction ne peut intervenir moins d'un jour franc ni plus de 15 jours après l'entretien.",
    "",
    "En cas de faute grave portant atteinte à la sécurité, une exclusion immédiate à titre conservatoire peut être prononcée.",
  ]);

  addRIArticle(7, "PROTECTION DES DONNÉES PERSONNELLES (RGPD)", [
    "Les données personnelles collectées sont utilisées pour la gestion administrative et pédagogique de la formation et les obligations réglementaires. Durée de conservation : 5 ans.",
    "",
    "Le stagiaire dispose d'un droit d'accès, rectification, suppression, opposition, limitation et portabilité.",
    `Contact : ${company.email}`,
  ]);

  addRIArticle(8, "PUBLICITÉ ET MODIFICATION DU RÈGLEMENT", [
    "Un exemplaire du présent règlement est remis à chaque stagiaire lors de son inscription. Il est affiché dans les locaux de formation et disponible sur demande.",
    `Le règlement peut être modifié à tout moment par la direction de ${company.name}. Toute modification est portée à la connaissance des stagiaires par voie d'affichage.`,
  ]);

  // Signature
  yPos += 5;
  yPos = checkPageBreak(30);
  doc.setFontSize(8);
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text(`Fait à ${company.address.split(",")[0] || "Paris"}, le ${formatDate(new Date().toISOString())}`, 20, yPos);
  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Le Directeur de l'Organisme", 20, yPos);
  yPos += 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("Signature et cachet", 20, yPos);

  addFooter(doc, pageNumber);
  return doc;
}

// ==================== GET PDF AS BASE64 ====================
export function getPdfAsBase64(doc: jsPDF): string {
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1];
  return base64;
}

// ==================== DOCUMENT TYPE MAPPING ====================
export type DocumentType = "convocation" | "attestation" | "programme" | "contrat" | "convention" | "reglement";

export function generateDocumentPDF(
  documentType: DocumentType,
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo,
  numeroCertificat?: string
): jsPDF {
  switch (documentType) {
    case "convocation":
      return generateConvocationPDF(contact, session, company);
    case "attestation":
      return generateAttestationPDF(contact, session, company, numeroCertificat);
    case "programme":
      return generateProgrammePDF(session, company);
    case "contrat":
      return generateContratFormationPDF(contact, session, company);
    case "convention":
      return generateContratFormationPDF(contact, session, company);
    case "reglement":
      return generateReglementInterieurPDF(company);
    default:
      throw new Error(`Unknown document type: ${documentType}`);
  }
}
