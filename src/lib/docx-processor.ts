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
  
  // Véhicule fields (pour contrats de location)
  vehicule_immatriculation?: string;
  vehicule_marque?: string;
  vehicule_modele?: string;
  vehicule_type?: string;
  
  // Contrat de location fields
  contrat_numero?: string;
  contrat_date_debut?: string;
  contrat_date_fin?: string;
  contrat_montant_mensuel?: string;
  contrat_montant_caution?: string;
  contrat_objet?: string;
  
  // Date fields
  date_generation?: string;
  date_jour?: string;
  
  // Custom fields (allow any additional)
  [key: string]: string | undefined;
}

export interface ProcessDocxOptions {
  /** If true, throws an error when placeholders remain unreplaced in the final document */
  strictMode?: boolean;
  /** If true, logs detailed diagnostics to the console */
  verbose?: boolean;
}

export interface ProcessDocxResult {
  blob: Blob;
  /** Placeholders that were found but remained empty (value was "") */
  emptyPlaceholders: string[];
  /** Placeholders that couldn't be resolved (not found in data) */
  unresolvedPlaceholders: string[];
  /** All placeholders detected in the template */
  allPlaceholders: string[];
}

/**
 * Process a DOCX file with variable replacement using docxtemplater
 * @param docxBlob The original DOCX file as a Blob
 * @param variables Object containing variable values to replace
 * @param options Processing options (strictMode, verbose)
 * @returns Processed DOCX as Blob (or ProcessDocxResult if you need diagnostics)
 */
export async function processDocxWithVariables(
  docxBlob: Blob,
  variables: DocxVariableData,
  options: ProcessDocxOptions = {}
): Promise<Blob> {
  const { strictMode = false, verbose = true } = options;
  const normalizeDoubleBracesToDocxtemplater = (xml: string) =>
    // Support templates written with {{nom}} by converting to docxtemplater's native {nom}
    // (more robust in Word where double braces can be split across runs).
    xml.replace(/\{\{/g, "{").replace(/\}\}/g, "}");

  // Fix XML run splits: Word often breaks {{variable}} across multiple XML runs like:
  // <w:r><w:t>{</w:t></w:r><w:r><w:t>{nom</w:t></w:r><w:r><w:t>}}</w:t></w:r>
  // This function merges adjacent text runs to reconstitute placeholders
  const fixXmlRunSplits = (xml: string): string => {
    // Pattern to find sequences of adjacent w:t elements within w:r elements
    // We'll merge text content when it looks like it contains partial placeholders
    
    // First, normalize double braces split across runs
    // Match pattern: </w:t></w:r><w:r...><w:t> and check if it's breaking a placeholder
    let result = xml;
    
    // Simple approach: remove XML tags between { and } to merge them
    // Look for patterns like: {</w:t></w:r>...<w:r><w:t>{ or }</w:t></w:r>...<w:r><w:t>}
    const placeholderSplitPattern = /(\{+)(<\/w:t><\/w:r>(?:<w:r[^>]*>)?<w:t[^>]*>)(\{*)/g;
    result = result.replace(placeholderSplitPattern, (_, open, middle, extra) => {
      return open + (extra || '');
    });
    
    // Fix closing braces split across runs
    const closingSplitPattern = /(\}+)(<\/w:t><\/w:r>(?:<w:r[^>]*>)?<w:t[^>]*>)(\}+)/g;
    result = result.replace(closingSplitPattern, (_, close1, middle, close2) => {
      return close1 + close2;
    });
    
    return result;
  };

  const normalizeTemplateXmlInZip = (zip: PizZip) => {
    const files: string[] = Object.keys((zip as any).files ?? {});
    for (const name of files) {
      // Normalize main doc + headers/footers + also handle diagrams/drawings which may contain textboxes
      if (!/^word\/(document|header\d+|footer\d+)\.xml$/.test(name) && 
          !/^word\/diagrams\//.test(name) &&
          !/^word\/drawings\//.test(name)) continue;
      const f = zip.file(name);
      if (!f) continue;

      try {
        let text = f.asText();
        const beforeCount = (text.match(/\{\{/g) ?? []).length;
        
        // Fix XML run splits first
        text = fixXmlRunSplits(text);
        
        // Then normalize {{ to {
        const normalized = normalizeDoubleBracesToDocxtemplater(text);
        const afterCount = (normalized.match(/\{\{/g) ?? []).length;
        
        if (beforeCount > 0 || afterCount !== beforeCount) {
          console.log(`[DOCX Processor] Template ${name}: '{{' occurrences before=${beforeCount} after=${afterCount}`);
        }
        if (normalized !== text) zip.file(name, normalized);
      } catch (err) {
        console.warn(`[DOCX Processor] Error normalizing ${name}:`, err);
        // Continue with other files
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
  
  console.log(`[DOCX Processor] Processing DOCX file (${(docxBlob.size / 1024 / 1024).toFixed(2)} MB)`);
  
  // Create a zip object from the DOCX file
  let zip: PizZip;
  try {
    zip = new PizZip(arrayBuffer);
  } catch (zipError) {
    console.error("[DOCX Processor] Error reading DOCX as ZIP:", zipError);
    throw new Error("Erreur de lecture du fichier DOCX. Le fichier est peut-être corrompu.");
  }

  // Log zip contents for debugging large files
  const zipFiles = Object.keys((zip as any).files ?? {});
  console.log(`[DOCX Processor] ZIP contains ${zipFiles.length} files:`, zipFiles.filter(f => f.startsWith('word/')).slice(0, 20));

  // Make templates authored with {{...}} compatible with docxtemplater { ... }
  normalizeTemplateXmlInZip(zip);
  
  // Create docxtemplater instance with configuration
  let doc: Docxtemplater;
  try {
    doc = new Docxtemplater(zip, {
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
  } catch (docError) {
    console.error("[DOCX Processor] Error initializing docxtemplater:", docError);
    throw new Error("Erreur d'initialisation du processeur DOCX. Le template est peut-être mal formaté.");
  }
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
      // Champs principaux
      civilite: data.civilite,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      telephone: data.telephone,
      rue: data.rue,
      code_postal: data.code_postal,
      ville: data.ville,
      adresse: data.adresse || data.adresse_complete,
      adresse_complete: data.adresse_complete || data.adresse,
      adresse_apprenant: data.adresse_apprenant || data.adresse,
      cp: data.code_postal,
      
      // Naissance - toutes variantes
      date_naissance: data.date_naissance,
      ville_naissance: data.ville_naissance,
      pays_naissance: data.pays_naissance,
      pays: data.pays_naissance || data.pays,
      lieu_naissance: data.lieu_naissance,
      ne_le: data.ne_le || data.date_naissance,
      ne_a: data.ne_a || data.ville_naissance,
      date_de_naissance: data.date_de_naissance || data.date_naissance,
      ville_de_naissance: data.ville_de_naissance || data.ville_naissance,
      pays_de_naissance: data.pays_de_naissance || data.pays_naissance,
      lieu_de_naissance: data.lieu_de_naissance || data.lieu_naissance,
      DATE_NAISSANCE: data.date_naissance,
      LIEU_NAISSANCE: data.lieu_naissance,
      VILLE_NAISSANCE: data.ville_naissance,
      PAYS_NAISSANCE: data.pays_naissance,
      PAYS: data.pays_naissance,
      
      // Permis
      numero_permis: data.numero_permis,
      prefecture_permis: data.prefecture_permis,
      date_delivrance_permis: data.date_delivrance_permis,
      permis_numero: data.permis_numero || data.numero_permis,
      permis_prefecture: data.permis_prefecture || data.prefecture_permis,
      permis_date: data.permis_date || data.date_delivrance_permis,
      
      // Carte professionnelle - toutes variantes
      numero_carte_professionnelle: data.numero_carte_professionnelle,
      prefecture_carte: data.prefecture_carte,
      date_expiration_carte: data.date_expiration_carte,
      numero_carte: data.numero_carte || data.numero_carte_professionnelle,
      carte_pro: data.carte_pro || data.numero_carte_professionnelle,
      carte_professionnelle: data.carte_professionnelle || data.numero_carte_professionnelle,
      carte_numero: data.carte_numero || data.numero_carte_professionnelle,
      carte_prefecture: data.carte_prefecture || data.prefecture_carte,
      carte_expiration: data.carte_expiration || data.date_expiration_carte,
      n_carte: data.n_carte || data.numero_carte_professionnelle,
      no_carte: data.no_carte || data.numero_carte_professionnelle,
      num_carte: data.num_carte || data.numero_carte_professionnelle,
      carte_taxi: data.carte_taxi || data.numero_carte_professionnelle,
      carte_vtc: data.carte_vtc || data.numero_carte_professionnelle,
      numero_taxi: data.numero_taxi || data.numero_carte_professionnelle,
      numero_vtc: data.numero_vtc || data.numero_carte_professionnelle,
      NUMERO_CARTE_PROFESSIONNELLE: data.numero_carte_professionnelle,
      NUMERO_CARTE: data.numero_carte_professionnelle,
      CARTE_PRO: data.numero_carte_professionnelle,
      DATE_EXPIRATION_CARTE: data.date_expiration_carte,
      PREFECTURE_CARTE: data.prefecture_carte,
      prefecture_delivrance_carte: data.prefecture_carte,
      
      formation: data.formation,
      
      // Nom complet variantes
      nom_complet: data.nom_complet,
      nom_prenom: data.nom_prenom,
      prenom_nom: data.prenom_nom,
    },
    // Apprenant (alias pour contact - utilisé dans templates Mobilité)
    apprenant: {
      nom: data.nom,
      prenom: data.prenom,
      civilite: data.civilite,
      adresse: data.adresse || data.adresse_complete,
      rue: data.rue,
      code_postal: data.code_postal,
      ville: data.ville,
      date_naissance: data.date_naissance,
      lieu_naissance: data.lieu_naissance,
      ville_naissance: data.ville_naissance,
      pays_naissance: data.pays_naissance,
      pays: data.pays_naissance,
      numero_carte: data.numero_carte_professionnelle,
      carte_pro: data.numero_carte_professionnelle,
      prefecture_carte: data.prefecture_carte,
      date_expiration_carte: data.date_expiration_carte,
    },
    // Stagiaire (autre alias pour contact)
    stagiaire: {
      nom: data.nom,
      prenom: data.prenom,
      civilite: data.civilite,
      adresse: data.adresse || data.adresse_complete,
      rue: data.rue,
      code_postal: data.code_postal,
      ville: data.ville,
      date_naissance: data.date_naissance,
      lieu_naissance: data.lieu_naissance,
      ville_naissance: data.ville_naissance,
      pays_naissance: data.pays_naissance,
      pays: data.pays_naissance,
    },
    session: {
      nom: data.session_nom,
      date_debut: data.session_date_debut || data.date_debut,
      date_fin: data.session_date_fin || data.date_fin,
      lieu: data.session_lieu,
      horaires: data.session_horaires || data.horaires,
      heure_debut: data.session_heure_debut,
      heure_fin: data.session_heure_fin,
      formateur: data.session_formateur,
      formation_type: data.formation_type,
      duree_heures: data.duree_heures || data.duree,
      duree: data.duree || data.duree_heures,
      date_formation: data.date_formation || data.session_date_formation,
      dates_formation: data.dates_formation,
      periode_formation: data.periode_formation,
    },
    centre: {
      nom: data.centre_nom,
      adresse: data.centre_adresse,
      telephone: data.centre_telephone,
      email: data.centre_email,
      siret: data.centre_siret,
      nda: data.centre_nda,
    },
    // Alias pour "organisme" utilisé dans certains templates
    organisme: {
      nom: data.centre_nom || data.organisme_nom,
      adresse: data.centre_adresse || data.organisme_adresse,
      telephone: data.centre_telephone,
      email: data.centre_email,
      siret: data.centre_siret,
      nda: data.centre_nda,
    },
    // Certificat (pour attestations)
    certificat: {
      numero: data.numero_certificat,
      date_emission: data.date_emission_certificat,
      reference: data.numero_certificat,
    },
    attestation: {
      numero: data.numero_certificat,
      date: data.date_emission_certificat,
    },
    // Véhicule (pour contrats de location)
    vehicule: {
      immatriculation: data.vehicule_immatriculation || data.immatriculation || data.plaque,
      marque: data.vehicule_marque || data.marque_vehicule,
      modele: data.vehicule_modele || data.modele_vehicule,
      type: data.vehicule_type,
      plaque: data.vehicule_immatriculation || data.plaque || data.plaque_immatriculation,
    },
    // Contrat de location
    contrat: {
      numero: data.contrat_numero || data.numero_contrat,
      date_debut: data.contrat_date_debut || data.location_date_debut,
      date_fin: data.contrat_date_fin || data.location_date_fin,
      montant_mensuel: data.contrat_montant_mensuel || data.montant_mensuel || data.loyer_mensuel,
      montant_caution: data.contrat_montant_caution || data.montant_caution || data.caution,
      objet: data.contrat_objet || data.objet_location,
    },
    location: {
      numero: data.contrat_numero || data.numero_contrat,
      date_debut: data.contrat_date_debut || data.location_date_debut,
      date_fin: data.contrat_date_fin || data.location_date_fin,
      montant_mensuel: data.contrat_montant_mensuel || data.montant_mensuel,
      caution: data.contrat_montant_caution || data.caution,
      objet: data.contrat_objet || data.objet_location,
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
  // Log détaillé pour diagnostic des champs manquants
  if (verbose) {
    console.log("[DOCX Processor] Setting data keys:", Object.keys(structuredData).sort());
  }
  
  // Collect diagnostic info
  let allPlaceholders: string[] = [];
  let emptyPlaceholders: string[] = [];
  let unresolvedPlaceholders: string[] = [];
  
  // Log des valeurs vides pour diagnostic
  const emptyKeys = Object.entries(data)
    .filter(([_, v]) => !v || v === "")
    .map(([k]) => k);
  if (emptyKeys.length > 0 && verbose) {
    console.warn("[DOCX Processor] Variables vides (seront remplacées par ''):", emptyKeys);
  }
  
  doc.setData(structuredData);
  
  try {
    // Render the document
    doc.render();
    
    // Analyze tags for diagnostics
    try {
      const tags = (doc as any).getTags?.();
      if (tags?.document?.tags) allPlaceholders.push(...flattenTagTree(tags.document.tags));
      for (const h of tags?.headers || []) allPlaceholders.push(...flattenTagTree(h.tags));
      for (const f of tags?.footers || []) allPlaceholders.push(...flattenTagTree(f.tags));
      
      // Deduplicate
      allPlaceholders = [...new Set(allPlaceholders)];
      
      // Categorize unmatched tags
      for (const tag of allPlaceholders) {
        const resolved = getByPath(structuredData, tag.trim());
        if (resolved === undefined || resolved === null) {
          unresolvedPlaceholders.push(tag);
        } else if (resolved === "") {
          emptyPlaceholders.push(tag);
        }
      }
      
      if (verbose) {
        if (unresolvedPlaceholders.length > 0) {
          console.error("[DOCX Processor] ❌ Placeholders NON RÉSOLUS (variable inexistante):", unresolvedPlaceholders);
        }
        if (emptyPlaceholders.length > 0) {
          console.warn("[DOCX Processor] ⚠️ Placeholders vides (variable existe mais valeur vide):", emptyPlaceholders);
        }
        if (unresolvedPlaceholders.length === 0 && emptyPlaceholders.length === 0) {
          console.log("[DOCX Processor] ✅ Tous les placeholders ont été remplacés avec succès");
        }
      }
    } catch {
      // Ignore tag inspection errors
    }
    
    if (verbose) {
      console.log("[DOCX Processor] Document rendered successfully");
    }
  } catch (error) {
    console.error("Error rendering DOCX template:", error);
    throw new Error("Erreur lors du traitement du modèle DOCX. Vérifiez que les variables sont correctement formatées.");
  }
  
  // Generate the output DOCX
  const output = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  
  // POST-RENDER VALIDATION: Scan the final XML for remaining placeholders
  const finalZip = new PizZip(await output.arrayBuffer());
  const remainingPlaceholders = scanForRemainingPlaceholders(finalZip);
  
  if (remainingPlaceholders.length > 0) {
    console.error("[DOCX Processor] ❌ PLACEHOLDERS RESTANTS DANS LE DOCUMENT FINAL:", remainingPlaceholders);
    
    if (strictMode) {
      throw new DocxValidationError(
        `${remainingPlaceholders.length} placeholder(s) non remplacé(s) dans le document final`,
        remainingPlaceholders,
        emptyPlaceholders,
        allPlaceholders
      );
    }
  }
  
  return output;
}

/**
 * Custom error class for DOCX validation failures
 */
export class DocxValidationError extends Error {
  constructor(
    message: string,
    public readonly unresolvedPlaceholders: string[],
    public readonly emptyPlaceholders: string[],
    public readonly allPlaceholders: string[]
  ) {
    super(message);
    this.name = "DocxValidationError";
  }
}

/**
 * Scan a DOCX zip for remaining {placeholder} patterns in the final output
 */
function scanForRemainingPlaceholders(zip: PizZip): string[] {
  const placeholders: Set<string> = new Set();
  const files = Object.keys((zip as any).files ?? {});
  
  // Pattern to match {variable} or {{variable}} that weren't replaced
  // Excludes XML tags and common Word formatting
  const placeholderRegex = /\{+\s*([a-zA-Z_][a-zA-Z0-9_.\s]*?)\s*\}+/g;
  
  for (const name of files) {
    if (!/^word\/(document|header\d+|footer\d+)\.xml$/.test(name)) continue;
    const f = zip.file(name);
    if (!f) continue;
    
    try {
      const text = f.asText();
      // Extract text content from XML (between > and <)
      const textContent = text.replace(/<[^>]+>/g, " ");
      
      let match;
      while ((match = placeholderRegex.exec(textContent)) !== null) {
        const placeholder = match[1].trim();
        // Filter out false positives (XML artifacts, very short strings)
        if (placeholder.length >= 2 && !placeholder.includes("<") && !placeholder.includes(">")) {
          placeholders.add(placeholder);
        }
      }
    } catch {
      // Ignore read errors
    }
  }
  
  return Array.from(placeholders);
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
    heure_debut_matin?: string;
    heure_fin_matin?: string;
    heure_debut_aprem?: string;
    heure_fin_aprem?: string;
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
  },
  certificateInfo?: {
    numero_certificat?: string;
    date_emission?: string;
  },
  vehicule?: {
    immatriculation?: string;
    marque?: string;
    modele?: string;
    type_vehicule?: string;
  },
  contratLocation?: {
    numero_contrat?: string;
    date_debut?: string;
    date_fin?: string;
    montant_mensuel?: number;
    montant_caution?: number;
    objet_location?: string;
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

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    // Accept "HH:mm" or "HH:mm:ss" and normalize to "HH:mm"
    const m = String(timeStr).trim().match(/^\d{1,2}:\d{2}/);
    return m?.[0] ?? String(timeStr).trim();
  };

  const contactAdresse = [contact.rue, contact.code_postal, contact.ville]
    .filter(Boolean)
    .join(" ")
    .trim();

  const sessionDateDebut = formatDate(session?.date_debut);
  const sessionDateFin = formatDate(session?.date_fin);
  const sessionDateRange = sessionDateDebut && sessionDateFin
    ? `${sessionDateDebut} au ${sessionDateFin}`
    : sessionDateDebut || sessionDateFin || "";

  // Horaires matin/après-midi
  const heureDebutMatin = formatTime(session?.heure_debut_matin);
  const heureFinMatin = formatTime(session?.heure_fin_matin);
  const heureDebutAprem = formatTime(session?.heure_debut_aprem);
  const heureFinAprem = formatTime(session?.heure_fin_aprem);
  
  // Horaires simples (fallback sur anciens champs)
  const sessionHeureDebut = heureDebutMatin || formatTime(session?.heure_debut);
  const sessionHeureFin = heureFinAprem || formatTime(session?.heure_fin);
  
  // Plage horaire matin
  const horairesMatin = heureDebutMatin && heureFinMatin
    ? `${heureDebutMatin} - ${heureFinMatin}`
    : "";
  
  // Plage horaire après-midi
  const horairesAprem = heureDebutAprem && heureFinAprem
    ? `${heureDebutAprem} - ${heureFinAprem}`
    : "";
  
  // Horaires complets avec pause déjeuner
  const horairesComplets = horairesMatin && horairesAprem
    ? `${horairesMatin} / ${horairesAprem}`
    : horairesMatin || horairesAprem || "";

  // Priorité aux horaires détaillés, sinon fallback sur horaires simples
  const sessionTimeRange = horairesComplets 
    || (sessionHeureDebut && sessionHeureFin
      ? `${sessionHeureDebut} - ${sessionHeureFin}`
      : sessionHeureDebut || sessionHeureFin || "");
  
  console.log("[DOCX buildVariableData] Input contact:", JSON.stringify(contact, null, 2));
  console.log("[DOCX buildVariableData] Input session:", JSON.stringify(session, null, 2));
  console.log("[DOCX buildVariableData] Input centreFormation:", JSON.stringify(centreFormation, null, 2));

  // Nom complet composé
  const nomComplet = [contact.prenom, contact.nom].filter(Boolean).join(" ");
  const nomCompletInverse = [contact.nom, contact.prenom].filter(Boolean).join(" ");
  
  // Lieu de naissance complet
  const lieuNaissance = [contact.ville_naissance, contact.pays_naissance]
    .filter(Boolean)
    .join(", ");

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
    
    // Nom complet (variantes)
    nom_complet: nomComplet,
    nom_prenom: nomComplet,
    prenom_nom: nomComplet,
    stagiaire: nomComplet,
    participant: nomComplet,
    nom_stagiaire: contact.nom || "",
    prenom_stagiaire: contact.prenom || "",
    
    // Champs dérivés souvent utilisés dans les modèles (1 champ au lieu de 3)
    adresse: contactAdresse,
    adresse_complete: contactAdresse,
    adresse_stagiaire: contactAdresse,
    adresse_apprenant: contactAdresse,
    adresse_participant: contactAdresse,
    
    // Champs adresse séparés avec variantes (templates Mobilité)
    ADRESSE: contact.rue || "",
    CODE_POSTAL: contact.code_postal || "",
    VILLE: contact.ville || "",
    adresse_rue: contact.rue || "",
    rue_apprenant: contact.rue || "",
    code_postal_apprenant: contact.code_postal || "",
    ville_apprenant: contact.ville || "",
    cp: contact.code_postal || "",
    cp_apprenant: contact.code_postal || "",
    
    // Date et lieu de naissance
    date_naissance: formatDate(contact.date_naissance),
    ville_naissance: contact.ville_naissance || "",
    pays_naissance: contact.pays_naissance || "",
    lieu_naissance: lieuNaissance,
    ne_le: formatDate(contact.date_naissance),
    ne_a: contact.ville_naissance || "",
    
    // Aliases naissance (variantes fréquentes dans les templates Mobilité)
    birth_date: formatDate(contact.date_naissance),
    birth_city: contact.ville_naissance || "",
    birth_country: contact.pays_naissance || "",
    pays: contact.pays_naissance || "",
    naissance_pays: contact.pays_naissance || "",
    lieu_de_naissance: lieuNaissance,
    ville_de_naissance: contact.ville_naissance || "",
    pays_de_naissance: contact.pays_naissance || "",
    date_de_naissance: formatDate(contact.date_naissance),
    DATE_NAISSANCE: formatDate(contact.date_naissance),
    DATE_DE_NAISSANCE: formatDate(contact.date_naissance),
    LIEU_NAISSANCE: lieuNaissance,
    LIEU_DE_NAISSANCE: lieuNaissance,
    VILLE_NAISSANCE: contact.ville_naissance || "",
    PAYS_NAISSANCE: contact.pays_naissance || "",
    PAYS: contact.pays_naissance || "",
    date_naissance_apprenant: formatDate(contact.date_naissance),
    lieu_naissance_apprenant: lieuNaissance,
    ville_naissance_apprenant: contact.ville_naissance || "",
    pays_naissance_apprenant: contact.pays_naissance || "",
    
    // Permis de conduire
    numero_permis: contact.numero_permis || "",
    prefecture_permis: contact.prefecture_permis || "",
    date_delivrance_permis: formatDate(contact.date_delivrance_permis),
    permis_numero: contact.numero_permis || "",
    permis_prefecture: contact.prefecture_permis || "",
    permis_date: formatDate(contact.date_delivrance_permis),
    
    // Carte professionnelle (toutes variantes)
    numero_carte_professionnelle: contact.numero_carte_professionnelle || "",
    prefecture_carte: contact.prefecture_carte || "",
    date_expiration_carte: formatDate(contact.date_expiration_carte),
    formation: contact.formation || "",

    // Aliases carte pro (variantes fréquentes)
    numero_carte: contact.numero_carte_professionnelle || "",
    carte_pro: contact.numero_carte_professionnelle || "",
    carte_professionnelle: contact.numero_carte_professionnelle || "",
    carte_professionnelle_numero: contact.numero_carte_professionnelle || "",
    carte_professionnelle_prefecture: contact.prefecture_carte || "",
    carte_professionnelle_date_expiration: formatDate(contact.date_expiration_carte),
    carte_numero: contact.numero_carte_professionnelle || "",
    carte_prefecture: contact.prefecture_carte || "",
    carte_expiration: formatDate(contact.date_expiration_carte),
    
    // Aliases carte pro additionnels (cas spéciaux templates Mobilité Taxi)
    n_carte: contact.numero_carte_professionnelle || "",
    n_carte_pro: contact.numero_carte_professionnelle || "",
    no_carte: contact.numero_carte_professionnelle || "",
    no_carte_pro: contact.numero_carte_professionnelle || "",
    num_carte: contact.numero_carte_professionnelle || "",
    num_carte_pro: contact.numero_carte_professionnelle || "",
    professional_card_number: contact.numero_carte_professionnelle || "",
    professional_card: contact.numero_carte_professionnelle || "",
    card_number: contact.numero_carte_professionnelle || "",
    vtc_card: contact.numero_carte_professionnelle || "",
    vtc_card_number: contact.numero_carte_professionnelle || "",
    taxi_card: contact.numero_carte_professionnelle || "",
    carte_vtc: contact.numero_carte_professionnelle || "",
    carte_taxi: contact.numero_carte_professionnelle || "",
    carte_vtc_numero: contact.numero_carte_professionnelle || "",
    carte_taxi_numero: contact.numero_carte_professionnelle || "",
    numero_vtc: contact.numero_carte_professionnelle || "",
    numero_taxi: contact.numero_carte_professionnelle || "",
    NUMERO_CARTE_PROFESSIONNELLE: contact.numero_carte_professionnelle || "",
    NUMERO_CARTE: contact.numero_carte_professionnelle || "",
    CARTE_PRO: contact.numero_carte_professionnelle || "",
    N_CARTE: contact.numero_carte_professionnelle || "",
    DATE_EXPIRATION_CARTE: formatDate(contact.date_expiration_carte),
    PREFECTURE_CARTE: contact.prefecture_carte || "",
    date_expiration_carte_pro: formatDate(contact.date_expiration_carte),
    prefecture_carte_pro: contact.prefecture_carte || "",
    prefecture_delivrance_carte: contact.prefecture_carte || "",
    PREFECTURE_DELIVRANCE: contact.prefecture_carte || "",

    // English aliases (for templates using English variable names)
    student_last_name: contact.nom || "",
    student_first_name: contact.prenom || "",
    student_full_name: nomComplet,
    student_name: nomComplet,
    student_birth_date: formatDate(contact.date_naissance),
    student_birth_city: contact.ville_naissance || "",
    student_birth_country: contact.pays_naissance || "",
    student_birth_place: lieuNaissance,
    student_phone: contact.telephone || "",
    student_email: contact.email || "",
    student_address_street: contact.rue || "",
    student_address_zip: contact.code_postal || "",
    student_address_city: contact.ville || "",
    student_full_address: contactAdresse,
    taxi_card_number: contact.numero_carte_professionnelle || "",
    taxi_card_expiry_date: formatDate(contact.date_expiration_carte),
    taxi_card_prefecture: contact.prefecture_carte || "",
    license_number: contact.numero_permis || "",
    license_prefecture: contact.prefecture_permis || "",
    license_issue_date: formatDate(contact.date_delivrance_permis),

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
    contact_lieu_naissance: lieuNaissance,
    contact_pays_naissance: contact.pays_naissance || "",
    contact_adresse: contactAdresse,
    
    // Session fields (French)
    session_nom: session?.nom || "",
    session_date_debut: formatDate(session?.date_debut),
    session_date_fin: formatDate(session?.date_fin),
    session_lieu: session?.lieu || "",
    session_horaires: sessionTimeRange,
    session_heure_debut: sessionHeureDebut,
    session_heure_fin: sessionHeureFin,
    session_formateur: session?.formateur || "",
    formation_type: session?.formation_type || "",
    duree_heures: session?.duree_heures?.toString() || "",
    duree: session?.duree_heures?.toString() || "",
    
    // Horaires matin/après-midi détaillés
    heure_debut_matin: heureDebutMatin,
    heure_fin_matin: heureFinMatin,
    heure_debut_aprem: heureDebutAprem,
    heure_fin_aprem: heureFinAprem,
    horaires_matin: horairesMatin,
    horaires_aprem: horairesAprem,
    horaires_apres_midi: horairesAprem,
    pause_dejeuner: heureFinMatin && heureDebutAprem ? `${heureFinMatin} - ${heureDebutAprem}` : "",

    // Champs dérivés (pour éviter les placeholders collés dans le modèle)
    session_date_formation: sessionDateRange,
    date_formation: sessionDateRange,
    dates_formation: sessionDateRange,
    periode_formation: sessionDateRange,
    session_horaires_formation: sessionTimeRange,
    horaires_formation: sessionTimeRange,
    horaires: sessionTimeRange,
    
    // Alias simples pour date_debut / date_fin (très utilisés dans les modèles)
    date_debut: sessionDateDebut,
    date_fin: sessionDateFin,

    // English aliases for session fields
    training_start_date: sessionDateDebut,
    training_end_date: sessionDateFin,
    training_start_time: sessionHeureDebut,
    training_end_time: sessionHeureFin,
    training_date_range: sessionDateRange,
    training_time_range: sessionTimeRange,
    training_location: session?.lieu || "",
    training_name: session?.nom || "",
    training_type: session?.formation_type || "",
    training_duration: session?.duree_heures?.toString() || "",
    
    // Centre formation fields
    centre_nom: centreFormation?.nom || "",
    centre_adresse: centreFormation?.adresse || "",
    centre_telephone: centreFormation?.telephone || "",
    centre_email: centreFormation?.email || "",
    centre_siret: centreFormation?.siret || "",
    centre_nda: centreFormation?.nda || "",
    organisme: centreFormation?.nom || "",
    organisme_nom: centreFormation?.nom || "",
    organisme_adresse: centreFormation?.adresse || "",
    
    // Auto-generated date fields
    date_generation: format(new Date(), "dd/MM/yyyy", { locale: fr }),
    date_jour: format(new Date(), "dd MMMM yyyy", { locale: fr }),
    document_issue_date: format(new Date(), "dd/MM/yyyy", { locale: fr }),
    fait_le: format(new Date(), "dd MMMM yyyy", { locale: fr }),
    date_attestation: format(new Date(), "dd/MM/yyyy", { locale: fr }),
    
    // Numéro de certificat (attestation unique)
    numero_certificat: certificateInfo?.numero_certificat || "",
    certificate_number: certificateInfo?.numero_certificat || "",
    certificat_numero: certificateInfo?.numero_certificat || "",
    reference_certificat: certificateInfo?.numero_certificat || "",
    ref_certificat: certificateInfo?.numero_certificat || "",
    attestation_numero: certificateInfo?.numero_certificat || "",
    date_emission_certificat: certificateInfo?.date_emission 
      ? format(new Date(certificateInfo.date_emission), "dd/MM/yyyy", { locale: fr })
      : format(new Date(), "dd/MM/yyyy", { locale: fr }),
    
    // Véhicule fields (pour contrats de location)
    vehicule_immatriculation: vehicule?.immatriculation || "",
    vehicule_marque: vehicule?.marque || "",
    vehicule_modele: vehicule?.modele || "",
    vehicule_type: vehicule?.type_vehicule || "",
    immatriculation: vehicule?.immatriculation || "",
    plaque: vehicule?.immatriculation || "",
    plaque_immatriculation: vehicule?.immatriculation || "",
    marque_vehicule: vehicule?.marque || "",
    modele_vehicule: vehicule?.modele || "",
    voiture: vehicule?.marque && vehicule?.modele 
      ? `${vehicule.marque} ${vehicule.modele}` 
      : vehicule?.marque || vehicule?.modele || "",
    vehicule: vehicule?.marque && vehicule?.modele 
      ? `${vehicule.marque} ${vehicule.modele} - ${vehicule?.immatriculation || ""}`.trim()
      : "",
    
    // Contrat de location fields
    contrat_numero: contratLocation?.numero_contrat || "",
    numero_contrat: contratLocation?.numero_contrat || "",
    contrat_date_debut: contratLocation?.date_debut 
      ? format(new Date(contratLocation.date_debut), "dd/MM/yyyy", { locale: fr }) 
      : "",
    contrat_date_fin: contratLocation?.date_fin 
      ? format(new Date(contratLocation.date_fin), "dd/MM/yyyy", { locale: fr }) 
      : "",
    location_date_debut: contratLocation?.date_debut 
      ? format(new Date(contratLocation.date_debut), "dd/MM/yyyy", { locale: fr }) 
      : "",
    location_date_fin: contratLocation?.date_fin 
      ? format(new Date(contratLocation.date_fin), "dd/MM/yyyy", { locale: fr }) 
      : "",
    contrat_montant_mensuel: contratLocation?.montant_mensuel?.toFixed(2) || "",
    montant_mensuel: contratLocation?.montant_mensuel?.toFixed(2) || "",
    loyer_mensuel: contratLocation?.montant_mensuel?.toFixed(2) || "",
    contrat_montant_caution: contratLocation?.montant_caution?.toFixed(2) || "",
    montant_caution: contratLocation?.montant_caution?.toFixed(2) || "",
    caution: contratLocation?.montant_caution?.toFixed(2) || "",
    contrat_objet: contratLocation?.objet_location || "",
    objet_location: contratLocation?.objet_location || "",
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

/**
 * Validate a DOCX template by processing it with test data and checking for remaining placeholders.
 * Useful for automated testing and template validation before deployment.
 * 
 * @param docxBlob The DOCX template to validate
 * @param testData Optional test data to use (defaults to sample data)
 * @returns Validation result with details about any issues found
 */
export async function validateDocxTemplate(
  docxBlob: Blob,
  testData?: Partial<DocxVariableData>
): Promise<{
  isValid: boolean;
  remainingPlaceholders: string[];
  emptyPlaceholders: string[];
  allPlaceholders: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  
  // Default test data with all common fields populated
  const defaultTestData: DocxVariableData = {
    civilite: "M.",
    nom: "DUPONT",
    prenom: "Jean",
    email: "jean.dupont@test.fr",
    telephone: "06 12 34 56 78",
    rue: "123 Rue de Test",
    code_postal: "75001",
    ville: "Paris",
    adresse: "123 Rue de Test 75001 Paris",
    adresse_complete: "123 Rue de Test 75001 Paris",
    date_naissance: "01/01/1990",
    ville_naissance: "Lyon",
    pays_naissance: "France",
    lieu_naissance: "Lyon, France",
    nom_complet: "Jean DUPONT",
    numero_carte_professionnelle: "CARTE-2024-001",
    prefecture_carte: "Préfecture de Paris",
    date_expiration_carte: "31/12/2029",
    numero_permis: "PERMIS-123456",
    prefecture_permis: "Préfecture de Lyon",
    date_delivrance_permis: "15/06/2015",
    formation: "Mobilité",
    session_nom: "Session Test 2024",
    session_date_debut: "01/06/2024",
    session_date_fin: "05/06/2024",
    session_date_formation: "01/06/2024 au 05/06/2024",
    date_formation: "01/06/2024 au 05/06/2024",
    session_lieu: "Paris - Centre de Formation",
    session_horaires: "09:00 - 17:00",
    session_heure_debut: "09:00",
    session_heure_fin: "17:00",
    horaires_formation: "09:00 - 17:00",
    formation_type: "Mobilité",
    duree_heures: "35",
    centre_nom: "Centre de Formation Test",
    centre_adresse: "456 Avenue de la Formation, 75002 Paris",
    centre_telephone: "01 23 45 67 89",
    centre_email: "contact@centre-test.fr",
    centre_siret: "123 456 789 00012",
    centre_nda: "11 75 12345 75",
    date_generation: "01/06/2024",
    date_jour: "01 juin 2024",
    fait_le: "01 juin 2024",
    ...testData,
  };

  try {
    // Process with strict mode to catch remaining placeholders
    await processDocxWithVariables(docxBlob, defaultTestData, { strictMode: true, verbose: false });
    
    return {
      isValid: true,
      remainingPlaceholders: [],
      emptyPlaceholders: [],
      allPlaceholders: [],
      errors: [],
    };
  } catch (error) {
    if (error instanceof DocxValidationError) {
      return {
        isValid: false,
        remainingPlaceholders: error.unresolvedPlaceholders,
        emptyPlaceholders: error.emptyPlaceholders,
        allPlaceholders: error.allPlaceholders,
        errors: [error.message],
      };
    }
    
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      isValid: false,
      remainingPlaceholders: [],
      emptyPlaceholders: [],
      allPlaceholders: [],
      errors,
    };
  }
}

/**
 * Process DOCX with validation - same as processDocxWithVariables but returns detailed result
 */
export async function processDocxWithValidation(
  docxBlob: Blob,
  variables: DocxVariableData
): Promise<ProcessDocxResult> {
  // Process without strict mode first to get the blob
  const blob = await processDocxWithVariables(docxBlob, variables, { strictMode: false, verbose: true });
  
  // Re-scan the output for diagnostics
  const finalZip = new PizZip(await blob.arrayBuffer());
  const remainingPlaceholders = scanForRemainingPlaceholdersPublic(finalZip);
  
  // This is a simplified version - in production you'd want more detailed tracking
  return {
    blob,
    emptyPlaceholders: [],
    unresolvedPlaceholders: remainingPlaceholders,
    allPlaceholders: [],
  };
}

/**
 * Public wrapper for scanning placeholders (for testing/validation)
 */
function scanForRemainingPlaceholdersPublic(zip: PizZip): string[] {
  const placeholders: Set<string> = new Set();
  const files = Object.keys((zip as any).files ?? {});
  
  const placeholderRegex = /\{+\s*([a-zA-Z_][a-zA-Z0-9_.\s]*?)\s*\}+/g;
  
  for (const name of files) {
    if (!/^word\/(document|header\d+|footer\d+)\.xml$/.test(name)) continue;
    const f = zip.file(name);
    if (!f) continue;
    
    try {
      const text = f.asText();
      const textContent = text.replace(/<[^>]+>/g, " ");
      
      let match;
      while ((match = placeholderRegex.exec(textContent)) !== null) {
        const placeholder = match[1].trim();
        if (placeholder.length >= 2 && !placeholder.includes("<") && !placeholder.includes(">")) {
          placeholders.add(placeholder);
        }
      }
    } catch {
      // Ignore
    }
  }
  
  return Array.from(placeholders);
}
