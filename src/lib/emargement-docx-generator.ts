import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================================
// CHARTE GRAPHIQUE T3P CAMPUS - FEUILLE D'ÉMARGEMENT DOCX
// Vert Forêt (#1B4D3E), Crème (#F5EBD7), Or (#D4A853)
// ============================================================

const T3P_COLORS = {
  forestGreen: "1B4D3E",
  forestGreenLight: "2A6B54",
  cream: "F5EBD7",
  creamLight: "FBF7EF",
  gold: "D4A853",
  goldLight: "E4BE73",
  warmGray700: "4B463C",
  warmGray500: "898172",
  white: "FFFFFF",
  successGreen: "2A6B54",
  presentBlue: "1B4D3E",
};

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
  centre_siret?: string;
  centre_telephone?: string;
  centre_email?: string;
}

export function generateEmargementDocx(
  emargements: EmargementData[],
  session: SessionInfo
): Blob {
  const sessionDates = eachDayOfInterval({
    start: new Date(session.date_debut),
    end: new Date(session.date_fin),
  }).filter((date) => !isWeekend(date));

  const contactsMap = new Map<string, { nom: string; prenom: string }>();
  emargements.forEach((e) => {
    if (e.contact && !contactsMap.has(e.contact_id)) {
      contactsMap.set(e.contact_id, { nom: e.contact.nom, prenom: e.contact.prenom });
    }
  });
  const contacts = Array.from(contactsMap.entries()).map(([id, c]) => ({ id, ...c }));

  let pagesXml = "";

  sessionDates.forEach((date, dateIndex) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dateFr = format(date, "EEEE d MMMM yyyy", { locale: fr });
    const dateEmargements = emargements.filter((e) => e.date_emargement === dateStr);

    const pageBreak = dateIndex > 0
      ? `<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>`
      : "";

    // ── T3P Header Band (Forest Green) ──
    const headerXml = `
      ${pageBreak}
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9500" w:type="dxa"/>
          <w:jc w:val="center"/>
        </w:tblPr>
        <w:tblGrid><w:gridCol w:w="9500"/></w:tblGrid>
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="9500" w:type="dxa"/>
              <w:shd w:val="clear" w:fill="${T3P_COLORS.forestGreen}"/>
              <w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tcMar>
            </w:tcPr>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="${T3P_COLORS.white}"/></w:rPr><w:t>${escapeXml(session.centre_nom || "ÉCOLE T3P")}</w:t></w:r>
            </w:p>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>
              <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="${T3P_COLORS.creamLight}"/></w:rPr><w:t xml:space="preserve">${escapeXml([session.centre_adresse, session.centre_telephone, session.centre_email].filter(Boolean).join(" | "))}</w:t></w:r>
            </w:p>
            ${session.centre_nda || session.centre_siret ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="14"/><w:color w:val="${T3P_COLORS.creamLight}"/></w:rPr><w:t xml:space="preserve">${escapeXml([session.centre_siret ? `SIRET: ${session.centre_siret}` : "", session.centre_nda ? `NDA: ${session.centre_nda}` : ""].filter(Boolean).join(" | "))}</w:t></w:r></w:p>` : ""}
          </w:tc>
        </w:tr>
      </w:tbl>

      <!-- Gold accent bar -->
      <w:tbl>
        <w:tblPr><w:tblW w:w="9500" w:type="dxa"/><w:jc w:val="center"/></w:tblPr>
        <w:tblGrid><w:gridCol w:w="9500"/></w:tblGrid>
        <w:tr><w:trPr><w:trHeight w:val="60" w:hRule="exact"/></w:trPr>
          <w:tc><w:tcPr><w:tcW w:w="9500" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.gold}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p></w:tc>
        </w:tr>
      </w:tbl>

      <w:p><w:pPr><w:spacing w:before="200" w:after="60"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="${T3P_COLORS.forestGreen}"/></w:rPr><w:t>FEUILLE D'ÉMARGEMENT</w:t></w:r>
      </w:p>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="22"/><w:color w:val="${T3P_COLORS.warmGray700}"/></w:rPr><w:t xml:space="preserve">${escapeXml(session.nom)}</w:t></w:r>
      </w:p>
    `;

    // ── Session info table (cream background) ──
    const infoXml = `
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9500" w:type="dxa"/>
          <w:jc w:val="center"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
            <w:left w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
            <w:bottom w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
            <w:right w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
            <w:insideH w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
            <w:insideV w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="3166"/>
          <w:gridCol w:w="3167"/>
          <w:gridCol w:w="3167"/>
        </w:tblGrid>
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="3166" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.cream}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${T3P_COLORS.forestGreen}"/></w:rPr><w:t>Lieu</w:t></w:r></w:p>
            <w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="${T3P_COLORS.warmGray700}"/></w:rPr><w:t xml:space="preserve">${escapeXml(session.lieu || "—")}</w:t></w:r></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="3167" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.cream}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${T3P_COLORS.forestGreen}"/></w:rPr><w:t>Formateur</w:t></w:r></w:p>
            <w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="${T3P_COLORS.warmGray700}"/></w:rPr><w:t xml:space="preserve">${escapeXml(session.formateur_nom || "—")}</w:t></w:r></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="3167" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.cream}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${T3P_COLORS.forestGreen}"/></w:rPr><w:t>Formation</w:t></w:r></w:p>
            <w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="${T3P_COLORS.warmGray700}"/></w:rPr><w:t xml:space="preserve">${escapeXml(session.formation_type || "—")}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
      </w:tbl>
      <w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr></w:p>
    `;

    // ── Date banner (Forest Green) ──
    const dateBannerXml = `
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9500" w:type="dxa"/>
          <w:jc w:val="center"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="6" w:color="${T3P_COLORS.forestGreen}"/>
            <w:left w:val="single" w:sz="6" w:color="${T3P_COLORS.forestGreen}"/>
            <w:bottom w:val="single" w:sz="6" w:color="${T3P_COLORS.forestGreen}"/>
            <w:right w:val="single" w:sz="6" w:color="${T3P_COLORS.forestGreen}"/>
            <w:insideH w:val="single" w:sz="4" w:color="${T3P_COLORS.forestGreenLight}"/>
            <w:insideV w:val="single" w:sz="4" w:color="${T3P_COLORS.forestGreenLight}"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="4000"/>
          <w:gridCol w:w="2750"/>
          <w:gridCol w:w="2750"/>
        </w:tblGrid>
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="9500" w:type="dxa"/><w:gridSpan w:val="3"/><w:shd w:val="clear" w:fill="${T3P_COLORS.forestGreen}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${T3P_COLORS.white}"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(dateFr.charAt(0).toUpperCase() + dateFr.slice(1))}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
    `;

    // ── Column headers (Gold background) ──
    const tableHeaderXml = `
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.gold}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="${T3P_COLORS.forestGreen}"/></w:rPr><w:t>Nom et Prénom du stagiaire</w:t></w:r></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2750" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.gold}"/><w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="${T3P_COLORS.forestGreen}"/></w:rPr><w:t>Matin (9h-12h30)</w:t></w:r></w:p>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="${T3P_COLORS.warmGray700}"/></w:rPr><w:t>Signature</w:t></w:r></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2750" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.gold}"/><w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="${T3P_COLORS.forestGreen}"/></w:rPr><w:t>Après-midi (14h-17h30)</w:t></w:r></w:p>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="${T3P_COLORS.warmGray700}"/></w:rPr><w:t>Signature</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
    `;

    // ── Rows for each contact ──
    let rowsXml = "";
    contacts.forEach((contact, idx) => {
      const bgFill = idx % 2 === 0 ? T3P_COLORS.white : T3P_COLORS.creamLight;
      const morningEmarg = dateEmargements.find(
        (e) => e.contact_id === contact.id && e.periode === "matin"
      );
      const afternoonEmarg = dateEmargements.find(
        (e) => e.contact_id === contact.id && e.periode === "apres_midi"
      );

      const morningStatus = getSignatureStatus(morningEmarg);
      const afternoonStatus = getSignatureStatus(afternoonEmarg);

      rowsXml += `
        <w:tr>
          <w:trPr><w:trHeight w:val="680" w:hRule="atLeast"/></w:trPr>
          <w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/><w:shd w:val="clear" w:fill="${bgFill}"/><w:vAlign w:val="center"/><w:tcMar><w:left w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="${T3P_COLORS.warmGray700}"/></w:rPr><w:t xml:space="preserve">${escapeXml(contact.nom.toUpperCase())} ${escapeXml(contact.prenom)}</w:t></w:r></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2750" w:type="dxa"/><w:shd w:val="clear" w:fill="${bgFill}"/><w:vAlign w:val="center"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/>${morningStatus.color ? `<w:color w:val="${morningStatus.color}"/><w:b/>` : `<w:color w:val="${T3P_COLORS.warmGray500}"/>`}</w:rPr><w:t xml:space="preserve">${escapeXml(morningStatus.text)}</w:t></w:r></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2750" w:type="dxa"/><w:shd w:val="clear" w:fill="${bgFill}"/><w:vAlign w:val="center"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/>${afternoonStatus.color ? `<w:color w:val="${afternoonStatus.color}"/><w:b/>` : `<w:color w:val="${T3P_COLORS.warmGray500}"/>`}</w:rPr><w:t xml:space="preserve">${escapeXml(afternoonStatus.text)}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
      `;
    });

    // Empty rows for additional stagiaires
    for (let i = 0; i < 3; i++) {
      const bgFill = (contacts.length + i) % 2 === 0 ? T3P_COLORS.white : T3P_COLORS.creamLight;
      rowsXml += `
        <w:tr>
          <w:trPr><w:trHeight w:val="680" w:hRule="atLeast"/></w:trPr>
          <w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/><w:shd w:val="clear" w:fill="${bgFill}"/></w:tcPr><w:p/></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2750" w:type="dxa"/><w:shd w:val="clear" w:fill="${bgFill}"/></w:tcPr><w:p/></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2750" w:type="dxa"/><w:shd w:val="clear" w:fill="${bgFill}"/></w:tcPr><w:p/></w:tc>
        </w:tr>
      `;
    }

    // ── Footer: signature blocks ──
    const footerXml = `
      </w:tbl>
      <w:p><w:pPr><w:spacing w:before="300"/></w:pPr></w:p>
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9500" w:type="dxa"/>
          <w:jc w:val="center"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
            <w:left w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
            <w:bottom w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
            <w:right w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
            <w:insideV w:val="single" w:sz="4" w:color="${T3P_COLORS.gold}"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="4750"/>
          <w:gridCol w:w="4750"/>
        </w:tblGrid>
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="4750" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.cream}"/><w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${T3P_COLORS.forestGreen}"/></w:rPr><w:t>Signature du formateur :</w:t></w:r></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
          </w:tc>
          <w:tc><w:tcPr><w:tcW w:w="4750" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.cream}"/><w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
            <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${T3P_COLORS.forestGreen}"/></w:rPr><w:t>Cachet de l'organisme :</w:t></w:r></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
            <w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>
          </w:tc>
        </w:tr>
      </w:tbl>

      <!-- Gold footer bar -->
      <w:p><w:pPr><w:spacing w:before="120"/></w:pPr></w:p>
      <w:tbl>
        <w:tblPr><w:tblW w:w="9500" w:type="dxa"/><w:jc w:val="center"/></w:tblPr>
        <w:tblGrid><w:gridCol w:w="9500"/></w:tblGrid>
        <w:tr><w:trPr><w:trHeight w:val="40" w:hRule="exact"/></w:trPr>
          <w:tc><w:tcPr><w:tcW w:w="9500" w:type="dxa"/><w:shd w:val="clear" w:fill="${T3P_COLORS.gold}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p></w:tc>
        </w:tr>
      </w:tbl>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="14"/><w:color w:val="${T3P_COLORS.warmGray500}"/></w:rPr><w:t xml:space="preserve">${escapeXml(session.centre_nom || "École T3P")} — Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}</w:t></w:r>
      </w:p>
    `;

    pagesXml += headerXml + infoXml + dateBannerXml + tableHeaderXml + rowsXml + footerXml;
  });

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
    return { text: `✓ Signé${time ? ` à ${time}` : ""}`, color: T3P_COLORS.successGreen };
  }
  if (emargement.present) {
    return { text: "✓ Présent", color: T3P_COLORS.presentBlue };
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
