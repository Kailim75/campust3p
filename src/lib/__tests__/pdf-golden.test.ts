import { describe, it, expect } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { generateConvocationPDF as frontConvocation } from "@/lib/pdf-generator";
// Générateur des edge functions (Deno) — chargé via l'alias vitest
// "npm:jspdf@2.5.2" → "jspdf" (voir vitest.config.ts).
import { generateConvocationPDF as edgeConvocation } from "../../../supabase/functions/_shared/pdf-generator";

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

async function extractPdfText(doc: { output: (type: "arraybuffer") => ArrayBuffer }): Promise<string> {
  const data = new Uint8Array(doc.output("arraybuffer"));
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
  }
  return text;
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
