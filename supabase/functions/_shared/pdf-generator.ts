// PDF Generator for Supabase Edge Functions
// Simplified port of src/lib/pdf-generator.ts for server-side generation
// @ts-ignore - jsPDF for Deno
import jsPDF from "https://esm.sh/jspdf@2.5.2";

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
  formateur?: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  nda: string;
}

// ==================== COLORS ====================
const COLORS = {
  forestGreen: { r: 27, g: 77, b: 62 },
  cream: { r: 245, g: 235, b: 215 },
  creamLight: { r: 251, g: 247, b: 239 },
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
  if (session.heure_debut && session.heure_fin) {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      return `${hours}h${minutes}`;
    };
    return `${formatTime(session.heure_debut)} - ${formatTime(session.heure_fin)}`;
  }
  return "9h00 - 12h30 / 13h30 - 17h00";
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

// ==================== CONVOCATION PDF ====================
export function generateConvocationPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const headerEndY = addHeader(doc, company);

  let yPos = headerEndY + 8;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CONVOCATION A LA FORMATION", pageWidth / 2, yPos, { align: "center" });

  if (session.numero_session) {
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Réf. Session : ${session.numero_session}`, pageWidth / 2, yPos, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  yPos += 12;
  const contactBlockStartY = yPos;
  addContactBlock(doc, contact, pageWidth - 80, yPos);

  yPos = contactBlockStartY + 45;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");

  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.text(`${fullName},`, 20, yPos);

  yPos += 8;
  doc.text("Nous avons le plaisir de vous confirmer votre inscription à la formation suivante :", 20, yPos);

  // Formation box
  yPos += 12;
  const boxStartY = yPos;
  let boxContentY = yPos + 10;

  // Draw box background first
  const formationType = getFormationType(session.nom, session.formation_type);
  const programme = PROGRAMMES_T3P[formationType] || PROGRAMMES_T3P.VTC;
  const boxHeight = (session.formateur ? 7 : 0) + 48;
  
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, boxStartY, pageWidth - 40, boxHeight, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(session.nom, pageWidth / 2, boxContentY, { align: "center" });

  boxContentY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Dates : Du ${formatDateWithDay(session.date_debut)} au ${formatDateWithDay(session.date_fin)}`, 28, boxContentY);
  boxContentY += 7;
  doc.text(`Horaires : ${formatSessionHours(session)}`, 28, boxContentY);
  boxContentY += 7;
  doc.text(`Lieu : ${session.lieu || "À définir"}`, 28, boxContentY);
  boxContentY += 7;
  doc.text(`Durée totale : ${session.duree_heures || "-"} heures`, 28, boxContentY);

  if (session.formateur) {
    boxContentY += 7;
    doc.text(`Formateur : ${session.formateur}`, 28, boxContentY);
  }

  yPos = boxStartY + boxHeight + 12;

  // Documents à apporter
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Documents à apporter le jour de la formation :", 20, yPos);

  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("• Pièce d'identité en cours de validité", 25, yPos);
  yPos += 6;
  doc.text("• Permis de conduire", 25, yPos);
  yPos += 6;
  doc.text("• Attestation d'inscription (cette convocation)", 25, yPos);

  yPos += 14;
  doc.setFontSize(10);
  doc.text(`Pour toute question, contactez-nous au ${company.phone} ou par email à ${company.email}`, 20, yPos);

  yPos += 12;
  doc.text("Cordialement,", 20, yPos);
  yPos += 8;
  doc.text("L'équipe Formation", 20, yPos);

  addFooter(doc);
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
    doc.text(mod.duree, pageWidth - 30, yPos + 4, { align: "right" });

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

// ==================== CONTRAT DE FORMATION PDF ====================
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
  const titleText = "CONTRAT DE FORMATION PROFESSIONNELLE";
  const titleW = doc.getTextWidth(titleText) + 30;
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect((pageWidth - titleW) / 2, yPos - 8, titleW, 14, 3, 3, "F");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(titleText, pageWidth / 2, yPos, { align: "center" });

  yPos += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("Articles L.6353-3 à L.6353-7 du Code du travail", pageWidth / 2, yPos, { align: "center" });

  // Parties
  yPos += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("ENTRE LES SOUSSIGNÉS", 20, yPos);

  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.setFont("helvetica", "bold");
  doc.text("L'organisme de formation :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  doc.text(`${company.name} - SIRET : ${company.siret}`, 25, yPos);
  yPos += 5;
  doc.text(`${company.address}`, 25, yPos);
  yPos += 5;
  doc.text(`Déclaration d'activité N° ${company.nda}`, 25, yPos);
  yPos += 5;
  doc.text(`Ci-après dénommé "l'Organisme"`, 25, yPos);

  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Et le stagiaire :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.setFont("helvetica", "bold");
  doc.text(fullName, 25, yPos);
  doc.setFont("helvetica", "normal");
  if (contact.date_naissance) { yPos += 5; doc.text(`Né(e) le ${formatDate(contact.date_naissance)}${contact.ville_naissance ? ` à ${contact.ville_naissance}` : ""}`, 25, yPos); }
  if (contact.rue) { yPos += 5; doc.text(contact.rue, 25, yPos); }
  if (contact.code_postal || contact.ville) { yPos += 5; doc.text(`${contact.code_postal || ""} ${contact.ville || ""}`.trim(), 25, yPos); }
  if (contact.email) { yPos += 5; doc.text(`Email : ${contact.email}`, 25, yPos); }
  yPos += 5;
  doc.text(`Ci-après dénommé "le Stagiaire"`, 25, yPos);

  // Article 1 - Objet
  yPos += 12;
  yPos = checkPageBreak(30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Article 1 - Objet du contrat", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  yPos += 6;
  const art1 = `Le présent contrat est conclu en application des articles L.6353-3 à L.6353-7 du Code du travail. L'Organisme s'engage à organiser l'action de formation intitulée "${session.nom}".`;
  const splitArt1 = doc.splitTextToSize(art1, pageWidth - 40);
  doc.text(splitArt1, 20, yPos);

  // Article 2 - Nature de l'action
  yPos += splitArt1.length * 5 + 10;
  yPos = checkPageBreak(50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Article 2 - Nature et caractéristiques de l'action", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  yPos += 8;

  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(20, yPos - 3, pageWidth - 40, 42, 4, 4, "F");
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.roundedRect(20, yPos - 3, 4, 42, 2, 2, "F");

  doc.text(`• Intitulé : ${session.nom}`, 30, yPos + 5);
  doc.text(`• Dates : Du ${formatDate(session.date_debut)} au ${formatDate(session.date_fin)}`, 30, yPos + 12);
  doc.text(`• Durée : ${session.duree_heures || 35} heures`, 30, yPos + 19);
  doc.text(`• Horaires : ${formatSessionHours(session)}`, 30, yPos + 26);
  doc.text(`• Lieu : ${session.lieu || "À définir"}`, 30, yPos + 33);

  // Article 3 - Programme
  yPos += 52;
  yPos = checkPageBreak(30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Article 3 - Programme de formation", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  yPos += 6;
  doc.text(`Durée totale : ${session.duree_heures || 35} heures réparties en ${programme.modules.length} modules :`, 20, yPos);
  yPos += 6;

  programme.modules.forEach(mod => {
    yPos = checkPageBreak(6);
    doc.text(`• ${mod.titre} (${mod.duree})`, 25, yPos);
    yPos += 5;
  });

  // Article 4 - Prix
  yPos += 8;
  yPos = checkPageBreak(30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Article 4 - Dispositions financières", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  yPos += 6;
  const prix = session.prix || 0;
  doc.text(`Le coût total de la formation s'élève à ${prix.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € TTC.`, 20, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.text("TVA non applicable - Article 261.4.4°a du CGI", 20, yPos);
  doc.setFontSize(10);

  // Article 5 - Rétractation
  yPos += 10;
  yPos = checkPageBreak(25);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Article 5 - Délai de rétractation", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  yPos += 6;
  const art5 = `Conformément à l'article L.6353-5 du Code du travail, le Stagiaire dispose d'un délai de 10 jours à compter de la signature pour se rétracter par LRAR adressée à ${company.name}.`;
  const splitArt5 = doc.splitTextToSize(art5, pageWidth - 40);
  doc.text(splitArt5, 20, yPos);

  // Article 6 - Règlement intérieur
  yPos += splitArt5.length * 5 + 10;
  yPos = checkPageBreak(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text("Article 6 - Règlement intérieur", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  yPos += 6;
  doc.text("Le Stagiaire s'engage à respecter le règlement intérieur de l'organisme annexé au présent contrat.", 20, yPos);

  // Signatures
  yPos += 20;
  yPos = checkPageBreak(50);
  doc.setFontSize(10);
  doc.text(`Fait en deux exemplaires, à Paris, le ${formatDate(new Date().toISOString())}`, 20, yPos);

  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.text("L'Organisme de formation", 25, yPos);
  doc.text("Le Stagiaire", pageWidth - 60, yPos);

  yPos += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.warmGray500.r, COLORS.warmGray500.g, COLORS.warmGray500.b);
  doc.text("Signature et cachet", 25, yPos);
  doc.text("Lu et approuvé, signature", pageWidth - 60, yPos);

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
export type DocumentType = "convocation" | "attestation" | "programme" | "contrat";

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
    default:
      throw new Error(`Unknown document type: ${documentType}`);
  }
}
