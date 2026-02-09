import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";

interface EmargementData {
  id: string;
  contact_id: string;
  date_emargement: string;
  periode: "matin" | "apres_midi";
  present: boolean;
  signature_url: string | null;
  date_signature: string | null;
  contact?: {
    id: string;
    nom: string;
    prenom: string;
  };
}

interface SessionInfo {
  nom: string;
  date_debut: string;
  date_fin: string;
  lieu?: string;
  formation_type?: string;
  formateur_nom?: string;
  centre_nom?: string;
  centre_adresse?: string;
  centre_nda?: string;
}

/**
 * Generate an attendance sheet (feuille d'émargement) as a DOCX-compatible XML (Word 2003 XML).
 * Uses raw XML to avoid template dependency.
 */
export function generateEmargementDocx(
  emargements: EmargementData[],
  session: SessionInfo
): Blob {
  // Get unique dates (business days)
  const sessionDates = eachDayOfInterval({
    start: new Date(session.date_debut),
    end: new Date(session.date_fin),
  }).filter((date) => !isWeekend(date));

  // Get unique contacts
  const contactsMap = new Map<string, { nom: string; prenom: string }>();
  emargements.forEach((e) => {
    if (e.contact && !contactsMap.has(e.contact_id)) {
      contactsMap.set(e.contact_id, { nom: e.contact.nom, prenom: e.contact.prenom });
    }
  });
  const contacts = Array.from(contactsMap.entries()).map(([id, c]) => ({ id, ...c }));

  // Build pages: one table per date
  let pagesXml = "";

  sessionDates.forEach((date, dateIndex) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dateFr = format(date, "EEEE d MMMM yyyy", { locale: fr });
    const dateEmargements = emargements.filter((e) => e.date_emargement === dateStr);

    // Page break before each page except the first
    const pageBreak = dateIndex > 0
      ? `<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>`
      : "";

    // Header section
    const headerXml = `
      ${pageBreak}
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:pStyle w:val="Heading1"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>FEUILLE D'ÉMARGEMENT</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(session.nom)}</w:t></w:r>
      </w:p>
      ${session.centre_nom ? `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">Organisme : ${escapeXml(session.centre_nom)}${session.centre_nda ? ` - NDA : ${escapeXml(session.centre_nda)}` : ""}</w:t></w:r></w:p>` : ""}
      <w:p>
        <w:pPr><w:spacing w:after="120"/></w:pPr>
      </w:p>
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9500" w:type="dxa"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:color="CCCCCC"/>
            <w:left w:val="single" w:sz="4" w:color="CCCCCC"/>
            <w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/>
            <w:right w:val="single" w:sz="4" w:color="CCCCCC"/>
            <w:insideH w:val="single" w:sz="4" w:color="CCCCCC"/>
            <w:insideV w:val="single" w:sz="4" w:color="CCCCCC"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="4750"/>
          <w:gridCol w:w="2375"/>
          <w:gridCol w:w="2375"/>
        </w:tblGrid>
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="9500" w:type="dxa"/><w:gridSpan w:val="3"/><w:shd w:val="clear" w:fill="4472C4"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(dateFr)}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
    `;

    // Info row
    const infoRowXml = `
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="4750" w:type="dxa"/><w:shd w:val="clear" w:fill="F2F2F2"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">Lieu : ${escapeXml(session.lieu || "—")}</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2375" w:type="dxa"/><w:shd w:val="clear" w:fill="F2F2F2"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${session.formateur_nom ? `Formateur : ${escapeXml(session.formateur_nom)}` : ""}</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2375" w:type="dxa"/><w:shd w:val="clear" w:fill="F2F2F2"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${session.formation_type ? `Formation : ${escapeXml(session.formation_type)}` : ""}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    `;

    // Table header
    const tableHeaderXml = `
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="4750" w:type="dxa"/><w:shd w:val="clear" w:fill="D9E2F3"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Nom et Prénom du stagiaire</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2375" w:type="dxa"/><w:shd w:val="clear" w:fill="D9E2F3"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Matin (9h-12h30)</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="666666"/></w:rPr><w:t>Signature</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2375" w:type="dxa"/><w:shd w:val="clear" w:fill="D9E2F3"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Après-midi (14h-17h30)</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="666666"/></w:rPr><w:t>Signature</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    `;

    // Rows for each contact
    let rowsXml = "";
    contacts.forEach((contact, idx) => {
      const bgFill = idx % 2 === 0 ? "FFFFFF" : "F8F9FA";
      const morningEmarg = dateEmargements.find(
        (e) => e.contact_id === contact.id && e.periode === "matin"
      );
      const afternoonEmarg = dateEmargements.find(
        (e) => e.contact_id === contact.id && e.periode === "apres_midi"
      );

      const morningStatus = getSignatureStatus(morningEmarg);
      const afternoonStatus = getSignatureStatus(afternoonEmarg);

      // Use a tall row for signature space
      rowsXml += `
        <w:tr>
          <w:trPr><w:trHeight w:val="600" w:hRule="atLeast"/></w:trPr>
          <w:tc><w:tcPr><w:tcW w:w="4750" w:type="dxa"/><w:shd w:val="clear" w:fill="${bgFill}"/><w:vAlign w:val="center"/></w:tcPr>
            <w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(contact.nom.toUpperCase())} ${escapeXml(contact.prenom)}</w:t></w:r></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2375" w:type="dxa"/><w:shd w:val="clear" w:fill="${bgFill}"/><w:vAlign w:val="center"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/>${morningStatus.color ? `<w:color w:val="${morningStatus.color}"/>` : ""}</w:rPr><w:t xml:space="preserve">${escapeXml(morningStatus.text)}</w:t></w:r></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2375" w:type="dxa"/><w:shd w:val="clear" w:fill="${bgFill}"/><w:vAlign w:val="center"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/>${afternoonStatus.color ? `<w:color w:val="${afternoonStatus.color}"/>` : ""}</w:rPr><w:t xml:space="preserve">${escapeXml(afternoonStatus.text)}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
      `;
    });

    // Empty rows for additional stagiaires (printable form)
    for (let i = 0; i < 3; i++) {
      rowsXml += `
        <w:tr>
          <w:trPr><w:trHeight w:val="600" w:hRule="atLeast"/></w:trPr>
          <w:tc><w:tcPr><w:tcW w:w="4750" w:type="dxa"/></w:tcPr><w:p/></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2375" w:type="dxa"/></w:tcPr><w:p/></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2375" w:type="dxa"/></w:tcPr><w:p/></w:tc>
        </w:tr>
      `;
    }

    // Footer with signature block for formateur
    const footerXml = `
      </w:tbl>
      <w:p><w:pPr><w:spacing w:before="240"/></w:pPr></w:p>
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9500" w:type="dxa"/>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="4750"/>
          <w:gridCol w:w="4750"/>
        </w:tblGrid>
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="4750" w:type="dxa"/></w:tcPr>
            <w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Signature du formateur :</w:t></w:r></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="4750" w:type="dxa"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Cachet de l'organisme :</w:t></w:r></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
          </w:tc>
        </w:tr>
      </w:tbl>
    `;

    pagesXml += headerXml + infoRowXml + tableHeaderXml + rowsXml + footerXml;
  });

  // Build full Word 2003 XML document
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml"
                xmlns:v="urn:schemas-microsoft-com:vml"
                xmlns:wx="http://schemas.microsoft.com/office/word/2003/auxHint">
  <w:body>
    ${pagesXml}
  </w:body>
</w:wordDocument>`;

  return new Blob([docXml], {
    type: "application/vnd.ms-word",
  });
}

function getSignatureStatus(emargement?: EmargementData): { text: string; color: string } {
  if (!emargement) return { text: "", color: "" };
  if (emargement.signature_url || emargement.date_signature) {
    const time = emargement.date_signature
      ? format(new Date(emargement.date_signature), "HH:mm")
      : "";
    return { text: `✓ Signé${time ? ` à ${time}` : ""}`, color: "2E7D32" };
  }
  if (emargement.present) {
    return { text: "✓ Présent", color: "1565C0" };
  }
  return { text: "", color: "" };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
