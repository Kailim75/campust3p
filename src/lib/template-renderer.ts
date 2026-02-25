// ═══════════════════════════════════════════════════════════════
// Template Renderer — Render published templates with variables and export as PDF
// ═══════════════════════════════════════════════════════════════

import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";

/**
 * Replace {{variable}} placeholders with actual data.
 */
export function renderTemplateHtml(
  templateBody: string,
  variables: Record<string, string>
): string {
  const rendered = templateBody.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (varName in variables) return variables[varName];
    return ""; // Remove unknown variables in production render
  });
  return DOMPurify.sanitize(rendered, { ADD_ATTR: ["style"], ADD_TAGS: ["mark"] });
}

/**
 * Build variable data map for a contact + session + centre.
 */
export async function buildDocumentVariables(opts: {
  contactId?: string;
  sessionId?: string;
  extra?: Record<string, string>;
}): Promise<Record<string, string>> {
  const map: Record<string, string> = {
    date_jour: new Date().toLocaleDateString("fr-FR"),
  };

  // Fetch contact data
  if (opts.contactId) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", opts.contactId)
      .maybeSingle();
    if (contact) {
      map.nom = contact.nom || "";
      map.prenom = contact.prenom || "";
      map.email = contact.email || "";
      map.telephone = contact.telephone || "";
      map.civilite = contact.civilite || "";
      map.date_naissance = contact.date_naissance
        ? new Date(contact.date_naissance).toLocaleDateString("fr-FR")
        : "";
      map.adresse = [contact.rue, contact.code_postal, contact.ville]
        .filter(Boolean)
        .join(", ");
      map.ville = contact.ville || "";
      map.code_postal = contact.code_postal || "";
      map.rue = contact.rue || "";
      map.nom_naissance = (contact as any).nom_naissance || "";
      map.ville_naissance = contact.ville_naissance || "";
      map.pays_naissance = contact.pays_naissance || "";
    }
  }

  // Fetch session data
  if (opts.sessionId) {
    const { data: session } = await supabase
      .from("sessions")
      .select("*, formateurs:formateur_id(nom, prenom)")
      .eq("id", opts.sessionId)
      .maybeSingle();
    if (session) {
      map.session_nom = session.nom || "";
      map.session_date_debut = session.date_debut
        ? new Date(session.date_debut).toLocaleDateString("fr-FR")
        : "";
      map.session_date_fin = session.date_fin
        ? new Date(session.date_fin).toLocaleDateString("fr-FR")
        : "";
      map.duree_heures = String(session.duree_heures || "");
      map.formation_type = session.formation_type || "";
      map.horaires = (session as any).horaires || "";
      map.lieu = session.lieu || "";
      map.numero_session = (session as any).numero_session || "";
      const formateur = (session as any).formateurs;
      if (formateur) {
        map.formateur_nom = `${formateur.prenom || ""} ${formateur.nom || ""}`.trim();
      }
    }
  }

  // Always fetch centre info
  const { data: centre } = await supabase
    .from("centre_formation")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (centre) {
    map.centre_nom = centre.nom_commercial || centre.nom_legal || "";
    map.centre_nom_legal = centre.nom_legal || "";
    map.centre_nom_commercial = centre.nom_commercial || "";
    map.centre_siret = centre.siret || "";
    map.centre_nda = centre.nda || "";
    map.centre_adresse = centre.adresse_complete || "";
    map.centre_email = centre.email || "";
    map.centre_telephone = centre.telephone || "";
    map.centre_forme_juridique = centre.forme_juridique || "";
    map.centre_iban = centre.iban || "";
    map.centre_bic = centre.bic || "";
    map.centre_region = centre.region_declaration || "";
    map.responsable_nom = centre.responsable_legal_nom || "";
    map.responsable_fonction = centre.responsable_legal_fonction || "";
    map.centre_qualiopi_numero = centre.qualiopi_numero || "";
    map.centre_qualiopi_date = centre.qualiopi_date_obtention || "";
    map.centre_agrement = centre.agrement_prefecture || "";
    map.centre_agrement_date = centre.agrement_prefecture_date || "";
    map.centre_code_rncp = centre.code_rncp || "";
    map.centre_code_rs = centre.code_rs || "";
    if (!map.lieu) {
      map.lieu = centre.adresse_complete?.split(",").pop()?.trim() || "";
    }
  }

  // Merge extra variables
  if (opts.extra) {
    Object.assign(map, opts.extra);
  }

  return map;
}

/**
 * Open a print window with rendered HTML document for PDF export.
 */
export function printHtmlDocument(html: string, title: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // Fallback: download as HTML
    downloadHtmlDocument(html, title);
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { margin: 15mm 20mm; size: A4; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 18pt; margin-bottom: 12pt; }
    h2 { font-size: 14pt; margin-bottom: 8pt; }
    h3 { font-size: 12pt; margin-bottom: 6pt; }
    table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
    th, td { border: 1px solid #333; padding: 6pt 8pt; text-align: left; font-size: 10pt; }
    th { background-color: #f5f5f5; font-weight: bold; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${html}
  <script>
    setTimeout(() => { window.print(); }, 300);
  </script>
</body>
</html>`);
  printWindow.document.close();
}

/**
 * Download rendered HTML as an HTML file.
 */
export function downloadHtmlDocument(html: string, title: string): void {
  const fullHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;font-size:11pt;line-height:1.5;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #333;padding:6pt 8pt;}th{background:#f5f5f5;}</style></head><body>${html}</body></html>`;
  const blob = new Blob([fullHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
