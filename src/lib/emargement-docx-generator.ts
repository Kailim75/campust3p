import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import JSZip from "jszip";

// ============================================================
// FEUILLE D'ÉMARGEMENT DOCX — PREMIUM AUDIT-READY V3
// Charte T3P : Vert Forêt (#1B4D3E), Crème (#F5EBD7), Or (#D4A853)
// Design institutionnel sobre — filets fins, fond blanc dominant
// Agréments Taxi / VTC / VMDTR intégrés
// ============================================================

const T3P = {
  forestGreen: "1B4D3E",
  cream: "F5EBD7",
  creamLight: "FBF7EF",
  gold: "D4A853",
  goldLight: "E8C97A",
  white: "FFFFFF",
  warmGray700: "4B463C",
  warmGray500: "898172",
  warmGray300: "C4BDB0",
  warmGray100: "EDEBE7",
  successGreen: "2A6B54",
  black: "1A1A1A",
};

const LAYOUT = {
  pageWidth: 10706,
  blockSpacing: 90,
  signatureRowHeight: 760,
  emptyRows: 3,
};

// Titres officiels France Compétences
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
  heure_debut?: string | null;
  heure_fin?: string | null;
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
  centre_qualiopi?: string;
  centre_agrement_prefecture?: string;
  centre_code_rncp?: string;
  centre_code_rs?: string;
  agrement_taxi?: string;
  agrement_vtc?: string;
  agrement_vmdtr?: string;
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
      <w:pgMar w:top="460" w:right="560" w:bottom="460" w:left="560" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

// ══════════════════════════════════════════════════
// BODY — une page par jour de session
// ══════════════════════════════════════════════════

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

    // 1. Bandeau organisme
    xml += headerBand(session);
    xml += spacer(50);

    // 2. Titre
    xml += titleBlock(session);
    xml += spacer(LAYOUT.blockSpacing);

    // 3. Bloc session du jour
    xml += sessionInfoBlock(session, date);
    xml += spacer(LAYOUT.blockSpacing);

    // 4. Tableau émargement
    xml += emargementTable(date, contacts, emargements);
    xml += spacer(Math.floor(LAYOUT.blockSpacing * 1.4));

    // 5. Signatures
    xml += signatureBlock();
    xml += spacer(70);

    // 6. Pied de page
    xml += footerBlock(session, pageNum, totalPages);
  });

  return xml;
}

// ══════════════════════════════════════════════════
// 1. BANDEAU ORGANISME — 2 niveaux visuels
// ══════════════════════════════════════════════════

function headerBand(session: SessionInfo): string {
  const w = LAYOUT.pageWidth;

  // ── Top band: vert forêt avec nom + coordonnées ──
  const topParas: string[] = [];

  if (session.centre_nom) {
    topParas.push(cellPara(esc(session.centre_nom), 28, T3P.white, true, "center", 0));
  }

  if (session.centre_adresse) {
    topParas.push(cellPara(esc(session.centre_adresse), 14, T3P.creamLight, false, "center", 10));
  }

  const contactParts = [
    session.centre_telephone ? `Tél. ${session.centre_telephone}` : "",
    session.centre_email || "",
  ].filter(Boolean);
  if (contactParts.length > 0) {
    topParas.push(cellPara(esc(contactParts.join("  ·  ")), 13, T3P.creamLight, false, "center", 0));
  }

  const topBand = `<w:tbl>
    <w:tblPr><w:tblW w:w="${w}" w:type="dxa"/><w:jc w:val="center"/></w:tblPr>
    <w:tblGrid><w:gridCol w:w="${w}"/></w:tblGrid>
    <w:tr><w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.forestGreen}"/>
      <w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tcMar>
    </w:tcPr>
      ${topParas.join("")}
    </w:tc></w:tr>
  </w:tbl>`;

  // ── Bottom band: crème avec identifiants légaux + agréments ──
  const bottomLines: string[] = [];

  // Line 1: SIRET + NDA
  const legalParts: string[] = [];
  if (session.centre_siret) legalParts.push(`SIRET : ${session.centre_siret}`);
  if (session.centre_nda) legalParts.push(`Déclaration d'activité n° ${session.centre_nda}`);
  if (legalParts.length > 0) bottomLines.push(legalParts.join("  ·  "));

  // Line 2: Certifications (Qualiopi, RNCP, RS)
  const certParts: string[] = [];
  if (session.centre_qualiopi) certParts.push(`Certifié Qualiopi n° ${session.centre_qualiopi}`);
  if (session.centre_code_rncp) certParts.push(`RNCP ${session.centre_code_rncp}`);
  if (session.centre_code_rs) certParts.push(`RS ${session.centre_code_rs}`);
  if (certParts.length > 0) bottomLines.push(certParts.join("  ·  "));

  // Line 3: Agréments métier (Taxi, VTC, VMDTR, Préfecture)
  const agParts: string[] = [];
  if (session.agrement_taxi) agParts.push(`Agrément Taxi : ${session.agrement_taxi}`);
  if (session.agrement_vtc) agParts.push(`Agrément VTC : ${session.agrement_vtc}`);
  if (session.agrement_vmdtr) agParts.push(`Agrément VMDTR : ${session.agrement_vmdtr}`);
  if (session.centre_agrement_prefecture) agParts.push(`Agrément préfectoral : ${session.centre_agrement_prefecture}`);
  if (agParts.length > 0) bottomLines.push(agParts.join("  ·  "));

  let bottomBand = "";
  if (bottomLines.length > 0) {
    const bottomParas = bottomLines.map((line, i) =>
      cellPara(esc(line), 12, T3P.warmGray700, false, "center", i < bottomLines.length - 1 ? 10 : 0)
    ).join("");

    bottomBand = `<w:tbl>
      <w:tblPr><w:tblW w:w="${w}" w:type="dxa"/><w:jc w:val="center"/></w:tblPr>
      <w:tblGrid><w:gridCol w:w="${w}"/></w:tblGrid>
      <w:tr><w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.cream}"/>
        <w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tcMar>
        <w:tcBorders><w:bottom w:val="single" w:sz="6" w:space="0" w:color="${T3P.gold}"/></w:tcBorders>
      </w:tcPr>
        ${bottomParas}
      </w:tc></w:tr>
    </w:tbl>`;
  } else {
    // Just a gold accent line if no legal info
    bottomBand = goldAccentLine();
  }

  return topBand + bottomBand;
}

// ══════════════════════════════════════════════════
// 2. TITRE
// ══════════════════════════════════════════════════

function titleBlock(session: SessionInfo): string {
  let xml = centeredParagraph("FEUILLE D'ÉMARGEMENT", 30, T3P.forestGreen, true, 0, 24);

  const formationTitle = getFormationTitle(session.formation_type);
  if (formationTitle) {
    xml += centeredParagraph(formationTitle, 16, T3P.warmGray700, true, 0, 14);
  }

  if (session.nom) {
    xml += centeredParagraph(`Réf. session : ${esc(session.nom)}`, 14, T3P.warmGray500, false, 0, 0);
  }

  return xml;
}

// ══════════════════════════════════════════════════
// 3. BLOC SESSION DU JOUR
// ══════════════════════════════════════════════════

function sessionInfoBlock(session: SessionInfo, date: Date): string {
  const dayLabel = format(date, "EEEE dd MMMM yyyy", { locale: fr });
  const dayLabelCap = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);

  const fields: { label: string; value: string }[] = [];
  if (session.nom) fields.push({ label: "Module", value: session.nom });
  fields.push({ label: "Date", value: dayLabelCap });
  if (session.lieu) fields.push({ label: "Lieu", value: session.lieu });
  if (session.formateur_nom) fields.push({ label: "Formateur", value: session.formateur_nom });

  const colLabelW = 1800;
  const colValueW = LAYOUT.pageWidth - colLabelW;

  let rows = "";
  fields.forEach((f, idx) => {
    const bg = idx % 2 === 0 ? T3P.creamLight : T3P.white;
    rows += `<w:tr><w:trPr><w:trHeight w:val="300" w:hRule="atLeast"/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="${colLabelW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.forestGreen}"/><w:vAlign w:val="center"/>
        <w:tcMar><w:left w:w="120" w:type="dxa"/></w:tcMar>
      </w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="${T3P.white}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${esc(f.label)}</w:t></w:r></w:p>
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colValueW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/>
        <w:tcMar><w:left w:w="140" w:type="dxa"/></w:tcMar>
      </w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:color w:val="${T3P.warmGray700}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(f.value)}</w:t></w:r></w:p>
      </w:tc>
    </w:tr>`;
  });

  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:insideH w:val="single" w:sz="2" w:space="0" w:color="${T3P.warmGray100}"/>
        <w:insideV w:val="single" w:sz="2" w:space="0" w:color="${T3P.forestGreen}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="${colLabelW}"/><w:gridCol w:w="${colValueW}"/></w:tblGrid>
    ${rows}
  </w:tbl>`;
}

// ══════════════════════════════════════════════════
// 4. TABLEAU ÉMARGEMENT
// ══════════════════════════════════════════════════

function emargementTable(
  date: Date,
  contacts: { id: string; nom: string; prenom: string }[],
  emargements: EmargementData[]
): string {
  const isSoir = emargements.some((e) => e.periode === "soir");
  const dateStr = format(date, "yyyy-MM-dd");

  // Helper to build period label with hours
  const getPeriodLabel = (periode: string): string => {
    const dayEmargements = emargements.filter(
      (e) => e.date_emargement === dateStr && e.periode === periode
    );
    const sample = dayEmargements.find((e) => e.heure_debut && e.heure_fin);
    if (sample?.heure_debut && sample?.heure_fin) {
      return `Émargement — ${sample.heure_debut} - ${sample.heure_fin}`;
    }
    if (periode === "soir") return "Émargement — Soir";
    if (periode === "matin") return "Émargement — Matin";
    return "Émargement — Après-midi";
  };

  const numColW = 450;
  const nameColW = 3600;

  if (isSoir) {
    const sigColW = LAYOUT.pageWidth - numColW - nameColW;
    return buildTableXml(
      [numColW, nameColW, sigColW],
      ["N°", "Nom et Prénom", getPeriodLabel("soir")],
      contacts, dateStr, emargements, ["soir"]
    );
  }

  const sigColW = Math.floor((LAYOUT.pageWidth - numColW - nameColW) / 2);
  return buildTableXml(
    [numColW, nameColW, sigColW, sigColW],
    ["N°", "Nom et Prénom", getPeriodLabel("matin"), getPeriodLabel("apres_midi")],
    contacts, dateStr, emargements, ["matin", "apres_midi"]
  );
}

function buildTableXml(
  colWidths: number[],
  headers: string[],
  contacts: { id: string; nom: string; prenom: string }[],
  dateStr: string,
  emargements: EmargementData[],
  periodes: string[]
): string {
  // Header row
  let headerRow = `<w:tr><w:trPr><w:trHeight w:val="380" w:hRule="atLeast"/></w:trPr>`;
  headers.forEach((label, i) => {
    headerRow += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[i]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.forestGreen}"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="15"/><w:color w:val="${T3P.white}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${esc(label)}</w:t></w:r></w:p>
    </w:tc>`;
  });
  headerRow += `</w:tr>`;

  // Contact rows
  let contactRows = "";
  contacts.forEach((contact, idx) => {
    const bg = idx % 2 === 0 ? T3P.white : T3P.creamLight;

    contactRows += `<w:tr><w:trPr><w:trHeight w:val="${LAYOUT.signatureRowHeight}" w:hRule="atLeast"/></w:trPr>`;

    // N°
    contactRows += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[0]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="15"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${idx + 1}</w:t></w:r></w:p>
    </w:tc>`;

    // Nom Prénom
    contactRows += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[1]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/><w:tcMar><w:left w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>
      <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="${T3P.black}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(contact.nom.toUpperCase())} ${esc(contact.prenom)}</w:t></w:r></w:p>
    </w:tc>`;

    // Signature columns
    periodes.forEach((periode, pIdx) => {
      const emarg = emargements.find(
        (e) => e.date_emargement === dateStr && e.contact_id === contact.id && e.periode === periode
      );
      contactRows += sigCell(colWidths[2 + pIdx], bg, sigStatus(emarg));
    });

    contactRows += `</w:tr>`;
  });

  // Empty rows
  let emptyRows = "";
  for (let i = 0; i < LAYOUT.emptyRows; i++) {
    const bg = (contacts.length + i) % 2 === 0 ? T3P.white : T3P.creamLight;
    emptyRows += `<w:tr><w:trPr><w:trHeight w:val="${LAYOUT.signatureRowHeight}" w:hRule="atLeast"/></w:trPr>`;
    emptyRows += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[0]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="15"/><w:color w:val="${T3P.warmGray300}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${contacts.length + i + 1}</w:t></w:r></w:p>
    </w:tc>`;
    for (let c = 1; c < colWidths.length; c++) {
      emptyRows += `<w:tc><w:tcPr><w:tcW w:w="${colWidths[c]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:tc>`;
    }
    emptyRows += `</w:tr>`;
  }

  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="8" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="${T3P.warmGray300}"/>
        <w:bottom w:val="single" w:sz="8" w:space="0" w:color="${T3P.forestGreen}"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="${T3P.warmGray300}"/>
        <w:insideH w:val="single" w:sz="2" w:space="0" w:color="${T3P.warmGray100}"/>
        <w:insideV w:val="single" w:sz="2" w:space="0" w:color="${T3P.warmGray300}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>${colWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>
    ${headerRow}${contactRows}${emptyRows}
  </w:tbl>`;
}

// ══════════════════════════════════════════════════
// 5. SIGNATURES
// ══════════════════════════════════════════════════

function signatureBlock(): string {
  const colW = Math.floor(LAYOUT.pageWidth / 2);
  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="${T3P.gold}"/>
        <w:insideV w:val="single" w:sz="2" w:space="0" w:color="${T3P.gold}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/></w:tblGrid>
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.creamLight}"/>
        <w:tcMar><w:top w:w="70" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:left w:w="140" w:type="dxa"/></w:tcMar>
      </w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="15"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>Signature du formateur :</w:t></w:r></w:p>
        <w:p/><w:p/><w:p/>
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.creamLight}"/>
        <w:tcMar><w:top w:w="70" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar>
      </w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="15"/><w:color w:val="${T3P.forestGreen}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>Cachet de l'organisme :</w:t></w:r></w:p>
        <w:p/><w:p/><w:p/>
      </w:tc>
    </w:tr>
  </w:tbl>`;
}

// ══════════════════════════════════════════════════
// 6. PIED DE PAGE
// ══════════════════════════════════════════════════

function footerBlock(session: SessionInfo, pageNum: number, totalPages: number): string {
  const left = session.centre_nom ? esc(session.centre_nom) : "";
  const center = `Généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`;
  const right = `Page ${pageNum} / ${totalPages}`;

  const colW = Math.floor(LAYOUT.pageWidth / 3);

  return `${goldAccentLine()}
  <w:tbl>
    <w:tblPr><w:tblW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:jc w:val="center"/></w:tblPr>
    <w:tblGrid><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/></w:tblGrid>
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:before="40" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="13"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${left}</w:t></w:r></w:p>
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="13"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(center)}</w:t></w:r></w:p>
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="40" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="13"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc(right)}</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
  </w:tbl>`;
}

// ══════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════

function goldAccentLine(): string {
  return `<w:tbl>
    <w:tblPr><w:tblW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:jc w:val="center"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>
    <w:tblGrid><w:gridCol w:w="${LAYOUT.pageWidth}"/></w:tblGrid>
    <w:tr><w:trPr><w:trHeight w:val="20" w:hRule="exact"/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="${LAYOUT.pageWidth}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${T3P.gold}"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>
      </w:tc>
    </w:tr>
  </w:tbl>`;
}

function spacer(twips: number): string {
  return `<w:p><w:pPr><w:spacing w:before="${twips}" w:after="0"/></w:pPr></w:p>`;
}

function cellPara(text: string, size: number, color: string, bold: boolean, jc: string, after: number): string {
  return `<w:p><w:pPr><w:jc w:val="${jc}"/><w:spacing w:after="${after}"/></w:pPr>
    <w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/><w:color w:val="${color}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
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
    ? `<w:sz w:val="15"/><w:color w:val="${status.color}"/><w:b/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`
    : `<w:sz w:val="15"/><w:color w:val="${T3P.warmGray500}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`;
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
