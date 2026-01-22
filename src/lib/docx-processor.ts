import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface DocxVariableData {
  // Contact fields
  civilite?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  rue?: string;
  code_postal?: string;
  ville?: string;
  date_naissance?: string;
  ville_naissance?: string;
  pays_naissance?: string;
  numero_permis?: string;
  prefecture_permis?: string;
  date_delivrance_permis?: string;
  numero_carte_professionnelle?: string;
  prefecture_carte?: string;
  date_expiration_carte?: string;
  formation?: string;
  
  // Session fields
  session_nom?: string;
  session_date_debut?: string;
  session_date_fin?: string;
  session_lieu?: string;
  session_horaires?: string;
  session_formateur?: string;
  formation_type?: string;
  duree_heures?: string;
  
  // Centre formation fields
  centre_nom?: string;
  centre_adresse?: string;
  centre_telephone?: string;
  centre_email?: string;
  centre_siret?: string;
  centre_nda?: string;
  
  // Date fields
  date_generation?: string;
  date_jour?: string;
  
  // Custom fields (allow any additional)
  [key: string]: string | undefined;
}

/**
 * Process a DOCX file with variable replacement using docxtemplater
 * @param docxBlob The original DOCX file as a Blob
 * @param variables Object containing variable values to replace
 * @returns Processed DOCX as Blob
 */
export async function processDocxWithVariables(
  docxBlob: Blob,
  variables: DocxVariableData
): Promise<Blob> {
  // Read the blob as ArrayBuffer
  const arrayBuffer = await docxBlob.arrayBuffer();
  
  // Create a zip object from the DOCX file
  const zip = new PizZip(arrayBuffer);
  
  // Create docxtemplater instance with configuration
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Use custom delimiters to match {{variable}} syntax
    delimiters: {
      start: "{{",
      end: "}}",
    },
  });
  
  // Prepare data with fallbacks for missing values
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    data[key] = value || "";
  }
  
  // Add generated date if not provided
  if (!data.date_generation) {
    data.date_generation = format(new Date(), "dd/MM/yyyy", { locale: fr });
  }
  if (!data.date_jour) {
    data.date_jour = format(new Date(), "dd MMMM yyyy", { locale: fr });
  }
  
  // Set the data
  doc.setData(data);
  
  try {
    // Render the document
    doc.render();
  } catch (error) {
    console.error("Error rendering DOCX template:", error);
    throw new Error("Erreur lors du traitement du modèle DOCX. Vérifiez que les variables sont correctement formatées.");
  }
  
  // Generate the output DOCX
  const output = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  
  return output;
}

/**
 * Build variable data from contact and session info
 */
export function buildVariableData(
  contact: {
    civilite?: string;
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    rue?: string;
    code_postal?: string;
    ville?: string;
    date_naissance?: string;
    ville_naissance?: string;
    pays_naissance?: string;
    numero_permis?: string;
    prefecture_permis?: string;
    date_delivrance_permis?: string;
    numero_carte_professionnelle?: string;
    prefecture_carte?: string;
    date_expiration_carte?: string;
    formation?: string;
  },
  session?: {
    nom?: string;
    date_debut?: string;
    date_fin?: string;
    lieu?: string;
    horaires?: string;
    formateur?: string;
    formation_type?: string;
    duree_heures?: number;
  },
  centreFormation?: {
    nom?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    siret?: string;
    nda?: string;
  }
): DocxVariableData {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
    } catch {
      return dateStr;
    }
  };
  
  return {
    // Contact fields
    civilite: contact.civilite || "",
    nom: contact.nom || "",
    prenom: contact.prenom || "",
    email: contact.email || "",
    telephone: contact.telephone || "",
    rue: contact.rue || "",
    code_postal: contact.code_postal || "",
    ville: contact.ville || "",
    date_naissance: formatDate(contact.date_naissance),
    ville_naissance: contact.ville_naissance || "",
    pays_naissance: contact.pays_naissance || "",
    numero_permis: contact.numero_permis || "",
    prefecture_permis: contact.prefecture_permis || "",
    date_delivrance_permis: formatDate(contact.date_delivrance_permis),
    numero_carte_professionnelle: contact.numero_carte_professionnelle || "",
    prefecture_carte: contact.prefecture_carte || "",
    date_expiration_carte: formatDate(contact.date_expiration_carte),
    formation: contact.formation || "",
    
    // Session fields
    session_nom: session?.nom || "",
    session_date_debut: formatDate(session?.date_debut),
    session_date_fin: formatDate(session?.date_fin),
    session_lieu: session?.lieu || "",
    session_horaires: session?.horaires || "",
    session_formateur: session?.formateur || "",
    formation_type: session?.formation_type || "",
    duree_heures: session?.duree_heures?.toString() || "",
    
    // Centre formation fields
    centre_nom: centreFormation?.nom || "",
    centre_adresse: centreFormation?.adresse || "",
    centre_telephone: centreFormation?.telephone || "",
    centre_email: centreFormation?.email || "",
    centre_siret: centreFormation?.siret || "",
    centre_nda: centreFormation?.nda || "",
    
    // Auto-generated date fields
    date_generation: format(new Date(), "dd/MM/yyyy", { locale: fr }),
    date_jour: format(new Date(), "dd MMMM yyyy", { locale: fr }),
  };
}

/**
 * Convert DOCX content to a simple PDF preview
 * Since browser can't natively display DOCX, we create a PDF preview showing
 * that the document will be generated with the variables replaced
 */
export function createDocxPreviewPDF(
  templateName: string,
  variables: DocxVariableData
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 35, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Aperçu du document DOCX", margin, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Modèle: ${templateName}`, margin, 30);
  
  // Reset colors
  doc.setTextColor(0, 0, 0);
  
  let y = 50;
  
  // Info box
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "F");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("📋 Prévisualisation", margin + 5, y + 10);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const infoText = "Les variables {{...}} dans le document DOCX seront remplacées par les valeurs du stagiaire lors de la génération.";
  const infoLines = doc.splitTextToSize(infoText, pageWidth - margin * 2 - 10);
  doc.text(infoLines, margin + 5, y + 20);
  
  y += 45;
  
  // Variables section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Variables utilisées :", margin, y);
  y += 10;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // Group relevant variables
  const groups = [
    {
      title: "Stagiaire",
      fields: [
        { key: "civilite", label: "Civilité" },
        { key: "nom", label: "Nom" },
        { key: "prenom", label: "Prénom" },
        { key: "email", label: "Email" },
        { key: "telephone", label: "Téléphone" },
        { key: "date_naissance", label: "Date de naissance" },
      ],
    },
    {
      title: "Adresse",
      fields: [
        { key: "rue", label: "Rue" },
        { key: "code_postal", label: "Code postal" },
        { key: "ville", label: "Ville" },
      ],
    },
    {
      title: "Session",
      fields: [
        { key: "session_nom", label: "Nom session" },
        { key: "formation_type", label: "Type formation" },
        { key: "session_date_debut", label: "Date début" },
        { key: "session_date_fin", label: "Date fin" },
        { key: "session_lieu", label: "Lieu" },
      ],
    },
  ];
  
  for (const group of groups) {
    // Check if any field in this group has a value
    const hasValues = group.fields.some(f => variables[f.key]);
    if (!hasValues) continue;
    
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, "F");
    
    doc.setFont("helvetica", "bold");
    doc.text(group.title, margin + 3, y + 5.5);
    y += 12;
    
    doc.setFont("helvetica", "normal");
    for (const field of group.fields) {
      const value = variables[field.key];
      if (value) {
        doc.setTextColor(100, 100, 100);
        doc.text(`{{${field.key}}}`, margin + 5, y);
        doc.setTextColor(0, 0, 0);
        doc.text("→", margin + 55, y);
        doc.text(value, margin + 65, y);
        y += 6;
        
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      }
    }
    y += 5;
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`,
    margin,
    285
  );
  
  return doc;
}
