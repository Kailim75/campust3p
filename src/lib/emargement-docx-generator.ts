import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import JSZip from "jszip";

// ============================================================
// CHARTE GRAPHIQUE T3P CAMPUS - FEUILLE D'ÉMARGEMENT DOCX (OOXML)
// Vert Forêt (#1B4D3E), Crème (#F5EBD7), Or (#D4A853)
// ============================================================

const T3P = {
  forestGreen: "1B4D3E",
  cream: "F5EBD7",
  creamLight: "FBF7EF",
  gold: "D4A853",
  white: "FFFFFF",
  warmGray700: "4B463C",
  warmGray500: "898172",
  successGreen: "2A6B54",
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
  periode: "matin" | "apres_midi";
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
  // Don't filter weekends for FC (formation continue) sessions - often held on Saturdays
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

  const bodyXml = buildBody(sessionDates, contacts, emargements, session);
  const documentXml = wrapDocument(bodyXml);

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypesXml());
  zip.file("_rels/.rels", relsXml());
  zip.file("word/_rels/document.xml.rels", documentRelsXml());
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml());

  return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
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
  session: SessionInfo
): string {
  let xml = "";

  sessionDates.forEach((date, pageIdx) => {
    // Page break before each page except the first
    if (pageIdx > 0) {
      xml += `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;
    }

    // ── Header band with centre info ──
    xml += headerBand(session);
    xml += accentBar(T3P.gold, 30);

    // ── Title ──
    xml += centeredParagraph("FEUILLE D'ÉMARGEMENT", 28, T3P.forestGreen, true, 100, 40);

    // ── Formation title (France Compétences) ──
    const formationTitle = getFormationTitle(session.formation_type);
    if (formationTitle) {
      xml += centeredParagraph(formationTitle, 18, T3P.warmGray700, true, 0, 20);
    }

    // ── Session name ──
    xml += centeredParagraph(session.nom, 16, T3P.warmGray700, false, 0, 40);

    // ── Session info for the day ──
    xml += dayInfoTable(session, date);

    // ── Emargement table for this day ──
    xml += dayEmargementTable(date, contacts, emargements);

    // ── Signature blocks ──
    xml += signatureBlocks();

    // ── Footer ──
    xml += accentBar(T3P.gold, 20);
    xml += centeredParagraph(
      `${esc(session.centre_nom || "")} — Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`,
      10, T3P.warmGray500, false, 40, 0
    );
  });

  return xml;
}

// ── Components ──

function headerBand(session: SessionInfo): string {
  const tableWidth = 10706;
  const lines: { text: string; size: number; color: string; bold?: boolean }[] = [
    { text: esc(session.centre_nom || ""), size: 28, color: T3P.white, bold: true },
  ];

  if (session.centre_adresse) {
    lines.push({ text: esc(session.centre_adresse), size: 16, color: T3P.creamLight });
  }

  const contactLine = [session.centre_telephone, session.centre_email].filter(Boolean).join(" — ");
  if (contactLine) {
    lines.push({ text: esc(contactLine), size: 14, color: T3P.creamLight });
  }

  const legalParts: string[] = [];
  if (session.centre_siret) legalParts.push(`SIRET : ${session.centre_siret}`);
  if (session.centre_nda) legalParts.push(`NDA : ${session.centre_nda}`);
  if (legalParts.length > 0) {
    lines.push({ text: esc(legalParts.join(" | ")), size: 14, color: T3P.creamLight });
  }

  return singleCellTable(T3P.forestGreen, tableWidth, lines);
}

function accentBar(color: string, height: number): string {
  const tableWidth = 10706;
  return `<w:tbl>
  <w:tblPr><w:tblW w:w="${tableWidth}" w:type="dxa"/><w:jc w:val="center"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>
  <w:tblGrid><w:gridCol w:w="${tableWidth}"/></w:tblGrid>
  <w:tr><w:trPr><w:trHeight w:val="${height}" w:hRule="exact"/></w:trPr>
    <w:tc><w:tcPr><w:tcW w:w="${tableWidth}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${color}"/></w:tcPr>
      <w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>
    </w:tc>
  </w:tr></w:tbl>`;
}

function dayInfoTable(session: SessionInfo, date: Date): string {
  const dayLabel = format(date, "EEEE dd MMMM yyyy", { locale: fr });
  const cols = [
    { label: "Date", value: dayLabel },
    { label: "Lieu", value: session.lieu || "—" },
    { label: "Formateur", value: session.formateur_nom || "—" },
  ];
  const colW = Math.floor(10706 / cols.length);

  let rows = "<w:tr>";
  cols.forEach(({ label, value }) => {
    rows += `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.cream}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>
      <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${esc(label)}</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="${T3P.warmGray700}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(value)}</w:t></w:r></w:p>
    </w:tc>`;
  });
  rows += "</w:tr>";

  return `<w:p><w:pPr><w:spacing w:before="60" w:after="0"/></w:pPr></w:p>
  <w:tbl>
    <w:tblPr><w:tblW w:w="10706" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>${cols.map(() => `<w:gridCol w:w="${colW}"/>`).join("")}</w:tblGrid>
    ${rows}
  </w:tbl>
  <w:p><w:pPr><w:spacing w:before="60" w:after="0"/></w:pPr></w:p>`;
}

function dayEmargementTable(
  date: Date,
  contacts: { id: string; nom: string; prenom: string }[],
  emargements: EmargementData[]
): string {
  const totalWidth = 10706;
  const nameColW = 4000;
  const sigColW = Math.floor((totalWidth - nameColW) / 2);
  const dateStr = format(date, "yyyy-MM-dd");

  // Header row
  let headerRow = `<w:tr><w:trPr><w:trHeight w:val="400" w:hRule="atLeast"/></w:trPr>`;
  headerRow += headerCell(nameColW, "Nom et Prénom");
  headerRow += headerCell(sigColW, "Matin");
  headerRow += headerCell(sigColW, "Après-midi");
  headerRow += `</w:tr>`;

  // Contact rows
  let contactRows = "";
  contacts.forEach((contact, idx) => {
    const bg = idx % 2 === 0 ? T3P.white : T3P.creamLight;
    const morning = emargements.find(e => e.date_emargement === dateStr && e.contact_id === contact.id && e.periode === "matin");
    const afternoon = emargements.find(e => e.date_emargement === dateStr && e.contact_id === contact.id && e.periode === "apres_midi");

    contactRows += `<w:tr><w:trPr><w:trHeight w:val="600" w:hRule="atLeast"/></w:trPr>`;
    contactRows += `<w:tc><w:tcPr><w:tcW w:w="${nameColW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/><w:tcMar><w:left w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>
      <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${T3P.warmGray700}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(contact.nom.toUpperCase())} ${esc(contact.prenom)}</w:t></w:r></w:p>
    </w:tc>`;
    contactRows += sigCell(sigColW, bg, sigStatus(morning));
    contactRows += sigCell(sigColW, bg, sigStatus(afternoon));
    contactRows += `</w:tr>`;
  });

  // Empty rows for manual entries
  let emptyRows = "";
  for (let i = 0; i < 3; i++) {
    const bg = (contacts.length + i) % 2 === 0 ? T3P.white : T3P.creamLight;
    emptyRows += `<w:tr><w:trPr><w:trHeight w:val="600" w:hRule="atLeast"/></w:trPr>`;
    emptyRows += `<w:tc><w:tcPr><w:tcW w:w="${nameColW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:tc>`;
    emptyRows += `<w:tc><w:tcPr><w:tcW w:w="${sigColW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:tc>`;
    emptyRows += `<w:tc><w:tcPr><w:tcW w:w="${sigColW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:tc>`;
    emptyRows += `</w:tr>`;
  }

  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${totalWidth}" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="${T3P.forestGreen}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="${nameColW}"/><w:gridCol w:w="${sigColW}"/><w:gridCol w:w="${sigColW}"/></w:tblGrid>
    ${headerRow}
    ${contactRows}
    ${emptyRows}
  </w:tbl>`;
}

function headerCell(width: number, label: string): string {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.gold}"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${esc(label)}</w:t></w:r></w:p>
  </w:tc>`;
}

function signatureBlocks(): string {
  const colW = 5353;
  return `<w:p><w:pPr><w:spacing w:before="160" w:after="0"/></w:pPr></w:p>
  <w:tbl>
    <w:tblPr><w:tblW w:w="10706" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/></w:tblGrid>
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.cream}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
        <w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>Signature du formateur :</w:t></w:r></w:p>
        <w:p/><w:p/><w:p/>
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.cream}"/><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>Cachet de l'organisme :</w:t></w:r></w:p>
        <w:p/><w:p/><w:p/>
      </w:tc>
    </w:tr>
  </w:tbl>`;
}

// ── Helpers ──

function singleCellTable(fill: string, width: number, lines: { text: string; size: number; color: string; bold?: boolean }[]): string {
  const ps = lines.map((l, i) => {
    const after = i < lines.length - 1 ? "40" : "0";
    return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="${after}"/></w:pPr>
      <w:r><w:rPr>${l.bold ? "<w:b/>" : ""}<w:sz w:val="${l.size}"/><w:color w:val="${l.color}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${l.text}</w:t></w:r></w:p>`;
  }).join("");

  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:jc w:val="center"/></w:tblPr>
    <w:tblGrid><w:gridCol w:w="${width}"/></w:tblGrid>
    <w:tr><w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${fill}"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tcMar></w:tcPr>
      ${ps}
    </w:tc></w:tr>
  </w:tbl>`;
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
    ? `<w:sz w:val="18"/><w:color w:val="${status.color}"/><w:b/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`
    : `<w:sz w:val="18"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`;
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${esc(status.text)}</w:t></w:r></w:p>
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
