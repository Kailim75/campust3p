import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  nda: string; // Numéro déclaration activité
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

// Helper functions
function addHeader(doc: jsPDF, company: CompanyInfo) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(company.name, 20, 20);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(company.address, 20, 27);
  doc.text(`Tel: ${company.phone} | Email: ${company.email}`, 20, 33);
  doc.text(`SIRET: ${company.siret} | NDA: ${company.nda}`, 20, 39);
  doc.setTextColor(0);
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(20, 45, pageWidth - 20, 45);
}

function addFooter(doc: jsPDF, pageNum: number = 1) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Document genere le ${format(new Date(), "dd/MM/yyyy 'a' HH:mm")}`, 20, pageHeight - 15);
  doc.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 15, { align: "right" });
  doc.setTextColor(0);
}

function addContactBlock(doc: jsPDF, contact: ContactInfo, x: number, y: number, title: string = "Participant"): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;
  
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.text(fullName, x, y);
  
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
  
  return y + 10;
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
  
  addHeader(doc, company);
  
  // Title
  let yPos = 55;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.text(facture.numero_facture, pageWidth / 2, yPos, { align: "center" });
  
  // Contact info
  yPos += 15;
  yPos = addContactBlock(doc, contact, 20, yPos, "Facturer a");
  
  // Dates on the right
  doc.setFontSize(9);
  doc.text(`Date d'emission: ${facture.date_emission ? format(new Date(facture.date_emission), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}`, pageWidth - 20, 70, { align: "right" });
  if (facture.date_echeance) {
    doc.text(`Date d'echeance: ${format(new Date(facture.date_echeance), "dd/MM/yyyy")}`, pageWidth - 20, 76, { align: "right" });
  }
  
  // Table
  yPos = Math.max(yPos, 95);
  doc.setLineWidth(0.3);
  doc.setDrawColor(200);
  
  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(20, yPos, pageWidth - 40, 10, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Description", 25, yPos + 7);
  doc.text("Montant HT", pageWidth - 25, yPos + 7, { align: "right" });
  
  // Table content
  yPos += 15;
  doc.setFont("helvetica", "normal");
  
  const description = session 
    ? `Formation: ${session.nom}\nDu ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}\nDuree: ${session.duree_heures || "-"} heures`
    : "Formation professionnelle";
  
  const lines = description.split("\n");
  lines.forEach((line, i) => {
    doc.text(line, 25, yPos + (i * 5));
  });
  
  doc.text(`${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR`, pageWidth - 25, yPos, { align: "right" });
  
  // Financement info
  yPos += lines.length * 5 + 5;
  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.text(`Mode de financement: ${getFinancementLabel(facture.type_financement)}`, 25, yPos);
  doc.setTextColor(0);
  
  // Totals
  yPos += 20;
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 80, yPos - 5, pageWidth - 20, yPos - 5);
  
  doc.setFontSize(10);
  doc.text("Total HT:", pageWidth - 75, yPos);
  doc.text(`${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 7;
  doc.text("TVA (0%):", pageWidth - 75, yPos);
  doc.text("0,00 EUR", pageWidth - 25, yPos, { align: "right" });
  
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Total TTC:", pageWidth - 75, yPos);
  doc.text(`${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR`, pageWidth - 25, yPos, { align: "right" });
  
  // Payment status
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const montantRestant = Number(facture.montant_total) - facture.total_paye;
  
  if (facture.total_paye > 0) {
    doc.setTextColor(34, 139, 34);
    doc.text(`Montant deja paye: ${facture.total_paye.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR`, pageWidth - 75, yPos);
    doc.setTextColor(0);
    yPos += 6;
  }
  
  if (montantRestant > 0) {
    doc.setTextColor(220, 53, 69);
    doc.setFont("helvetica", "bold");
    doc.text(`Reste a payer: ${montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR`, pageWidth - 75, yPos);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
  }
  
  // Comments
  if (facture.commentaires) {
    yPos += 20;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Observations:", 20, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 6;
    const splitComments = doc.splitTextToSize(facture.commentaires, pageWidth - 40);
    doc.text(splitComments, 20, yPos);
  }
  
  // Legal mentions
  yPos = 250;
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("TVA non applicable - Article 261.4.4 a du CGI", 20, yPos);
  doc.text("En cas de retard de paiement, une penalite de 3 fois le taux d'interet legal sera appliquee.", 20, yPos + 4);
  
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
  
  addHeader(doc, company);
  
  // Title
  let yPos = 60;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ATTESTATION DE FORMATION", pageWidth / 2, yPos, { align: "center" });
  
  // Body
  yPos += 25;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const text1 = `Je soussigne, representant de ${company.name}, organisme de formation declare sous le numero ${company.nda}, atteste que :`;
  const splitText1 = doc.splitTextToSize(text1, pageWidth - 40);
  doc.text(splitText1, 20, yPos);
  yPos += splitText1.length * 6 + 10;
  
  // Participant info
  doc.setFont("helvetica", "bold");
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.text(fullName, pageWidth / 2, yPos, { align: "center" });
  
  yPos += 8;
  doc.setFont("helvetica", "normal");
  if (contact.date_naissance) {
    doc.text(`Ne(e) le ${format(new Date(contact.date_naissance), "dd MMMM yyyy", { locale: fr })}${contact.ville_naissance ? ` a ${contact.ville_naissance}` : ""}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
  }
  
  yPos += 10;
  doc.text("a suivi avec succes la formation suivante :", pageWidth / 2, yPos, { align: "center" });
  
  // Formation details box
  yPos += 15;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(30, yPos, pageWidth - 60, 50, 3, 3, "F");
  
  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(session.nom, pageWidth / 2, yPos, { align: "center" });
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Du ${format(new Date(session.date_debut), "dd MMMM yyyy", { locale: fr })} au ${format(new Date(session.date_fin), "dd MMMM yyyy", { locale: fr })}`, pageWidth / 2, yPos, { align: "center" });
  
  yPos += 8;
  doc.text(`Duree : ${session.duree_heures || "-"} heures`, pageWidth / 2, yPos, { align: "center" });
  
  if (session.lieu) {
    yPos += 8;
    doc.text(`Lieu : ${session.lieu}`, pageWidth / 2, yPos, { align: "center" });
  }
  
  // Date and signature
  yPos += 40;
  doc.setFontSize(10);
  doc.text(`Fait a Paris, le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, pageWidth - 30, yPos, { align: "right" });
  
  yPos += 15;
  doc.text("Le Directeur de l'organisme", pageWidth - 30, yPos, { align: "right" });
  
  yPos += 25;
  doc.setFont("helvetica", "italic");
  doc.text("Signature et cachet", pageWidth - 30, yPos, { align: "right" });
  
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

// ==================== CONVENTION PDF ====================
export function generateConventionPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo = DEFAULT_COMPANY
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  addHeader(doc, company);
  
  // Title with session number
  let yPos = 55;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CONVENTION DE FORMATION PROFESSIONNELLE", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("(Article L.6353-1 et suivants du Code du travail)", pageWidth / 2, yPos, { align: "center" });
  
  // Session number badge
  if (session.numero_session) {
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Réf. Session : ${session.numero_session}`, pageWidth / 2, yPos, { align: "center" });
    doc.setTextColor(0);
  }
  
  // Parties
  yPos += 15;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNES :", 20, yPos);
  
  yPos += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  // Organisme
  doc.setFont("helvetica", "bold");
  doc.text("L'organisme de formation :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  doc.text(`${company.name}`, 25, yPos);
  yPos += 5;
  doc.text(`${company.address}`, 25, yPos);
  yPos += 5;
  doc.text(`SIRET : ${company.siret} - NDA : ${company.nda}`, 25, yPos);
  yPos += 5;
  doc.text("Ci-apres denomme \"l'Organisme\"", 25, yPos);
  
  // Stagiaire
  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Et le stagiaire :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.text(fullName, 25, yPos);
  if (contact.rue) {
    yPos += 5;
    doc.text(contact.rue, 25, yPos);
  }
  if (contact.code_postal || contact.ville) {
    yPos += 5;
    doc.text(`${contact.code_postal || ""} ${contact.ville || ""}`.trim(), 25, yPos);
  }
  yPos += 5;
  doc.text("Ci-apres denomme \"le Stagiaire\"", 25, yPos);
  
  // Article 1
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Article 1 - Objet de la convention", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  const article1 = `Le Stagiaire suivra la formation "${session.nom}" organisee par l'Organisme.`;
  const splitArticle1 = doc.splitTextToSize(article1, pageWidth - 40);
  doc.text(splitArticle1, 20, yPos);
  
  // Article 2 - Enrichi
  yPos += splitArticle1.length * 5 + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Article 2 - Nature et caracteristiques de l'action", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(`- Intitule : ${session.nom}`, 25, yPos);
  if (session.numero_session) {
    yPos += 5;
    doc.text(`- Numero de session : ${session.numero_session}`, 25, yPos);
  }
  yPos += 5;
  doc.text(`- Dates : Du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}`, 25, yPos);
  yPos += 5;
  doc.text(`- Horaires : ${formatSessionHours(session)}`, 25, yPos);
  yPos += 5;
  doc.text(`- Duree : ${session.duree_heures || "-"} heures`, 25, yPos);
  yPos += 5;
  doc.text(`- Lieu : ${formatFullAddress(session)}`, 25, yPos);
  if (session.formateur) {
    yPos += 5;
    doc.text(`- Formateur : ${session.formateur}`, 25, yPos);
  }
  
  // Objectifs et prérequis
  if (session.objectifs) {
    yPos += 8;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const objectifsText = doc.splitTextToSize(`Objectifs : ${session.objectifs}`, pageWidth - 50);
    doc.text(objectifsText, 25, yPos);
    yPos += objectifsText.length * 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  }
  
  // Article 3 - Prix enrichi
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Article 3 - Prix de la formation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  
  const prixHT = session.prix_ht || session.prix || 0;
  const tvaPercent = session.tva_percent || 0;
  const prixTTC = calculateTTC(session);
  
  doc.text(`Le prix de la formation est fixe a :`, 25, yPos);
  yPos += 5;
  doc.text(`- Montant HT : ${prixHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR`, 30, yPos);
  yPos += 5;
  if (tvaPercent > 0) {
    doc.text(`- TVA (${tvaPercent}%) : ${(prixHT * tvaPercent / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR`, 30, yPos);
    yPos += 5;
    doc.text(`- Montant TTC : ${prixTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR`, 30, yPos);
  } else {
    doc.text("TVA non applicable - Article 261.4.4 a du CGI", 30, yPos);
  }
  
  // Article 4
  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Article 4 - Delai de retractation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  const article4 = "Le Stagiaire dispose d'un delai de 14 jours calendaires a compter de la signature de la presente convention pour exercer son droit de retractation sans frais.";
  const splitArticle4 = doc.splitTextToSize(article4, pageWidth - 40);
  doc.text(splitArticle4, 20, yPos);
  
  // Signatures
  yPos = 240;
  doc.setFont("helvetica", "bold");
  doc.text(`Fait a Paris, le ${format(new Date(), "dd/MM/yyyy")}`, 20, yPos);
  
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.text("Pour l'Organisme", 40, yPos);
  doc.text("Le Stagiaire", pageWidth - 60, yPos);
  
  yPos += 5;
  doc.setFontSize(8);
  doc.text("(Signature et cachet)", 40, yPos);
  doc.text("(Signature precedee de", pageWidth - 60, yPos);
  doc.text("\"Lu et approuve\")", pageWidth - 60, yPos + 4);
  
  addFooter(doc);
  
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
  
  addHeader(doc, company);
  
  // Title with session reference
  let yPos = 55;
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
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.text(`${fullName},`, 20, yPos);
  
  yPos += 10;
  const intro = `Nous avons le plaisir de vous confirmer votre inscription a la formation suivante :`;
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
  doc.setFontSize(10);
  doc.text(`Dates : Du ${format(new Date(session.date_debut), "EEEE dd MMMM yyyy", { locale: fr })} au ${format(new Date(session.date_fin), "EEEE dd MMMM yyyy", { locale: fr })}`, 30, yPos);
  
  yPos += 8;
  doc.text(`Horaires : ${formatSessionHours(session)}`, 30, yPos);
  
  yPos += 8;
  doc.text(`Lieu : ${formatFullAddress(session)}`, 30, yPos);
  
  yPos += 8;
  doc.text(`Duree totale : ${session.duree_heures || "-"} heures`, 30, yPos);
  
  if (session.formateur) {
    yPos += 8;
    doc.text(`Formateur : ${session.formateur}`, 30, yPos);
  }
  
  // Documents a apporter
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Documents a apporter le jour de la formation :", 20, yPos);
  
  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("- Piece d'identite en cours de validite", 25, yPos);
  yPos += 6;
  doc.text("- Permis de conduire", 25, yPos);
  yPos += 6;
  doc.text("- Attestation d'inscription (cette convocation)", 25, yPos);
  
  // Prérequis si présents
  if (session.prerequis) {
    yPos += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Prerequis :", 20, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 6;
    const prerequisText = doc.splitTextToSize(session.prerequis, pageWidth - 50);
    doc.text(prerequisText, 25, yPos);
    yPos += prerequisText.length * 5;
  }
  
  // Contact
  yPos = Math.min(yPos + 15, 230);
  doc.text(`Pour toute question, contactez-nous au ${company.phone} ou par email a ${company.email}`, 20, yPos);
  
  // Signature
  yPos += 20;
  doc.text("Cordialement,", 20, yPos);
  yPos += 15;
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
