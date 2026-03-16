import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import JSZip from "jszip";

// ============================================================
// FEUILLE D'ÉMARGEMENT DOCX — PREMIUM AUDIT-READY
// Charte T3P : Vert Forêt (#1B4D3E), Crème (#F5EBD7), Or (#D4A853)
// Usage modéré : filets fins, fond blanc dominant, lisibilité maximale
// ============================================================

const T3P = {
  forestGreen: "1B4D3E",
  cream: "F5EBD7",
  creamLight: "FBF7EF",
  gold: "D4A853",
  white: "FFFFFF",
  warmGray700: "4B463C",
  warmGray500: "898172",
  warmGray300: "C4BDB0",
  successGreen: "2A6B54",
  black: "1A1A1A",
};

const LAYOUT = {
  pageWidth: 10706,
  blockSpacing: 120, // twips between blocks
  signatureRowHeight: 800, // minimum for real signatures
  emptyRows: 3,
};

// Titres officiels France Compétences par type de formation
const FRANCE_COMPETENCES_TITLES: Record<string, string> = {
  "VTC": "Habilitation pour l'accès à la profession de conducteur de voiture de transport avec chauffeur (VTC)",
  "TAXI": "Habilitation pour l'accès à la profession de conducteur de taxi",
  "TAXI-75": "Habilitation pour l'accès à la profession de conducteur de taxi — Zone Paris (75)",
  "VMDTR": "Habilitation pour l'accès à la profession de conducteur de véhicule motorisé à deux ou trois roues (VMDTR)",
  "FC-VTC": "Formation continue — Conducteur de voiture de transport avec chauffeur (VTC)",
  "FC-TAXI": "Formation continue — Conducteur de taxi",
  "FC-VMDTR": "Formation continue — Conducteur de véhicule motorisé à deux ou trois roues (VMDTR)",
  "MOB-TAXI-75": "Mobilité — Conducteur de taxi — Zone Paris (75)",
};

function getFormationTitle(formationType?: string): string {
  if (!formationType) return "";
  const upper = formationType.toUpperCase().trim();
  return FRANCE_COMPETENCES_TITLES[upper] || formationType;
}

interface EmargementData {
  id: string;
  contact_id: string;
  date_emargement: string;
  periode: "matin" | "apres_midi" | "soir";
  present: boolean;
  signature_url: string | null;
  date_signature: string | null;
  contact?: { id: string; nom: string; prenom: string };
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

export async function generateEmargementDocx(
  emargements: EmargementData[],
  session: SessionInfo
): Promise<Blob> {
  const isFC = session.formation_type?.toUpperCase().startsWith("FC-");
  const sessionDates = eachDayOfInterval({
    start: new Date(session.date_debut),
    end: new Date(session.date_fin),
  }).filter((date) => isFC || !isWeekend(date));

  const contactsMap = new Map<string, { nom: string; prenom: string }>();
  emargements.forEach((e) => {
    if (e.contact && !contactsMap.has(e.contact_id)) {
      contactsMap.set(e.contact_id, { nom: e.contact.nom, prenom: e.contact.prenom });
    }
  });
  const contacts = Array.from(contactsMap.entries()).map(([id, c]) => ({ id, ...c }));

  const totalPages = sessionDates.length;
  const bodyXml = buildBody(sessionDates, contacts, emargements, session, totalPages);
  const documentXml = wrapDocument(bodyXml);

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypesXml());
  zip.file("_rels/.rels", relsXml());
  zip.file("word/_rels/document.xml.rels", documentRelsXml());
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml());

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// ── OOXML scaffolding ──

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
}

function relsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function documentRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="20"/></w:rPr>
  </w:style>
</w:styles>`;
}

function wrapDocument(bodyContent: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyContent}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="500" w:right="600" w:bottom="500" w:left="600" w:header="400" w:footer="400" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

// ── Body builder (one page per day) ──

function buildBody(
  sessionDates: Date[],
  contacts: { id: string; nom: string; prenom: string }[],
  emargements: EmargementData[],
  session: SessionInfo,
  totalPages: number
): string {
  let xml = "";

  sessionDates.forEach((date, pageIdx) => {
    if (pageIdx > 0) {
      xml += `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;
    }

    const pageNum = pageIdx + 1;

    // 1. En-tête organisme — sobre, filet fin
    xml += headerBlock(session);
    xml += spacer(LAYOUT.blockSpacing);

    // 2. Titre principal
    xml += titleBlock(session);
    xml += spacer(LAYOUT.blockSpacing);

    // 3. Bloc session du jour
    xml += sessionInfoBlock(session, date);
    xml += spacer(LAYOUT.blockSpacing);

    // 4. Tableau émargement
    xml += emargementTable(date, contacts, emargements);
    xml += spacer(Math.floor(LAYOUT.blockSpacing * 1.2));

    // 5. Bloc signatures formateur / cachet
    xml += signatureBlock();
    xml += spacer(LAYOUT.blockSpacing);

    // 6. Pied de page
    xml += footerBlock(session, pageNum, totalPages);
  });

  return xml;
}

// ══════════════════════════════════════════
// 1. EN-TÊTE ORGANISME — sobre, filet fin
// ══════════════════════════════════════════

function headerBlock(session: SessionInfo): string {
  // Compact single-line header with fine border bottom
  const parts: string[] = [];

  if (session.centre_nom) parts.push(esc(session.centre_nom));

  const detailParts: string[] = [];
  if (session.centre_adresse) detailParts.push(esc(session.centre_adresse));
  if (session.centre_telephone) detailParts.push(`Tél. ${esc(session.centre_telephone)}`);
  if (session.centre_email) detailParts.push(esc(session.centre_email));

  const legalParts: string[] = [];
  if (session.centre_siret) legalParts.push(`SIRET ${esc(session.centre_siret)}`);
  if (session.centre_nda) legalParts.push(`NDA ${esc(session.centre_nda)}`);

  // Organisation name — bold, forest green, moderate size
  let xml = "";
  if (parts.length > 0) {
    xml += `<w:p><w:pPr><w:spacing w:after="30"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr>
      <w:t xml:space="preserve">${parts[0]}</w:t></w:r></w:p>`;
  }

  // Contact details — single line, small, warm gray
  if (detailParts.length > 0) {
    xml += `<w:p><w:pPr><w:spacing w:after="20"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr>
      <w:t xml:space="preserve">${detailParts.join(" — ")}</w:t></w:r></w:p>`;
  }

  // Legal identifiers — single line, small
  if (legalParts.length > 0) {
    xml += `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="14"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr>
      <w:t xml:space="preserve">${legalParts.join(" | ")}</w:t></w:r></w:p>`;
  }

  // Fine green separator line
  xml += fineSeparator(T3P.forestGreen);

  return xml;
}

// ══════════════════════════════════════════
// 2. TITRE — FEUILLE D'ÉMARGEMENT + formation
// ══════════════════════════════════════════

function titleBlock(session: SessionInfo): string {
  let xml = centeredParagraph("FEUILLE D'ÉMARGEMENT", 28, T3P.forestGreen, true, 0, 40);

  const formationTitle = getFormationTitle(session.formation_type);
  if (formationTitle) {
    xml += centeredParagraph(formationTitle, 17, T3P.warmGray700, true, 0, 20);
  }

  if (session.nom) {
    xml += centeredParagraph(`Réf. : ${esc(session.nom)}`, 15, T3P.warmGray500, false, 0, 0);
  }

  return xml;
}

// ══════════════════════════════════════════
// 3. BLOC SESSION DU JOUR
// ══════════════════════════════════════════

function sessionInfoBlock(session: SessionInfo, date: Date): string {
  const dayLabel = format(date, "EEEE dd MMMM yyyy", { locale: fr });

  // Build key-value pairs, only include non-empty
  const fields: { label: string; value: string }[] = [];
  fields.push({ label: "Date", value: dayLabel });
  if (session.lieu) fields.push({ label: "Lieu", value: session.lieu });
  if (session.formateur_nom) fields.push({ label: "Formateur", value: session.formateur_nom });

  // Render as a clean 2-column key-value table
  const colLabelW = 2200;
  const colValueW = LAYOUT.pageWidth - colLabelW;

  let rows = "";
  fields.forEach((f, idx) => {
    const isLast = idx === fields.length - 1;
    rows += `<w:tr><w:trPr><w:trHeight w:val="340" w:hRule="atLeast"/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="${colLabelW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.cream}"/><w:vAlign w:val="center"/>
        <w:tcBorders><w:bottom w:val="${isLast ? "single" : "nil"}" w:sz="4" w:space="0" w:color="${T3P.gold}"/><w:top w:val="${idx === 0 ? "single" : "nil"}" w:sz="4" w:space="0" w:color="${T3P.gold}"/><w:left w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/><w:right w:val="nil"/></w:tcBorders>
        <w:tcMar><w:left w:w="100" w:type="dxa"/></w:tcMar>
      </w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${esc(f.label)}</w:t></w:r></w:p>
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colValueW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.white}"/><w:vAlign w:val="center"/>
        <w:tcBorders><w:bottom w:val="${isLast ? "single" : "nil"}" w:sz="4" w:space="0" w:color="${T3P.gold}"/><w:top w:val="${idx === 0 ? "single" : "nil"}" w:sz="4" w:space="0" w:color="${T3P.gold}"/><w:left w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/><w:right w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/></w:tcBorders>
        <w:tcMar><w:left w:w="100" w:type="dxa"/></w:tcMar>
      </w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:color w:val="${T3P.warmGray700}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(f.value)}</w:t></w:r></w:p>
      </w:tc>
    </w:tr>`;
  });

  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:insideH w:val="single" w:sz="2" w:space="0" w:color="${T3P.warmGray300}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="${colLabelW}"/><w:gridCol w:w="${colValueW}"/></w:tblGrid>
    ${rows}
  </w:tbl>`;
}

// ══════════════════════════════════════════
// 4. TABLEAU ÉMARGEMENT
// ══════════════════════════════════════════

function emargementTable(
  date: Date,
  contacts: { id: string; nom: string; prenom: string }[],
  emargements: EmargementData[]
): string {
  const isSoir = emargements.some((e) => e.periode === "soir");
  const dateStr = format(date, "yyyy-MM-dd");

  const numColW = 500;
  const nameColW = 3800;

  if (isSoir) {
    const sigColW = LAYOUT.pageWidth - numColW - nameColW;
    return buildEmargementTableXml(
      [numColW, nameColW, sigColW],
      ["N°", "Nom et Prénom", "Soir (émargement)"],
      contacts,
      dateStr,
      emargements,
      ["soir"]
    );
  }

  const sigColW = Math.floor((LAYOUT.pageWidth - numColW - nameColW) / 2);
  return buildEmargementTableXml(
    [numColW, nameColW, sigColW, sigColW],
    ["N°", "Nom et Prénom", "Matin (émargement)", "Après-midi (émargement)"],
    contacts,
    dateStr,
    emargements,
    ["matin", "apres_midi"]
  );
}

function buildEmargementTableXml(
  colWidths: number[],
  headers: string[],
  contacts: { id: string; nom: string; prenom: string }[],
  dateStr: string,
  emargements: EmargementData[],
  periodes: string[]
): string {
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  // Header row
  let headerRow = `<w:tr><w:trPr><w:trHeight w:val="380" w:hRule="atLeast"/></w:trPr>`;
  headers.forEach((label, i) => {
    headerRow += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[i]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.forestGreen}"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="${T3P.white}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${esc(label)}</w:t></w:r></w:p>
    </w:tc>`;
  });
  headerRow += `</w:tr>`;

  // Contact rows
  let contactRows = "";
  contacts.forEach((contact, idx) => {
    const bg = idx % 2 === 0 ? T3P.white : T3P.creamLight;
    const num = idx + 1;

    contactRows += `<w:tr><w:trPr><w:trHeight w:val="${LAYOUT.signatureRowHeight}" w:hRule="atLeast"/></w:trPr>`;

    // N° column
    contactRows += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[0]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${num}</w:t></w:r></w:p>
    </w:tc>`;

    // Name column
    contactRows += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[1]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/><w:tcMar><w:left w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>
      <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="${T3P.black}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(contact.nom.toUpperCase())} ${esc(contact.prenom)}</w:t></w:r></w:p>
    </w:tc>`;

    // Signature columns
    periodes.forEach((periode, pIdx) => {
      const colIdx = 2 + pIdx;
      const emarg = emargements.find(
        (e) => e.date_emargement === dateStr && e.contact_id === contact.id && e.periode === periode
      );
      contactRows += sigCell(colWidths[colIdx], bg, sigStatus(emarg));
    });

    contactRows += `</w:tr>`;
  });

  // Empty rows for manual additions
  let emptyRows = "";
  for (let i = 0; i < LAYOUT.emptyRows; i++) {
    const bg = (contacts.length + i) % 2 === 0 ? T3P.white : T3P.creamLight;
    const num = contacts.length + i + 1;
    emptyRows += `<w:tr><w:trPr><w:trHeight w:val="${LAYOUT.signatureRowHeight}" w:hRule="atLeast"/></w:trPr>`;

    // N° column
    emptyRows += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[0]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="${T3P.warmGray300}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${num}</w:t></w:r></w:p>
    </w:tc>`;

    // Empty name + sig columns
    for (let c = 1; c < colWidths.length; c++) {
      emptyRows += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[c]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:tc>`;
    }
    emptyRows += `</w:tr>`;
  }

  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${totalW}" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="${T3P.warmGray300}"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="${T3P.warmGray300}"/>
        <w:insideH w:val="single" w:sz="2" w:space="0" w:color="${T3P.warmGray300}"/>
        <w:insideV w:val="single" w:sz="2" w:space="0" w:color="${T3P.warmGray300}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>${colWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>
    ${headerRow}${contactRows}${emptyRows}
  </w:tbl>`;
}

// ══════════════════════════════════════════
// 5. BLOC SIGNATURES FORMATEUR / CACHET
// ══════════════════════════════════════════

function signatureBlock(): string {
  const colW = Math.floor(LAYOUT.pageWidth / 2);
  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="${T3P.warmGray300}"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="${T3P.warmGray300}"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="${T3P.warmGray300}"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="${T3P.warmGray300}"/>
        <w:insideV w:val="single" w:sz="2" w:space="0" w:color="${T3P.warmGray300}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/></w:tblGrid>
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>Signature du formateur :</w:t></w:r></w:p>
        <w:p/><w:p/><w:p/>
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>Cachet de l'organisme :</w:t></w:r></w:p>
        <w:p/><w:p/><w:p/>
      </w:tc>
    </w:tr>
  </w:tbl>`;
}

// ══════════════════════════════════════════
// 6. PIED DE PAGE — centre + date + page
// ══════════════════════════════════════════

function footerBlock(session: SessionInfo, pageNum: number, totalPages: number): string {
  const left = session.centre_nom ? esc(session.centre_nom) : "";
  const center = `Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`;
  const right = `Page ${pageNum}/${totalPages}`;

  const colW = Math.floor(LAYOUT.pageWidth / 3);

  return `${fineSeparator(T3P.warmGray300)}
  <w:tbl>
    <w:tblPr><w:tblW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:jc w:val="center"/></w:tblPr>
    <w:tblGrid><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/></w:tblGrid>
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="14"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${left}</w:t></w:r></w:p>
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="14"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(center)}</w:t></w:r></w:p>
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="14"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(right)}</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
  </w:tbl>`;
}

// ── Helpers ──

function fineSeparator(color: string): string {
  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:jc w:val="center"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>
    <w:tblGrid><w:gridCol w:w="${LAYOUT.pageWidth}"/></w:tblGrid>
    <w:tr><w:trPr><w:trHeight w:val="10" w:hRule="exact"/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${color}"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>
      </w:tc>
    </w:tr>
  </w:tbl>`;
}

function spacer(twips: number): string {
  return `<w:p><w:pPr><w:spacing w:before="${twips}" w:after="0"/></w:pPr></w:p>`;
}

function centeredParagraph(text: string, size: number, color: string, bold: boolean, before: number, after: number): string {
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="${before}" w:after="${after}"/></w:pPr>
    <w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/><w:color w:val="${color}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function sigStatus(emargement?: EmargementData): { text: string; color: string } {
  if (!emargement) return { text: "", color: "" };
  if (emargement.signature_url || emargement.date_signature) {
    const time = emargement.date_signature ? format(new Date(emargement.date_signature), "HH:mm") : "";
    return { text: `✓ Signé${time ? ` à ${time}` : ""}`, color: T3P.successGreen };
  }
  if (emargement.present) return { text: "✓ Présent", color: T3P.forestGreen };
  return { text: "", color: "" };
}

function sigCell(width: number, bg: string, status: { text: string; color: string }): string {
  const rpr = status.color
    ? `<w:sz w:val="16"/><w:color w:val="${status.color}"/><w:b/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`
    : `<w:sz w:val="16"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`;
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${esc(status.text)}</w:t></w:r></w:p>
  </w:tc>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
