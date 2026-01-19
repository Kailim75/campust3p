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

// ==================== CONVENTION DE FORMATION PDF (Conforme DREETS/Qualiopi) ====================
// Pour les formations financées par un tiers (entreprise, OPCO, etc.)
export function generateConventionPDF(
  contact: ContactInfo,
  session: SessionInfo,
  company: CompanyInfo = DEFAULT_COMPANY
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  addHeader(doc, company);
  
  // Title
  let yPos = 55;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CONVENTION DE FORMATION PROFESSIONNELLE", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("(Articles L.6353-1 à L.6353-2 du Code du travail)", pageWidth / 2, yPos, { align: "center" });
  
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
  yPos += 5;
  doc.text(`${company.name} - SIRET : ${company.siret}`, 25, yPos);
  yPos += 4;
  doc.text(`${company.address}`, 25, yPos);
  yPos += 4;
  doc.text(`Déclaration d'activité N° ${company.nda} (ne vaut pas agrément de l'État)`, 25, yPos);
  yPos += 4;
  doc.text(`Ci-après dénommé "l'Organisme"`, 25, yPos);
  
  // Client/Stagiaire
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Et :", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const fullName = `${contact.civilite || ""} ${contact.prenom} ${contact.nom}`.trim();
  doc.text(fullName, 25, yPos);
  if (contact.rue) {
    yPos += 4;
    doc.text(contact.rue, 25, yPos);
  }
  if (contact.code_postal || contact.ville) {
    yPos += 4;
    doc.text(`${contact.code_postal || ""} ${contact.ville || ""}`.trim(), 25, yPos);
  }
  yPos += 4;
  doc.text(`Ci-après dénommé "le Bénéficiaire"`, 25, yPos);
  
  // Article 1 - Objet
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Article 1 - Objet", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const art1 = `En exécution de la présente convention, l'Organisme s'engage à organiser l'action de formation intitulée "${session.nom}".`;
  const splitArt1 = doc.splitTextToSize(art1, pageWidth - 40);
  doc.text(splitArt1, 20, yPos);
  
  // Article 2 - Nature et caractéristiques (Obligatoire DREETS)
  yPos += splitArt1.length * 4 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 2 - Nature et caractéristiques de l'action de formation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text(`• Intitulé : ${session.nom}`, 22, yPos);
  yPos += 4;
  doc.text(`• Type d'action : Action de formation au sens de l'article L.6313-1 du Code du travail`, 22, yPos);
  yPos += 4;
  doc.text(`• Dates : Du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}`, 22, yPos);
  yPos += 4;
  doc.text(`• Durée : ${session.duree_heures || "-"} heures`, 22, yPos);
  yPos += 4;
  doc.text(`• Horaires : ${formatSessionHours(session)}`, 22, yPos);
  yPos += 4;
  doc.text(`• Lieu : ${formatFullAddress(session)}`, 22, yPos);
  yPos += 4;
  doc.text(`• Modalités : Formation en présentiel`, 22, yPos);
  
  // Article 3 - Objectifs (Obligatoire Qualiopi)
  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 3 - Objectifs pédagogiques", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const objectifs = session.objectifs || "À l'issue de la formation, le stagiaire sera capable de maîtriser les compétences nécessaires à l'exercice de l'activité professionnelle visée.";
  const splitObj = doc.splitTextToSize(objectifs, pageWidth - 40);
  doc.text(splitObj, 20, yPos);
  
  // Article 4 - Programme
  yPos += splitObj.length * 4 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 4 - Programme", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("Le programme détaillé de la formation est annexé à la présente convention.", 20, yPos);
  
  // Article 5 - Prérequis (Obligatoire Qualiopi)
  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 5 - Prérequis et public visé", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const prerequis = session.prerequis || "Aucun prérequis spécifique. Public : Tout public souhaitant acquérir les compétences visées.";
  const splitPre = doc.splitTextToSize(prerequis, pageWidth - 40);
  doc.text(splitPre, 20, yPos);
  
  // Article 6 - Moyens pédagogiques (Obligatoire Qualiopi)
  yPos += splitPre.length * 4 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 6 - Moyens pédagogiques et techniques", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("• Supports de cours remis aux stagiaires", 22, yPos);
  yPos += 4;
  doc.text("• Vidéoprojecteur et tableau interactif", 22, yPos);
  yPos += 4;
  doc.text("• Mise en situation pratique et exercices", 22, yPos);
  
  // Article 7 - Évaluation (Obligatoire Qualiopi)
  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 7 - Modalités d'évaluation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("• Évaluation des acquis en cours et fin de formation", 22, yPos);
  yPos += 4;
  doc.text("• Questionnaire de satisfaction à chaud", 22, yPos);
  yPos += 4;
  doc.text("• Attestation de fin de formation remise au stagiaire", 22, yPos);
  
  // Page 2
  doc.addPage();
  addHeader(doc, company);
  yPos = 55;
  
  // Article 8 - Prix (Obligatoire DREETS)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Article 8 - Dispositions financières", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  
  const prixHT = session.prix_ht || session.prix || 0;
  const tvaPercent = session.tva_percent || 0;
  const prixTTC = calculateTTC(session);
  
  doc.text(`Le coût de la formation s'élève à :`, 20, yPos);
  yPos += 4;
  doc.text(`• Montant HT : ${prixHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
  yPos += 4;
  if (tvaPercent > 0) {
    doc.text(`• TVA (${tvaPercent}%) : ${(prixHT * tvaPercent / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
    yPos += 4;
    doc.text(`• Montant TTC : ${prixTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
  } else {
    doc.text("• TVA non applicable - Article 261.4.4°a du CGI", 25, yPos);
  }
  yPos += 6;
  doc.text("Le règlement s'effectue selon les modalités convenues entre les parties.", 20, yPos);
  
  // Article 9 - Délai de rétractation (Obligatoire)
  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Article 9 - Délai de rétractation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const art9 = "Conformément à l'article L.6353-5 du Code du travail, le stagiaire dispose d'un délai de 10 jours à compter de la signature de la présente convention pour se rétracter par lettre recommandée avec accusé de réception.";
  const splitArt9 = doc.splitTextToSize(art9, pageWidth - 40);
  doc.text(splitArt9, 20, yPos);
  
  // Article 10 - Interruption
  yPos += splitArt9.length * 4 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 10 - Cas de cessation anticipée", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const art10 = "En cas de cessation anticipée de la formation pour fait du stagiaire, seules les heures réellement effectuées seront facturées au prorata.";
  const splitArt10 = doc.splitTextToSize(art10, pageWidth - 40);
  doc.text(splitArt10, 20, yPos);
  
  // Article 11 - Litige
  yPos += splitArt10.length * 4 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 11 - Différends", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("Les parties s'engagent à rechercher une solution amiable. À défaut, le tribunal compétent sera saisi.", 20, yPos);
  
  // Règlement intérieur
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Article 12 - Règlement intérieur", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("Le stagiaire déclare avoir pris connaissance du règlement intérieur de l'organisme de formation.", 20, yPos);
  
  // Signatures
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.text(`Fait en double exemplaire à _____________, le ${format(new Date(), "dd/MM/yyyy")}`, 20, yPos);
  
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.text("Pour l'Organisme de formation", 30, yPos);
  doc.text("Le Bénéficiaire", pageWidth - 50, yPos);
  
  yPos += 5;
  doc.setFontSize(8);
  doc.text("(Cachet et signature)", 30, yPos);
  doc.text("(Signature précédée de", pageWidth - 50, yPos);
  doc.text("\"Lu et approuvé\")", pageWidth - 50, yPos + 4);
  
  addFooter(doc, 2);
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
  
  addHeader(doc, company);
  
  // Title
  let yPos = 55;
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
  yPos += 5;
  doc.text(`${company.name} - SIRET : ${company.siret}`, 25, yPos);
  yPos += 4;
  doc.text(`${company.address}`, 25, yPos);
  yPos += 4;
  doc.text(`Déclaration d'activité N° ${company.nda} enregistrée auprès du préfet de région`, 25, yPos);
  yPos += 4;
  doc.text(`(Cette déclaration ne vaut pas agrément de l'État)`, 25, yPos);
  yPos += 4;
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
  doc.text("Article 1 - Objet du contrat", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const art1 = `Le présent contrat a pour objet la réalisation par l'Organisme, au bénéfice du Stagiaire, de l'action de formation définie ci-après.`;
  const splitArt1 = doc.splitTextToSize(art1, pageWidth - 40);
  doc.text(splitArt1, 20, yPos);
  
  // Article 2 - Nature et caractéristiques (Obligatoire L.6353-4)
  yPos += splitArt1.length * 4 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 2 - Nature et caractéristiques de l'action de formation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text(`• Intitulé de la formation : ${session.nom}`, 22, yPos);
  yPos += 4;
  doc.text(`• Objectif : ${session.objectifs || "Acquisition des compétences professionnelles visées"}`, 22, yPos);
  yPos += 4;
  doc.text(`• Dates : Du ${format(new Date(session.date_debut), "dd/MM/yyyy")} au ${format(new Date(session.date_fin), "dd/MM/yyyy")}`, 22, yPos);
  yPos += 4;
  doc.text(`• Durée totale : ${session.duree_heures || "-"} heures`, 22, yPos);
  yPos += 4;
  doc.text(`• Horaires : ${formatSessionHours(session)}`, 22, yPos);
  yPos += 4;
  doc.text(`• Lieu de formation : ${formatFullAddress(session)}`, 22, yPos);
  yPos += 4;
  doc.text(`• Modalités de déroulement : En présentiel`, 22, yPos);
  
  // Article 3 - Niveau et prérequis
  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 3 - Niveau requis et public concerné", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const prerequis = session.prerequis || "Aucun prérequis spécifique n'est demandé pour cette formation.";
  const splitPre = doc.splitTextToSize(prerequis, pageWidth - 40);
  doc.text(splitPre, 20, yPos);
  
  // Page 2
  doc.addPage();
  addHeader(doc, company);
  yPos = 55;
  
  // Article 4 - Prix (Obligatoire L.6353-4)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Article 4 - Prix de la formation et modalités de paiement", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  
  const prixHT = session.prix_ht || session.prix || 0;
  const tvaPercent = session.tva_percent || 0;
  const prixTTC = calculateTTC(session);
  
  doc.text(`Le prix de la formation est fixé à :`, 20, yPos);
  yPos += 4;
  doc.text(`• Prix HT : ${prixHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
  yPos += 4;
  if (tvaPercent > 0) {
    doc.text(`• TVA (${tvaPercent}%) : ${(prixHT * tvaPercent / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
    yPos += 4;
    doc.text(`• Prix TTC : ${prixTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
  } else {
    doc.text("• TVA non applicable - Article 261.4.4°a du CGI", 25, yPos);
    yPos += 4;
    doc.text(`• Prix net à payer : ${prixHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, 25, yPos);
  }
  yPos += 6;
  doc.text("Modalités de règlement : Le paiement s'effectue à la signature du présent contrat,", 20, yPos);
  yPos += 4;
  doc.text("ou selon l'échéancier convenu entre les parties.", 20, yPos);
  
  // Article 5 - Délai de rétractation (Obligatoire L.6353-5)
  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Article 5 - Délai de rétractation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const art5 = "Conformément à l'article L.6353-5 du Code du travail, le Stagiaire dispose d'un délai de DIX JOURS à compter de la signature du présent contrat pour se rétracter. Cette rétractation doit être notifiée par lettre recommandée avec accusé de réception adressée à l'Organisme. Dans ce cas, aucune somme ne peut être exigée du Stagiaire.";
  const splitArt5 = doc.splitTextToSize(art5, pageWidth - 40);
  doc.text(splitArt5, 20, yPos);
  
  // Article 6 - Paiement anticipé (Obligatoire L.6353-6)
  yPos += splitArt5.length * 4 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 6 - Paiement anticipé", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const art6 = "Conformément à l'article L.6353-6 du Code du travail, aucun paiement ne peut être exigé avant l'expiration du délai de rétractation de 10 jours. À l'issue de ce délai, un acompte maximum de 30% du prix convenu peut être versé.";
  const splitArt6 = doc.splitTextToSize(art6, pageWidth - 40);
  doc.text(splitArt6, 20, yPos);
  
  // Article 7 - Interruption
  yPos += splitArt6.length * 4 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 7 - Interruption de la formation", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  const art7 = "En cas d'interruption de la formation pour force majeure dûment reconnue (maladie, accident...), le contrat est résilié. Seules les prestations effectivement réalisées sont dues au prorata de leur valeur prévue au contrat.";
  const splitArt7 = doc.splitTextToSize(art7, pageWidth - 40);
  doc.text(splitArt7, 20, yPos);
  
  // Article 8 - Litige
  yPos += splitArt7.length * 4 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Article 8 - Règlement des litiges", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("En cas de litige, les parties s'engagent à rechercher une solution amiable.", 20, yPos);
  yPos += 4;
  doc.text("À défaut, le litige sera porté devant les juridictions compétentes.", 20, yPos);
  
  // Article 9 - Règlement intérieur
  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Article 9 - Règlement intérieur", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  doc.text("Le Stagiaire déclare avoir pris connaissance du règlement intérieur de l'Organisme de formation", 20, yPos);
  yPos += 4;
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
  doc.text("(Cachet et signature)", 30, yPos);
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
