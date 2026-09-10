import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

/**
 * L'identité du centre (nom, SIRET, adresse, NDA) passait par un CACHE DE
 * MODULE alimenté par la seule queryFn de ["document-templates"]. Trois défauts
 * mesurés au banc :
 *
 *  1. cache froid → `replaceVariables` rendait un document SANS SIRET ni nom de
 *     centre, et ce document partait par email ou en PDF ;
 *  2. l'aperçu des réglages (DocumentTemplatePreviewDialog) ne montait pas la
 *     requête des modèles : il affichait nom, SIRET et adresse VIDES ;
 *  3. rien n'invalidait ["document-templates"] à l'enregistrement du centre :
 *     saisir le NDA du 2ᵉ centre puis générer dans les 5 minutes masquait
 *     encore la mention — R2 prise en défaut.
 *
 * Le correctif rend l'identité EXPLICITE : `replaceVariables` la reçoit en
 * paramètre depuis ses appelants ; le repli de module subsiste mais est
 * rafraîchi depuis la requête ['centre-formation'], la seule qu'invalide
 * l'enregistrement du centre.
 */

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

vi.mock("sonner", () => ({
  toast: {
    success: () => {},
    error: () => {},
    info: () => {},
    warning: () => {},
  },
}));

const centreEtat = vi.hoisted(() => ({
  centre: null as Record<string, string> | null,
}));

vi.mock("@/hooks/useCentreFormation", () => ({
  useCentreFormation: () => ({
    centreFormation: centreEtat.centre,
    isLoading: false,
    error: null,
    save: () => {},
    isSaving: false,
  }),
}));

import {
  replaceVariables,
  resetCentreVariables,
  setCentreVariables,
  type CentreIdentite,
  type DocumentTemplate,
} from "../useDocumentTemplates";
import { DocumentTemplatePreviewDialog } from "@/components/settings/DocumentTemplatePreviewDialog";

// Radix ScrollArea observe sa taille ; jsdom n'a pas ResizeObserver.
type GlobalAvecRO = typeof globalThis & { ResizeObserver?: unknown };
const global_ = globalThis as GlobalAvecRO;
if (!global_.ResizeObserver) {
  global_.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const CENTRE_SANS_NDA: CentreIdentite = {
  nom_legal: "ECOLE T3P MONTROUGE SARL",
  nom_commercial: "ECOLE T3P",
  siret: "12345678901234",
  nda: "",
  adresse_complete: "3 rue Corneille, 92120 Montrouge",
  email: "montrouge@ecolet3p.fr",
  telephone: "01 88 75 05 55",
};

const CENTRE_AVEC_NDA: CentreIdentite = { ...CENTRE_SANS_NDA, nda: "11755030075" };

/** Le gabarit exact du banc décrit dans la commande. */
const GABARIT_BANC = "<p>SIRET : {{centre_siret}} — NDA : {{centre_nda}}</p>";

beforeEach(() => {
  resetCentreVariables();
  centreEtat.centre = null;
});

describe("replaceVariables — cache vide, identité passée en paramètre", () => {
  it("reproduit le défaut : sans centre et cache froid, le SIRET manque", () => {
    // Mesure d'origine : '<p>SIRET : </p>' — un document contractuel sans
    // mention légale obligatoire.
    expect(replaceVariables(GABARIT_BANC, {})).toBe("<p>SIRET : </p>");
  });

  it("cache vide : le document porte le SIRET quand le centre est fourni", () => {
    const html = replaceVariables(GABARIT_BANC, {}, undefined, undefined, CENTRE_SANS_NDA);

    expect(html).toBe("<p>SIRET : 12345678901234</p>");
    expect(html).toContain("12345678901234");
    // R1 : aucune trace de la mention, le centre n'a pas de NDA.
    expect(html).not.toMatch(/NDA/i);
    expect(html).not.toContain("{{");
  });

  it("cache vide : le document porte aussi le NOM et l'ADRESSE du centre", () => {
    const html = replaceVariables(
      "<p>{{centre_nom}} — {{centre_adresse}} — SIRET : {{centre_siret}}</p>",
      {},
      undefined,
      undefined,
      CENTRE_SANS_NDA
    );

    expect(html).toContain("ECOLE T3P");
    expect(html).toContain("3 rue Corneille, 92120 Montrouge");
    expect(html).toContain("12345678901234");
    expect(html).not.toContain("{{");
  });

  it("R2 : NDA renseigné (2ᵉ centre) → la mention est rendue telle quelle", () => {
    const html = replaceVariables(GABARIT_BANC, {}, undefined, undefined, CENTRE_AVEC_NDA);

    expect(html).toBe("<p>SIRET : 12345678901234 — NDA : 11755030075</p>");
  });

  it("le centre explicite prime sur un repli périmé (R2 après saisie du NDA)", () => {
    // Repli périmé : le centre n'avait pas encore de NDA au chargement.
    setCentreVariables(CENTRE_SANS_NDA);

    // Le directeur saisit le NDA ; l'écran de génération, lui, lit la requête
    // ['centre-formation'] fraîche et la passe explicitement.
    const html = replaceVariables(GABARIT_BANC, {}, undefined, undefined, CENTRE_AVEC_NDA);

    expect(html).toContain("NDA : 11755030075");
  });

  it("le repli lui-même est rafraîchi par setCentreVariables", () => {
    setCentreVariables(CENTRE_SANS_NDA);
    expect(replaceVariables(GABARIT_BANC, {})).toBe("<p>SIRET : 12345678901234</p>");

    // C'est ce que fait useDocumentTemplates quand ['centre-formation'] change.
    setCentreVariables(CENTRE_AVEC_NDA);
    expect(replaceVariables(GABARIT_BANC, {})).toContain("NDA : 11755030075");
  });

  it("R3 : aucune valeur inventée ni marqueur entre crochets sans centre", () => {
    const html = replaceVariables(GABARIT_BANC, {}, undefined, undefined, null);

    expect(html).not.toMatch(/\[[^\]]*(NDA|SIRET)[^\]]*\]/i);
    expect(html).not.toContain("{{");
  });
});

describe("DocumentTemplatePreviewDialog — aperçu des réglages", () => {
  function gabarit(contenu: string): DocumentTemplate {
    return {
      id: "tpl-1",
      nom: "Attestation de formation",
      type_document: "attestation",
      categorie: "formation",
      contenu,
      variables: null,
      actif: true,
      description: null,
      created_at: "2026-09-11T00:00:00Z",
      updated_at: "2026-09-11T00:00:00Z",
    };
  }

  const CONTENU =
    "Organisme : {{centre_nom}}\nSIRET : {{centre_siret}}\nAdresse : {{centre_adresse}}\nNDA : {{centre_nda}}\nStagiaire : {{prenom}} {{nom}}";

  it("affiche le nom, le SIRET et l'adresse réels du centre", () => {
    centreEtat.centre = CENTRE_SANS_NDA as unknown as Record<string, string>;

    render(
      <DocumentTemplatePreviewDialog
        open
        onOpenChange={() => {}}
        template={gabarit(CONTENU)}
      />
    );

    const texte = document.body.textContent || "";

    expect(texte).toContain("ECOLE T3P");
    expect(texte).toContain("12345678901234");
    expect(texte).toContain("3 rue Corneille, 92120 Montrouge");
    // Les données d'exemple du contact restent affichées.
    expect(texte).toContain("Jean");
    // R1 : le centre n'a pas de NDA → aucune trace de la mention.
    expect(texte).not.toMatch(/NDA/i);
    // R3 : ni jeton littéral, ni marqueur inventé.
    expect(texte).not.toContain("{{");
    expect(texte).not.toMatch(/\[[^\]]*(NDA|SIRET)[^\]]*\]/i);
  });

  it("R2 : affiche la mention quand le centre a un NDA", () => {
    centreEtat.centre = CENTRE_AVEC_NDA as unknown as Record<string, string>;

    render(
      <DocumentTemplatePreviewDialog
        open
        onOpenChange={() => {}}
        template={gabarit(CONTENU)}
      />
    );

    const texte = document.body.textContent || "";

    expect(texte).toContain("NDA : 11755030075");
    expect(texte).toContain("12345678901234");
  });
});
