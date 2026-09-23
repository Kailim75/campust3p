import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { ORGANISME } from "@/constants/formations";

/**
 * Décision du directeur (23/09/2026) : le centre n'est PAS certifié Qualiopi.
 *
 * Quatre flyers l'annonçaient pourtant — « Qualiopi · Certifié » en tuile et
 * « Certification Qualiopi » en pied de page. Revendiquer une certification
 * qu'on ne détient pas expose le centre en cas de contrôle, et sur un support
 * imprimé l'erreur se diffuse sans retour possible.
 *
 * Même logique que le NDA (cf. nda-mention.test.ts) : l'absence se garde par
 * un test, parce qu'une reprise de contenu la défera sans savoir qu'elle
 * existait.
 *
 * Ce test ne touche PAS au module Qualiopi du logiciel (indicateurs, audits,
 * preuves) ni aux mentions conditionnées à `company.qualiopi_numero` : un
 * autre centre utilisateur du CRM peut, lui, être certifié.
 */

const racine = process.cwd();
const lire = (chemin: string) => readFileSync(join(racine, chemin), "utf-8");

const FLYERS = [
  "src/components/marketing/FlyerVTC.tsx",
  "src/components/marketing/FlyerTaxi.tsx",
  "src/components/marketing/FlyerVMDTR.tsx",
  "src/components/marketing/FlyerFormationContinue.tsx",
];

describe("mention Qualiopi — le centre n'est pas certifié", () => {
  it("ORGANISME ne porte aucun numéro Qualiopi", () => {
    expect(ORGANISME.qualiopi).toBe("");
  });

  it.each(FLYERS)("%s ne revendique aucune certification Qualiopi", (chemin) => {
    expect(lire(chemin)).not.toMatch(/qualiopi/i);
  });

  it("les flyers affichent l'agrément préfectoral à la place, sans valeur en dur", () => {
    for (const chemin of FLYERS.slice(0, 3)) {
      const source = lire(chemin);
      expect(source).toMatch(/Agréé préfecture/);
      // l'agrément vient de la constante, jamais recopié à la main
      expect(source).toMatch(/ORGANISME\.agreement(VTCTAXI|VMDTR)/);
      expect(source).not.toMatch(/23\/00\d/);
    }
  });

  it("le portail de vérification des certificats ne se dit plus conforme Qualiopi", () => {
    expect(lire("src/pages/VerifyCertificate.tsx")).not.toMatch(/qualiopi/i);
  });
});

describe("mention Qualiopi — les documents générés restent conditionnels", () => {
  const GENERATEURS = [
    "src/lib/documents/generateContratFormation.ts",
    "src/lib/documents/generateConventionFormation.ts",
    "src/lib/pdf-generator.ts",
    "supabase/functions/_shared/pdf-generator.ts",
  ];

  it.each(GENERATEURS)("%s n'imprime « Certifié Qualiopi » que sous condition", (chemin) => {
    const source = lire(chemin);
    const occurrences = [...source.matchAll(/Certifié Qualiopi/g)];
    for (const occ of occurrences) {
      const avant = source.slice(Math.max(0, occ.index! - 400), occ.index!);
      expect(
        avant,
        `« Certifié Qualiopi » imprimé sans garde dans ${chemin}`,
      ).toMatch(/if \(company\.qualiopi_numero\)/);
    }
  });
});
