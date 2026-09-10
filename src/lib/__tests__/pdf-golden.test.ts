import { describe, it, expect } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  generateConvocationPDF as frontConvocation,
  generateAttestationPDF as frontAttestation,
  generateAttestationPresencePDF as frontAttestationPresence,
  generateConventionPDF as frontConvention,
  generateContratFormationPDF as frontContrat,
  generateFacturePDF as frontFacture,
  generateProgrammePDF as frontProgramme,
  type FactureInfo,
} from "@/lib/pdf-generator";
import { generateQualiopiAuditPDF } from "@/lib/qualiopi-audit-pdf-generator";
// Générateurs V2 : ce sont EUX que branche useDocumentGenerator pour les
// boutons « Convention » et « Contrat de formation » (et non les générateurs
// homonymes de pdf-generator.ts).
import { generateContratFormationV2 } from "@/lib/documents/generateContratFormation";
import { generateConventionFormationV2 } from "@/lib/documents/generateConventionFormation";
import { centreToCompanyInfo, hasNda, hasSiret } from "@/lib/centre-to-company";
// Générateur « convention » historique : il produit TROIS sorties réelles que
// personne ne testait — la convention legacy (identité portée par la constante
// ORGANISME), le règlement intérieur et les CGV, ces deux dernières étant
// envoyées en pièce jointe par SendDocumentsToContactDialog.
import {
  generateConventionPDF as legacyConvention,
  generateReglementInterieurPDF as frontReglement,
  generateCGVPDF as frontCGV,
  type ConventionCompanyInfo,
} from "@/lib/convention-pdf-generator";
// Feuille d'émargement DOCX (téléchargée depuis EmargementSheet).
import { generateEmargementDocx } from "@/lib/emargement-docx-generator";
import { ORGANISME, type Beneficiaire, type Formation } from "@/constants/formations";
import JSZip from "jszip";
// Générateur des edge functions (Deno) — chargé via l'alias vitest
// "npm:jspdf@2.5.2" → "jspdf" (voir vitest.config.ts).
import {
  generateConvocationPDF as edgeConvocation,
  generateAttestationPDF as edgeAttestation,
  generateProgrammePDF as edgeProgramme,
  generateContratFormationPDF as edgeContrat,
  generateReglementInterieurPDF as edgeReglement,
} from "../../../supabase/functions/_shared/pdf-generator";

/**
 * Tests « golden » du chantier §5.2 (AMELIORATIONS.md).
 *
 * Le projet a DEUX générateurs de PDF : src/lib/pdf-generator.ts (front,
 * envois manuels) et supabase/functions/_shared/pdf-generator.ts (edge,
 * convocations automatiques J-7). Toute évolution faite d'un seul côté
 * produit des documents divergents selon le canal d'envoi.
 *
 * Ces tests génèrent la MÊME convocation via les deux implémentations et
 * vérifient, sur le texte réellement rendu dans le PDF, que les champs
 * critiques (candidat, session, identité légale du centre) sont présents
 * des deux côtés. Si un de ces tests casse : reporter la modification dans
 * l'autre générateur, ne pas affaiblir le test.
 */

const CONTACT = {
  civilite: "M.",
  nom: "GOLDEN",
  prenom: "Testeur",
  email: "golden@test.fr",
  telephone: "06 01 02 03 04",
  rue: "1 rue de la Paix",
  code_postal: "92120",
  ville: "Montrouge",
};

const SESSION = {
  nom: "Formation VTC Initiale — Golden",
  formation_type: "VTC",
  date_debut: "2026-09-07",
  date_fin: "2026-09-25",
  lieu: "3 rue Corneille, Montrouge",
  duree_heures: 140,
  heure_debut: "09:00",
  heure_fin: "17:00",
};

const COMPANY = {
  name: "Centre Golden Test",
  address: "3 rue Corneille, 92120 Montrouge",
  phone: "01 40 00 00 00",
  email: "contact@golden-test.fr",
  siret: "12345678900012",
  nda: "11922334455",
  qualiopi_numero: "QUA-2026-777",
};

/** Champs dont la présence est exigée dans les deux générateurs. */
const CRITICAL_VALUES = [
  CONTACT.nom,
  CONTACT.prenom,
  SESSION.nom,
  COMPANY.name,
  COMPANY.siret,
  COMPANY.nda,
];

async function extractPdfTextFromData(data: Uint8Array): Promise<string> {
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
  }
  return text;
}

async function extractPdfText(doc: { output: (type: "arraybuffer") => ArrayBuffer }): Promise<string> {
  return extractPdfTextFromData(new Uint8Array(doc.output("arraybuffer")));
}

/** Certains générateurs (rapport Qualiopi) renvoient un Blob et non un jsPDF. */
async function extractPdfTextFromBlob(blob: Blob): Promise<string> {
  const buffer =
    typeof blob.arrayBuffer === "function"
      ? await blob.arrayBuffer()
      : await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(blob);
        });
  return extractPdfTextFromData(new Uint8Array(buffer));
}

describe("Convocation — golden test croisé front/edge (§5.2)", () => {
  it("le générateur FRONT rend tous les champs critiques", async () => {
    const doc = frontConvocation(CONTACT, SESSION, COMPANY);
    const text = await extractPdfText(doc);
    for (const value of CRITICAL_VALUES) {
      expect(text, `champ manquant côté front : "${value}"`).toContain(value);
    }
  });

  it("le générateur EDGE rend tous les champs critiques", async () => {
    const doc = edgeConvocation(CONTACT, SESSION, COMPANY);
    const text = await extractPdfText(doc);
    for (const value of CRITICAL_VALUES) {
      expect(text, `champ manquant côté edge : "${value}"`).toContain(value);
    }
  });

  it("les deux générateurs portent la même identité légale et le même millésime", async () => {
    const frontText = await extractPdfText(frontConvocation(CONTACT, SESSION, COMPANY));
    const edgeText = await extractPdfText(edgeConvocation(CONTACT, SESSION, COMPANY));

    // Identité légale : ce que la CMA/le candidat doit retrouver à l'identique
    // quel que soit le canal (manuel ou automatique).
    for (const value of [COMPANY.name, COMPANY.siret, COMPANY.nda, CONTACT.nom, SESSION.nom]) {
      const inFront = frontText.includes(value);
      const inEdge = edgeText.includes(value);
      expect(inFront, `"${value}" présent côté edge mais pas côté front`).toBe(inEdge);
      expect(inFront && inEdge, `"${value}" absent d'un des deux générateurs`).toBe(true);
    }

    // Les formats de date peuvent différer ; au minimum l'année de la session
    // doit apparaître des deux côtés.
    expect(frontText).toContain("2026");
    expect(edgeText).toContain("2026");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NDA ABSENT — aucune mention de déclaration d'activité sur les documents
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Décision du directeur (10/09/2026) : le centre n'a PAS de numéro de
 * déclaration d'activité, et ne veut donc aucune mention de NDA sur les
 * documents officiels. La règle est binaire :
 *
 *  - NDA absent   → aucune trace : ni libellé, ni ligne vide, ni séparateur
 *                   orphelin, ni phrase amputée ;
 *  - NDA présent  → comportement strictement identique à avant (un 2ᵉ centre
 *                   est prévu, et lui aura un numéro).
 *
 * Les tests ci-dessous lisent le TEXTE RÉELLEMENT RENDU dans le PDF : une
 * garde oubliée dans un seul document est donc détectée, y compris quand la
 * phrase reste « visuellement » plausible dans le code.
 */

const COMPANY_SANS_NDA = { ...COMPANY, nda: "" };
type Company = typeof COMPANY;

const FACTURE: FactureInfo = {
  numero_facture: "F-2026-0042",
  montant_total: 1500,
  total_paye: 0,
  statut: "envoyee",
  type_financement: "personnel",
};

function auditQualiopi(company: Company) {
  return {
    centre: {
      nom_commercial: company.name,
      nom_legal: company.name,
      siret: company.siret,
      nda: company.nda,
      adresse_complete: company.address,
    },
    indicateurs: [
      { id: "i1", numero: "1", critere: 1, titre: "Information du public", description: null },
    ],
    preuves: [],
    actions: [],
    globalScore: 75,
    criteriaScores: [{ critere: 1, score: 75, label: "Information du public" }],
  };
}

/**
 * Mapping Company → ConventionCompanyInfo : la MÊME projection que celle faite
 * par SendDocumentsToContactDialog avant d'appeler le règlement et les CGV.
 */
function conventionCompany(c: Company): ConventionCompanyInfo {
  return {
    name: c.name,
    address: c.address,
    phone: c.phone,
    email: c.email,
    siret: c.siret,
    nda: c.nda,
    qualiopi_numero: c.qualiopi_numero,
  };
}

/** Une seule journée (lundi 07/09/2026) : le DOCX tient en une page. */
const EMARGEMENTS = [
  {
    id: "em-1",
    contact_id: "ct-1",
    date_emargement: "2026-09-07",
    periode: "matin" as const,
    present: true,
    signature_url: null,
    date_signature: null,
    contact: { id: "ct-1", nom: CONTACT.nom, prenom: CONTACT.prenom },
  },
];

function emargementSession(c: Company) {
  return {
    nom: SESSION.nom,
    date_debut: "2026-09-07",
    date_fin: "2026-09-07",
    lieu: SESSION.lieu,
    formation_type: SESSION.formation_type,
    centre_nom: c.name,
    centre_adresse: c.address,
    centre_nda: c.nda,
    centre_siret: c.siret,
    centre_telephone: c.phone,
    centre_email: c.email,
    centre_qualiopi: c.qualiopi_numero,
  };
}

/**
 * Texte RÉELLEMENT lisible d'un DOCX : on décompresse le zip et on lit les
 * runs <w:t> de word/document.xml. Chercher dans le XML brut ne prouverait
 * rien — le balisage (couleurs, largeurs de colonnes) ressemble à du texte, et
 * une mention masquée y resterait invisible au test comme au lecteur.
 */
async function extractDocxText(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(blob);
  const entry = zip.file("word/document.xml");
  if (!entry) throw new Error("DOCX invalide : word/document.xml est absent");
  const xml = await entry.async("string");

  return [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
    .map((m) => m[1])
    .join(" ")
    // Les entités XML doivent être défaites, sinon « d'activité » resterait
    // écrit « d&apos;activité » et échapperait aux motifs interdits.
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Tous les documents produits par les DEUX générateurs, rendus en texte.
 * Toute nouvelle sortie PDF doit être ajoutée ici.
 */
const DOCUMENTS: { nom: string; render: (company: Company) => Promise<string> }[] = [
  // ── Front (envois manuels) ────────────────────────────────────────────
  { nom: "facture (front)", render: (c) => extractPdfText(frontFacture(FACTURE, CONTACT, SESSION, c)) },
  {
    nom: "attestation de fin de formation (front)",
    render: async (c) => extractPdfText(await frontAttestation(CONTACT, SESSION, c)),
  },
  {
    nom: "attestation de présence (front)",
    render: (c) => extractPdfText(frontAttestationPresence(CONTACT, SESSION, c)),
  },
  { nom: "convention (front)", render: (c) => extractPdfText(frontConvention(CONTACT, SESSION, c)) },
  { nom: "contrat de formation (front)", render: (c) => extractPdfText(frontContrat(CONTACT, SESSION, c)) },
  // V2 : générateurs réellement appelés par les boutons de l'application.
  {
    nom: "convention V2 (front, useDocumentGenerator)",
    render: (c) => extractPdfText(generateConventionFormationV2(CONTACT, SESSION, c)),
  },
  {
    nom: "contrat de formation V2 (front, useDocumentGenerator)",
    render: (c) => extractPdfText(generateContratFormationV2(CONTACT, SESSION, c)),
  },
  { nom: "convocation (front)", render: (c) => extractPdfText(frontConvocation(CONTACT, SESSION, c)) },
  { nom: "programme (front)", render: (c) => extractPdfText(frontProgramme(SESSION, c)) },
  {
    nom: "rapport d'audit Qualiopi (front)",
    render: (c) => extractPdfTextFromBlob(generateQualiopiAuditPDF(auditQualiopi(c))),
  },

  // ── Edge (envois automatiques) ────────────────────────────────────────
  { nom: "convocation (edge)", render: (c) => extractPdfText(edgeConvocation(CONTACT, SESSION, c)) },
  { nom: "attestation (edge)", render: (c) => extractPdfText(edgeAttestation(CONTACT, SESSION, c)) },
  { nom: "programme (edge)", render: (c) => extractPdfText(edgeProgramme(SESSION, c)) },
  { nom: "contrat de formation (edge)", render: (c) => extractPdfText(edgeContrat(CONTACT, SESSION, c)) },
  { nom: "règlement intérieur (edge)", render: (c) => extractPdfText(edgeReglement(c)) },

  // ── Pièces jointes du générateur « convention » (SendDocumentsToContactDialog) ──
  {
    nom: "règlement intérieur (front, pièce jointe)",
    render: (c) => extractPdfText(frontReglement(conventionCompany(c))),
  },
  {
    nom: "CGV (front, pièce jointe)",
    render: (c) => extractPdfText(frontCGV(conventionCompany(c))),
  },

  // ── DOCX (feuille d'émargement téléchargée depuis EmargementSheet) ──
  {
    nom: "feuille d'émargement (DOCX)",
    render: async (c) =>
      extractDocxText(await generateEmargementDocx(EMARGEMENTS, emargementSession(c))),
  },
];

/**
 * Formulations à proscrire quand le NDA est absent.
 *
 * Les motifs sont des regex plutôt que des `includes` bruts pour deux raisons
 * de FIABILITÉ (elles ne relâchent pas l'exigence) :
 *  - « NDA » est cherché comme sigle isolé (\b) : un `includes("NDA")` lèverait
 *    une fausse alerte sur les mots qui contiennent ces trois lettres
 *    (FONDAMENTAUX, AGENDA…) présents dans les programmes de formation ;
 *  - accents et apostrophes (droite ou typographique) sont tolérés, pour que
 *    le test ne dépende pas de la façon dont jsPDF encode la ponctuation.
 */
const MENTIONS_INTERDITES: { libelle: string; motif: RegExp }[] = [
  { libelle: "NDA", motif: /\bNDA\b/ },
  { libelle: "Déclaration d'activité", motif: /d[ée]claration\s+(d['’]\s*)?activit[ée]/i },
  { libelle: "déclaré sous le numéro", motif: /d[ée]clar[ée]\s+sous\s+le\s+num[ée]ro/i },
  { libelle: "enregistré sous le numéro", motif: /enregistr[ée]\s+sous\s+le\s+num[ée]ro/i },
  { libelle: "N° d'activité", motif: /n\s*[°ºo]\s*d['’]\s*activit[ée]/i },
  { libelle: "[NDA", motif: /\[\s*NDA/i },
  // Le DISCLAIMER du NDA, resté orphelin dans une première version du lot :
  // « (Cette déclaration ne vaut pas agrément de l'État) » ne contient pas la
  // chaîne « déclaration d'activité » et passait entre les mailles — les 68
  // tests restaient verts avec le code bogué.
  { libelle: "ne vaut pas agrément", motif: /ne\s+vaut\s+pas\s+agr[ée]ment/i },
  { libelle: "cette déclaration", motif: /cette\s+d[ée]claration/i },
  // Aucun marqueur de configuration ne doit s'imprimer (R3).
  { libelle: "[SIRET", motif: /\[\s*SIRET/i },
];

describe("NDA absent — aucune mention sur les documents officiels", () => {
  it.each(DOCUMENTS)("$nom ne porte aucune mention de déclaration d'activité", async ({ render }) => {
    const text = await render(COMPANY_SANS_NDA);

    for (const { libelle, motif } of MENTIONS_INTERDITES) {
      expect(
        motif.test(text),
        `mention « ${libelle} » encore présente alors que le NDA est vide.\n` +
          `Extrait rendu : ${text.slice(0, 400)}`,
      ).toBe(false);
    }
  });

  it.each(DOCUMENTS)("$nom affiche toujours le NDA quand il est renseigné", async ({ render }) => {
    const text = await render(COMPANY);
    expect(text, "régression : le NDA renseigné a disparu du document").toContain(COMPANY.nda);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CENTRE NON CONFIGURÉ — aucun identifiant légal fabriqué (R3)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Tant que « Paramètres > Centre » n'est pas rempli, les mappeurs fabriquent
 * des marqueurs (« [SIRET requis] »). Ce sont des repères d'écran : imprimés
 * sur une facture, une attestation ou une convocation, ils deviennent une
 * mention légale fausse.
 *
 * Le SIRET était interpolé SANS garde alors que le NDA en avait une : les
 * documents portaient « SIRET: [SIRET requis] ». Ce test le rend impossible
 * des deux côtés (front et edge).
 */
const COMPANY_NON_CONFIGURE: Company = { ...COMPANY, ...centreToCompanyInfo(null) };

const MARQUEURS_INTERDITS: { libelle: string; motif: RegExp }[] = [
  { libelle: "[SIRET", motif: /\[\s*SIRET/i },
  { libelle: "[NDA", motif: /\[\s*NDA/i },
];

/**
 * Ce tableau est SANS EXCEPTION.
 *
 * Il a porté un temps une liste d'exemption (« DOCUMENTS_A_GARDE_MANQUANTE »)
 * pour les deux documents qui imprimaient encore « SIRET : [SIRET requis] » —
 * le programme de formation et le rapport d'audit Qualiopi. Les deux gardes
 * sont désormais posées avec `hasSiret(...)` et la liste a disparu.
 *
 * Ne pas la réintroduire pour faire passer un document : ce serait rouvrir la
 * porte à un identifiant légal fabriqué sur une pièce remise à un tiers.
 */
describe("Centre non configuré — aucun identifiant légal fabriqué", () => {
  it.each(DOCUMENTS)("$nom n'imprime aucun marqueur [SIRET]/[NDA]", async ({ render }) => {
    const text = await render(COMPANY_NON_CONFIGURE);

    for (const { libelle, motif } of MARQUEURS_INTERDITS) {
      expect(
        motif.test(text),
        `marqueur « ${libelle} » imprimé alors que le centre n'est pas configuré.\n` +
          `Extrait rendu : ${text.slice(0, 400)}`,
      ).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONVENTION « LEGACY » — identité légale portée par la constante ORGANISME
// ═══════════════════════════════════════════════════════════════════════════
/**
 * `generateConventionPDF` de convention-pdf-generator ne prend AUCUN paramètre
 * `company` : son identité légale vient de la constante ORGANISME. Elle ne peut
 * donc pas rejoindre le tableau DOCUMENTS (dont le contrat est « rends-moi ce
 * document AVEC ce company »), mais elle est bien produite en vrai, par
 * `generateConventionZIP`. Sans ce bloc, elle n'était couverte par rien.
 */
const FORMATION_LEGACY: Formation = {
  type: "VTC",
  intitule: "Parcours initial",
  modalite: "journée",
  dateDebut: new Date("2026-09-07"),
  dateFin: new Date("2026-09-25"),
  dureeHeures: 140,
  horaires: { matin: "09:00 - 12:30", apresMidi: "13:30 - 17:00" },
  tarifHT: 1250,
  prerequisReglementaires: [],
  objectifsPedagogiques: [],
  programme: [],
};

const BENEFICIAIRE_LEGACY: Beneficiaire = {
  civilite: "M.",
  nom: CONTACT.nom,
  prenom: CONTACT.prenom,
  dateNaissance: new Date("1990-05-12"),
  adresse: CONTACT.rue,
  codePostal: CONTACT.code_postal,
  ville: CONTACT.ville,
  telephone: CONTACT.telephone,
  email: CONTACT.email,
};

describe("Convention legacy (constante ORGANISME)", () => {
  it("ORGANISME n'a pas de NDA — sinon tout ce bloc est à relire", () => {
    // R2 : le jour où un 2ᵉ centre renseigne ce fallback, la mention doit
    // réapparaître. Cette assertion force la relecture au lieu de laisser les
    // deux tests suivants devenir silencieusement vides de sens.
    expect(hasNda(ORGANISME.nda)).toBe(false);
    // Le SIRET, lui, est bien renseigné : le pied de page doit donc le porter.
    expect(hasSiret(ORGANISME.siret)).toBe(true);
  });

  it("ne porte aucune mention de déclaration d'activité", async () => {
    const text = await extractPdfText(legacyConvention(FORMATION_LEGACY, BENEFICIAIRE_LEGACY));

    for (const { libelle, motif } of MENTIONS_INTERDITES) {
      expect(
        motif.test(text),
        `mention « ${libelle} » imprimée sur la convention legacy.\n` +
          `Extrait rendu : ${text.slice(0, 400)}`,
      ).toBe(false);
    }
  });

  it("conserve l'identité de l'organisme et les clauses de la convention (R4)", async () => {
    const text = await extractPdfText(legacyConvention(FORMATION_LEGACY, BENEFICIAIRE_LEGACY));

    expect(text).toContain(ORGANISME.nom);
    expect(text).toContain(ORGANISME.siret);
    expect(text).toContain(BENEFICIAIRE_LEGACY.nom);
    // Le retrait de la mention ne doit avoir amputé aucune clause : sur un
    // document contractuel signé, c'est la faute que R4 interdit.
    expect(text).toMatch(/OBJET DE LA CONVENTION/i);
    expect(text).toMatch(/D[ÉE]LAI DE R[ÉE]TRACTATION/i);
    expect(text).toMatch(/R[ÈE]GLEMENT INT[ÉE]RIEUR/i);
    expect(text).toMatch(/SIGNATURES/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHAMPS PORTANT UN MARQUEUR — sorties nouvellement couvertes
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Un centre dont les champs portent un marqueur de configuration : cas produit
 * par `centreToCompanyInfo` pour le SIRET, et que la base peut contenir pour le
 * NDA (« [NDA requis] » saisi à la main dans Paramètres > Centre).
 *
 * Une garde de simple vérité (`if (company.siret)`, `if (session.centre_nda)`)
 * laisse passer ces valeurs : ce bloc l'interdit sur les trois sorties que ce
 * lot vient de couvrir, et c'est lui qui rougit si l'on revient à une telle
 * garde.
 */
const COMPANY_MARQUEURS: Company = {
  ...COMPANY,
  siret: "[SIRET non configuré]",
  nda: "[NDA requis]",
};

const SORTIES_AJOUTEES_PAR_CE_LOT = DOCUMENTS.filter((d) =>
  [
    "règlement intérieur (front, pièce jointe)",
    "CGV (front, pièce jointe)",
    "feuille d'émargement (DOCX)",
  ].includes(d.nom),
);

describe("Champs portant un marqueur — sorties ajoutées par ce lot", () => {
  it("le filtre désigne bien les trois sorties attendues", () => {
    // Garde-fou : un renommage d'entrée viderait le it.each ci-dessous, qui
    // passerait au vert sans rien vérifier.
    expect(SORTIES_AJOUTEES_PAR_CE_LOT).toHaveLength(3);
  });

  it.each(SORTIES_AJOUTEES_PAR_CE_LOT)(
    "$nom n'imprime ni marqueur ni mention",
    async ({ render }) => {
      const text = await render(COMPANY_MARQUEURS);

      for (const { libelle, motif } of [...MENTIONS_INTERDITES, ...MARQUEURS_INTERDITS]) {
        expect(
          motif.test(text),
          `« ${libelle} » imprimé à partir d'un marqueur de configuration.\n` +
            `Extrait rendu : ${text.slice(0, 400)}`,
        ).toBe(false);
      }

      // R4 : seul l'identifiant disparaît — le nom de l'organisme reste.
      expect(text, "le nom de l'organisme a disparu avec l'identifiant").toContain(COMPANY.name);
    },
  );
});

describe("hasNda — garde unique du numéro de déclaration d'activité", () => {
  it("traite comme absents les valeurs vides et les marqueurs de configuration", () => {
    expect(hasNda(null)).toBe(false);
    expect(hasNda(undefined)).toBe(false);
    expect(hasNda("")).toBe(false);
    expect(hasNda("   ")).toBe(false);
    expect(hasNda("[NDA requis]")).toBe(false);
    expect(hasNda("[NDA non configuré]")).toBe(false);
  });

  it("accepte un numéro réellement renseigné", () => {
    expect(hasNda("11922334455")).toBe(true);
    expect(hasNda("  11922334455  ")).toBe(true);
  });

  it("ne fabrique aucune valeur de repli quand le centre n'est pas configuré", () => {
    // Ni SIRET ni NDA inventés : le repli doit rester vide, pas plausible.
    expect(centreToCompanyInfo(null).nda).toBe("");
    expect(hasNda(centreToCompanyInfo(null).nda)).toBe(false);
    // Le SIRET, lui, garde son marqueur — il est OBLIGATOIRE, contrairement au
    // NDA, et le marqueur signale la configuration manquante à l'écran. Mais il
    // ne doit jamais être jugé imprimable.
    expect(hasSiret(centreToCompanyInfo(null).siret)).toBe(false);
  });

  it("hasSiret applique exactement la même règle que hasNda", () => {
    expect(hasSiret(null)).toBe(false);
    expect(hasSiret(undefined)).toBe(false);
    expect(hasSiret("")).toBe(false);
    expect(hasSiret("   ")).toBe(false);
    expect(hasSiret("[SIRET requis]")).toBe(false);
    expect(hasSiret("[SIRET non configuré]")).toBe(false);
    expect(hasSiret("12345678900012")).toBe(true);
    expect(hasSiret("  12345678900012  ")).toBe(true);
  });
});
