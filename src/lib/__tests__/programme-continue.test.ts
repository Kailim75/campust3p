import { describe, it, expect } from "vitest";
import {
  getProgramme,
  getObjectifs,
  getPrerequis,
  PROGRAMME_CONTINUE_TAXI,
  PROGRAMME_CONTINUE_VTC,
  PROGRAMME_CONTINUE_VMDTR,
} from "@/constants/formations";
import {
  getIntituleComplet,
  getSanction,
  getReferencesReglementaires,
} from "@/constants/programmesPedagogiques";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { generateProgrammeStandalonePDFv2 } from "@/lib/documents/generateProgrammeFormation";

const COMPANY = {
  name: "École T3P Montrouge",
  address: "3 rue Corneille, 92120 Montrouge",
  phone: "01 88 75 05 55",
  email: "montrouge@ecolet3p.fr",
  siret: "94856480200023",
  nda: "",
  agrement_prefecture: "23/005",
};

async function pdfText(doc: { output: (t: "arraybuffer") => ArrayBuffer }): Promise<string> {
  const data = new Uint8Array(doc.output("arraybuffer"));
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const c = await page.getTextContent();
    text += c.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
  }
  return text;
}

/**
 * Intégration des programmes de formation continue T3P (arrêté du 11 août
 * 2017). Vérifie que le mode "continue" sélectionne bien le bon contenu et
 * que la structure réglementaire (14h = 4 modules de 3h30) est respectée.
 */

describe("Programmes de formation continue (14h)", () => {
  const programmes = [
    ["TAXI", PROGRAMME_CONTINUE_TAXI],
    ["VTC", PROGRAMME_CONTINUE_VTC],
    ["VMDTR", PROGRAMME_CONTINUE_VMDTR],
  ] as const;

  it("chaque programme continue fait 14h en 4 modules de 3h30", () => {
    for (const [, prog] of programmes) {
      expect(prog).toHaveLength(4);
      expect(prog.reduce((s, m) => s + m.dureeHeures, 0)).toBe(14);
      for (const m of prog) expect(m.dureeHeures).toBe(3.5);
    }
  });

  it("les modules A et C sont communs, le module B porte le métier", () => {
    expect(PROGRAMME_CONTINUE_TAXI[0].titre).toContain("A — Droit");
    expect(PROGRAMME_CONTINUE_TAXI[2].titre).toContain("C — Sécurité");
    expect(PROGRAMME_CONTINUE_TAXI[1].titre.toLowerCase()).toContain("taxi");
    expect(PROGRAMME_CONTINUE_VTC[1].titre).toContain("VTC");
    expect(PROGRAMME_CONTINUE_VMDTR[1].titre).toContain("VMDTR");
  });

  it("getProgramme(type, 'continue') renvoie le programme continue", () => {
    expect(getProgramme("TAXI", "continue")).toBe(PROGRAMME_CONTINUE_TAXI);
    expect(getProgramme("VTC", "continue")).toBe(PROGRAMME_CONTINUE_VTC);
    expect(getProgramme("VMDTR", "continue")).toBe(PROGRAMME_CONTINUE_VMDTR);
    // TAXI-75 (taxi Paris) partage le programme continue taxi
    expect(getProgramme("TAXI-75", "continue")).toBe(PROGRAMME_CONTINUE_TAXI);
  });

  it("le mode par défaut reste 'initiale' (aucune régression)", () => {
    expect(getProgramme("TAXI")).not.toBe(PROGRAMME_CONTINUE_TAXI);
    expect(getObjectifs("VTC")).not.toEqual(getObjectifs("VTC", "continue"));
    expect(getPrerequis("TAXI")).not.toEqual(getPrerequis("TAXI", "continue"));
  });

  it("la continue est sanctionnée par une attestation 5 ans, sans examen", () => {
    const sanction = getSanction("TAXI", "continue").join(" ");
    expect(sanction).toContain("5 ans");
    expect(sanction.toLowerCase()).toContain("attestation");
    expect(sanction.toLowerCase()).toContain("pas d'examen");
  });

  it("intitulé et références réglementaires adaptés à la continue", () => {
    expect(getIntituleComplet("TAXI", "continue")).toContain("Formation continue");
    expect(getReferencesReglementaires("TAXI", "continue").join(" ")).toContain("11 août 2017");
  });

  it("le PDF continue rendu porte bien le bon contenu (et pas l'agrément vide)", async () => {
    const text = await pdfText(generateProgrammeStandalonePDFv2("TAXI", COMPANY, "continue"));
    expect(text).toContain("Formation continue");
    expect(text).toContain("Droit du transport public particulier");
    expect(text).toContain("Sécurité routière");
    expect(text).toMatch(/attestation/i);
    // NDA vide ne doit pas apparaître ; l'agrément préfectoral, oui
    expect(text).not.toContain("NDA:");
    expect(text).toContain("23/005");
  });
});

describe("Initiale — examen blanc et module pratique (tous métiers)", () => {
  it("chaque programme initial contient un examen blanc (3h) et un module pratique", () => {
    for (const type of ["VTC", "TAXI", "TAXI-75", "VMDTR"] as const) {
      const prog = getProgramme(type); // mode initiale par défaut
      const blanc = prog.find((m) => /examen blanc/i.test(m.titre));
      const pratique = prog.find((m) => /pratique/i.test(m.titre));
      expect(blanc, `${type} : examen blanc manquant`).toBeTruthy();
      expect(blanc!.dureeHeures, `${type} : examen blanc doit faire 3h`).toBe(3);
      expect(pratique, `${type} : module pratique manquant`).toBeTruthy();
    }
  });

  it("le PDF initiale rendu affiche l'examen blanc et la présentation aux deux examens", async () => {
    const text = await pdfText(generateProgrammeStandalonePDFv2("VTC", COMPANY, "initiale"));
    expect(text.toLowerCase()).toContain("examen blanc");
    expect(text.toLowerCase()).toContain("épreuve pratique");
    expect(text.toLowerCase()).toContain("préfecture");
  });
});
