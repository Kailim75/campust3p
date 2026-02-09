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

// ==================== HELPERS ====================
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric",
  };
  return date.toLocaleDateString("fr-FR", options);
}

function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  };
  return date.toLocaleDateString("fr-FR", options);
}

function formatSessionHours(session: SessionInfo): string {
  if (session.heure_debut && session.heure_fin) {
    // Format HH:MM:SS to HHhMM (e.g. "18:00:00" -> "18h00")
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

  // Bandeau header Forest Green
  doc.setFillColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Nom de l'entreprise en blanc
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text(company.name, 20, 14);

  // Coordonnées
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.text(`${company.address} | Tél: ${company.phone} | ${company.email}`, 20, 22);

  // Agréments
  doc.setFontSize(6.5);
  doc.text(`SIRET: ${company.siret} | NDA: ${company.nda}`, 20, 30);

  // Ligne accent Gold
  doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  doc.rect(0, headerHeight, pageWidth, 2, "F");

  doc.setTextColor(COLORS.warmGray800.r, COLORS.warmGray800.g, COLORS.warmGray800.b);
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
  doc.text(`Document généré le ${new Date().toLocaleDateString("fr-FR")}`, 20, pageHeight - 18);

  // Numéro de page
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

  // Title
  let yPos = headerEndY + 8;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CONVOCATION A LA FORMATION", pageWidth / 2, yPos, { align: "center" });

  // Session reference
  if (session.numero_session) {
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Réf. Session : ${session.numero_session}`, pageWidth / 2, yPos, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Destinataire
  yPos += 12;
  const contactBlockStartY = yPos;
  addContactBlock(doc, contact, pageWidth - 80, yPos);

  // Corps
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(session.nom, pageWidth / 2, boxContentY, { align: "center" });

  boxContentY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Dates : Du ${formatDateWithDay(session.date_debut)} au ${formatDateWithDay(session.date_fin)}`,
    28,
    boxContentY
  );

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

  // Dessiner le box
  const boxHeight = boxContentY - boxStartY + 8;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, boxStartY, pageWidth - 40, boxHeight, 3, 3, "F");

  // Redessiner le contenu par-dessus
  boxContentY = boxStartY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(session.nom, pageWidth / 2, boxContentY, { align: "center" });

  boxContentY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Dates : Du ${formatDateWithDay(session.date_debut)} au ${formatDateWithDay(session.date_fin)}`,
    28,
    boxContentY
  );

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

  // Contact
  yPos += 14;
  doc.setFontSize(10);
  doc.text(`Pour toute question, contactez-nous au ${company.phone} ou par email à ${company.email}`, 20, yPos);

  // Signature
  yPos += 12;
  doc.text("Cordialement,", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
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

  // Title
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
    doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
    doc.text(`N° ${numeroCertificat}`, pageWidth / 2, yPos, { align: "center" });
  }

  // Corps
  yPos += 18;
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
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(fullName, pageWidth / 2, yPos + 3, { align: "center" });

  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.warmGray600.r, COLORS.warmGray600.g, COLORS.warmGray600.b);
  if (contact.date_naissance) {
    doc.text(
      `Né(e) le ${formatDate(contact.date_naissance)}${contact.ville_naissance ? ` à ${contact.ville_naissance}` : ""}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 8;
  }

  yPos += 8;
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);
  doc.text("a suivi avec succès la formation suivante :", pageWidth / 2, yPos, { align: "center" });

  // Formation details box
  yPos += 12;
  const boxHeight = session.lieu ? 60 : 50;
  doc.setFillColor(COLORS.creamLight.r, COLORS.creamLight.g, COLORS.creamLight.b);
  doc.roundedRect(30, yPos, pageWidth - 60, boxHeight, 4, 4, "F");

  // Bordure accent
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
  doc.text(
    `Du ${formatDate(session.date_debut)} au ${formatDate(session.date_fin)}`,
    pageWidth / 2,
    yPos,
    { align: "center" }
  );

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

// ==================== PROGRAMME PDF ====================
export function generateProgrammePDF(
  session: SessionInfo,
  company: CompanyInfo
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const headerEndY = addHeader(doc, company);

  // Title
  let yPos = headerEndY + 8;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PROGRAMME DE FORMATION", pageWidth / 2, yPos, { align: "center" });

  yPos += 12;
  doc.setFontSize(14);
  doc.setTextColor(COLORS.forestGreen.r, COLORS.forestGreen.g, COLORS.forestGreen.b);
  doc.text(session.nom, pageWidth / 2, yPos, { align: "center" });

  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.warmGray700.r, COLORS.warmGray700.g, COLORS.warmGray700.b);

  // Infos générales
  doc.text(`Durée : ${session.duree_heures || "-"} heures`, 20, yPos);
  yPos += 7;
  doc.text(`Dates : Du ${formatDate(session.date_debut)} au ${formatDate(session.date_fin)}`, 20, yPos);
  yPos += 7;
  doc.text(`Lieu : ${session.lieu || "À définir"}`, 20, yPos);

  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Objectifs de la formation :", 20, yPos);

  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const objectives = [
    "Acquérir les connaissances réglementaires du transport de personnes",
    "Maîtriser les techniques de conduite professionnelle",
    "Développer les compétences en relation client",
    "Préparer l'examen T3P de la Chambre des Métiers et de l'Artisanat",
  ];

  objectives.forEach((obj) => {
    doc.text(`• ${obj}`, 25, yPos);
    yPos += 6;
  });

  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Contenu pédagogique :", 20, yPos);

  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const modules = [
    "Module 1 : Réglementation du transport de personnes",
    "Module 2 : Sécurité routière et conduite",
    "Module 3 : Gestion d'entreprise",
    "Module 4 : Relation client et communication",
    "Module 5 : Développement commercial",
  ];

  modules.forEach((mod) => {
    doc.text(`• ${mod}`, 25, yPos);
    yPos += 6;
  });

  addFooter(doc);

  return doc;
}

// ==================== GET PDF AS BASE64 ====================
export function getPdfAsBase64(doc: jsPDF): string {
  // Get the PDF as a data URI string
  const dataUri = doc.output("datauristring");
  // Extract base64 part (after "data:application/pdf;filename=generated.pdf;base64,")
  const base64 = dataUri.split(",")[1];
  return base64;
}

// ==================== DOCUMENT TYPE MAPPING ====================
export type DocumentType = "convocation" | "attestation" | "programme";

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
    default:
      throw new Error(`Unknown document type: ${documentType}`);
  }
}
