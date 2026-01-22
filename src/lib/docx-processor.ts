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
  session_heure_debut?: string;
  session_heure_fin?: string;
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
  const normalizeDoubleBracesToDocxtemplater = (xml: string) =>
    // Support templates written with {{nom}} by converting to docxtemplater's native {nom}
    // (more robust in Word where double braces can be split across runs).
    xml.replace(/\{\{/g, "{").replace(/\}\}/g, "}");

  const normalizeTemplateXmlInZip = (zip: PizZip) => {
    const files: string[] = Object.keys((zip as any).files ?? {});
    for (const name of files) {
      // Normalize main doc + headers/footers
      if (!/^word\/(document|header\d+|footer\d+)\.xml$/.test(name)) continue;
      const f = zip.file(name);
      if (!f) continue;

      try {
        const text = f.asText();
        const beforeCount = (text.match(/\{\{/g) ?? []).length;
        const normalized = normalizeDoubleBracesToDocxtemplater(text);
        const afterCount = (normalized.match(/\{\{/g) ?? []).length;
        if (beforeCount > 0 || afterCount > 0) {
          console.log(`[DOCX Processor] Template ${name}: '{{' occurrences before=${beforeCount} after=${afterCount}`);
        }
        if (normalized !== text) zip.file(name, normalized);
      } catch {
        // Ignore normalization errors and proceed.
      }
    }
  };

  const findKeyCaseInsensitive = (obj: Record<string, unknown>, wanted: string) => {
    const w = wanted.toLowerCase();
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase() === w) return k;
    }
    return undefined;
  };

  const normalizeSegment = (seg: string) => seg.trim().replace(/\s+/g, "_");

  // More tolerant resolver for templates authored with different casing/spaces
  // Examples that should work:
  // - {NOM} / {Nom} / {nom}
  // - {contact.Nom} / {CONTACT.nom}
  // - {session_date_debut} (same key as data)
  const getByPath = (obj: unknown, path: string) => {
    if (!path) return undefined;
    const parts = path
      .split(".")
      .map((p) => p.trim())
      .filter(Boolean);

    let cur: any = obj;
    for (const raw of parts) {
      if (cur == null) return undefined;
      const seg = normalizeSegment(raw);

      // Direct access first
      if (typeof cur === "object" && cur !== null) {
        const record = cur as Record<string, unknown>;
        if (seg in record) {
          cur = record[seg];
          continue;
        }

        // Try original segment (without underscore normalization)
        if (raw in record) {
          cur = record[raw];
          continue;
        }

        // Case-insensitive match
        const k1 = findKeyCaseInsensitive(record, seg);
        if (k1) {
          cur = record[k1];
          continue;
        }
        const k2 = findKeyCaseInsensitive(record, raw);
        if (k2) {
          cur = record[k2];
          continue;
        }
      }

      // Fallback for non-objects
      cur = (cur as any)?.[seg];
    }
    return cur;
  };

  const flattenTagTree = (node: unknown, prefix = ""): string[] => {
    if (!node || typeof node !== "object") return [];
    const out: string[] = [];
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const nextPrefix = prefix ? `${prefix}.${k}` : k;
      // Docxtemplater uses {} as leaf marker
      if (v && typeof v === "object" && Object.keys(v as object).length > 0) {
        out.push(...flattenTagTree(v, nextPrefix));
      } else {
        out.push(nextPrefix);
      }
    }
    return out;
  };

  // Read the blob as ArrayBuffer
  const arrayBuffer = await docxBlob.arrayBuffer();
  
  // Create a zip object from the DOCX file
  const zip = new PizZip(arrayBuffer);

  // Make templates authored with {{...}} compatible with docxtemplater { ... }
  normalizeTemplateXmlInZip(zip);
  
  // Create docxtemplater instance with configuration
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    stripInvalidXMLChars: true,
    // Use docxtemplater's native delimiter (we normalize {{...}} -> {...} above)
    delimiters: { start: "{", end: "}" },
    // Important: users often type "{{ nom }}" (with spaces) in Word.
    // This parser trims whitespace and also supports dot-path variables like "contact.nom".
     parser: (tag) => ({
       get: (scope) => {
         const cleaned = String(tag ?? "").trim();
         if (!cleaned) return "";
         const value = getByPath(scope, cleaned);
         return value;
       },
     }),
    // Avoid the literal string "undefined" when a tag is missing
    nullGetter: () => "",
  });

  // Debug: log detected tags (helps diagnose templates where placeholders are inside textboxes/shapes)
  try {
    const tags = (doc as any).getTags?.();
    const allTags: string[] = [];
    if (tags?.document?.tags) allTags.push(...flattenTagTree(tags.document.tags));
    for (const h of tags?.headers || []) allTags.push(...flattenTagTree(h.tags));
    for (const f of tags?.footers || []) allTags.push(...flattenTagTree(f.tags));
    console.log(`[DOCX Processor] Detected ${allTags.length} tag(s):`, allTags.slice(0, 80));
  } catch (e) {
    console.warn("[DOCX Processor] Unable to inspect DOCX tags:", e);
  }
  
  // Prepare data with fallbacks for missing values
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    data[key] = value || "";
  }

  // Provide nested scopes for templates that use dot notation (ex: {{contact.nom}})
  const structuredData: Record<string, unknown> = {
    ...data,
    contact: {
      civilite: data.civilite,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      telephone: data.telephone,
      rue: data.rue,
      code_postal: data.code_postal,
      ville: data.ville,
      date_naissance: data.date_naissance,
      ville_naissance: data.ville_naissance,
      pays_naissance: data.pays_naissance,
      numero_permis: data.numero_permis,
      prefecture_permis: data.prefecture_permis,
      date_delivrance_permis: data.date_delivrance_permis,
      numero_carte_professionnelle: data.numero_carte_professionnelle,
      prefecture_carte: data.prefecture_carte,
      date_expiration_carte: data.date_expiration_carte,
      formation: data.formation,
    },
    session: {
      nom: data.session_nom,
      date_debut: data.session_date_debut,
      date_fin: data.session_date_fin,
      lieu: data.session_lieu,
      horaires: data.session_horaires,
      heure_debut: data.session_heure_debut,
      heure_fin: data.session_heure_fin,
      formateur: data.session_formateur,
      formation_type: data.formation_type,
      duree_heures: data.duree_heures,
    },
    centre: {
      nom: data.centre_nom,
      adresse: data.centre_adresse,
      telephone: data.centre_telephone,
      email: data.centre_email,
      siret: data.centre_siret,
      nda: data.centre_nda,
    },
  };

  // Auto-handle tags with whitespace (ex: {{ nom }}) by copying values to the exact tag key
  // This avoids blanks/"undefined" when the template includes extra spaces.
  try {
    const tags = (doc as any).getTags?.();
    const allTags: string[] = [];

    if (tags?.document?.tags) allTags.push(...flattenTagTree(tags.document.tags));
    for (const h of tags?.headers || []) allTags.push(...flattenTagTree(h.tags));
    for (const f of tags?.footers || []) allTags.push(...flattenTagTree(f.tags));

    for (const original of allTags) {
      const trimmed = original.trim();
      if (!trimmed || trimmed === original) continue;

      const existing = getByPath(structuredData, original);
      if (existing != null && String(existing) !== "") continue;

      const resolved = getByPath(structuredData, trimmed);
      if (resolved != null && String(resolved) !== "") {
        // Only safe to set flat keys (docxtemplater resolves tags from root scope)
        (structuredData as any)[original] = String(resolved);
      }
    }
  } catch {
    // If inspection fails, we still proceed with rendering.
  }
  
  // Add generated date if not provided
  if (!(structuredData as any).date_generation) {
    (structuredData as any).date_generation = format(new Date(), "dd/MM/yyyy", { locale: fr });
  }
  if (!(structuredData as any).date_jour) {
    (structuredData as any).date_jour = format(new Date(), "dd MMMM yyyy", { locale: fr });
  }
  
  // Set the data
   // Avoid dumping PII in logs; keep it actionable for debugging
   console.log("[DOCX Processor] Setting data keys:", Object.keys(structuredData).sort());
  doc.setData(structuredData);
  
  try {
    // Render the document
    doc.render();
    console.log("[DOCX Processor] Document rendered successfully");
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
    heure_debut?: string;
    heure_fin?: string;
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
  
  console.log("[DOCX buildVariableData] Input contact:", JSON.stringify(contact, null, 2));
  console.log("[DOCX buildVariableData] Input session:", JSON.stringify(session, null, 2));
  console.log("[DOCX buildVariableData] Input centreFormation:", JSON.stringify(centreFormation, null, 2));

  return {
    // Contact fields (French)
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

    // English aliases (for templates using English variable names)
    student_last_name: contact.nom || "",
    student_first_name: contact.prenom || "",
    student_birth_date: formatDate(contact.date_naissance),
    student_birth_city: contact.ville_naissance || "",
    student_birth_country: contact.pays_naissance || "",
    student_phone: contact.telephone || "",
    student_email: contact.email || "",
    student_address_street: contact.rue || "",
    student_address_zip: contact.code_postal || "",
    student_address_city: contact.ville || "",
    taxi_card_number: contact.numero_carte_professionnelle || "",
    taxi_card_expiry_date: formatDate(contact.date_expiration_carte),
    taxi_card_prefecture: contact.prefecture_carte || "",

    // Aliases often used in older templates / exports (avoid "undefined" in DOCX)
    contact_civilite: contact.civilite || "",
    contact_nom: contact.nom || "",
    contact_prenom: contact.prenom || "",
    contact_email: contact.email || "",
    contact_telephone: contact.telephone || "",
    contact_rue: contact.rue || "",
    contact_code_postal: contact.code_postal || "",
    contact_ville: contact.ville || "",
    contact_date_naissance: formatDate(contact.date_naissance),
    
    // Session fields (French)
    session_nom: session?.nom || "",
    session_date_debut: formatDate(session?.date_debut),
    session_date_fin: formatDate(session?.date_fin),
    session_lieu: session?.lieu || "",
    session_horaires: session?.horaires || "",
    session_heure_debut: session?.heure_debut || "",
    session_heure_fin: session?.heure_fin || "",
    session_formateur: session?.formateur || "",
    formation_type: session?.formation_type || "",
    duree_heures: session?.duree_heures?.toString() || "",

    // English aliases for session fields
    training_start_date: formatDate(session?.date_debut),
    training_end_date: formatDate(session?.date_fin),
    training_start_time: session?.heure_debut || "",
    training_end_time: session?.heure_fin || "",
    
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
    document_issue_date: format(new Date(), "dd/MM/yyyy", { locale: fr }),
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
  const infoText = "Les variables { ... } (ou {{ ... }}) dans le document DOCX seront remplacées par les valeurs du stagiaire lors de la génération.";
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
