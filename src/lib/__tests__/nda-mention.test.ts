import { describe, it, expect, vi } from "vitest";

// Le module template-renderer importe le client Supabase (lecture du centre) :
// on le neutralise, les fonctions testées ici sont pures.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  isNdaProvided,
  renderTemplateHtml,
  stripNdaFromTemplate,
  stripNdaFromMarkdown,
} from "../template-renderer";
import { hasNda } from "../centre-to-company";
import { TEMPLATE_GENERATORS } from "../complianceEngine";
import { buildDefaultContratConduiteHtml } from "../documents/conduite/defaultContratConduiteTemplate";
import { buildContratConduiteVariables } from "../documents/conduite/contratConduiteVariables";

/**
 * Décision du directeur (10/09/2026) : le centre n'a PAS de numéro de
 * déclaration d'activité. Quand le NDA est vide, AUCUNE trace de la mention
 * ne doit subsister dans les documents générés — ni libellé, ni séparateur
 * orphelin, ni ligne vide.
 *
 * Règle prioritaire (R4) : on ne supprime JAMAIS de contenu qui ne soit pas la
 * mention elle-même. Sur un document contractuel signé, un libellé orphelin est
 * un défaut esthétique ; une clause supprimée est une faute.
 *
 * Les gabarits vivent EN BASE (seedés par migrations, éditables par
 * l'utilisateur) : la correction se fait donc au rendu, sur le gabarit, juste
 * avant la substitution `{{variable}}`.
 */

/** Substitution telle que la font tous les moteurs de rendu du projet. */
function substitute(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_m, v: string) => vars[v] ?? "");
}

const VARS_SANS_NDA: Record<string, string> = {
  centre_nom: "ECOLE T3P",
  centre_siret: "12345678901234",
  centre_nda: "",
  centre_adresse: "1 rue de Paris, 92120 Montrouge",
  responsable_nom: "Karim B.",
};

const VARS_AVEC_NDA: Record<string, string> = {
  ...VARS_SANS_NDA,
  centre_nda: "11755030075",
};

/** Texte visible, balises ôtées. */
function texteVisible(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vocabulaire de la mention : les seuls mots autorisés à disparaître. */
const MOTS_DE_LA_MENTION = new Set([
  "nda",
  "declaration",
  "déclaration",
  "activite",
  "activité",
  "numero",
  "numéro",
  "declare",
  "déclaré",
  "declaree",
  "déclarée",
  "enregistre",
  "enregistré",
  "enregistree",
  "enregistrée",
  "sous",
  "agrement",
  "agrément",
  "vaut",
  "etat",
  "état",
]);

/**
 * Mots porteurs de contenu (≥ 4 lettres) hors vocabulaire de la mention.
 * C'est la mesure de « rien de légitime n'a été perdu » : les quatre
 * destructions relevées par les relecteurs faisaient toutes disparaître des
 * mots de cette liste.
 */
function motsPorteurs(html: string): string[] {
  return texteVisible(html)
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9]+/i)
    .filter((mot) => mot.length >= 4 && !MOTS_DE_LA_MENTION.has(mot));
}

/** Aucun mot porteur de l'original ne doit manquer dans le nettoyé. */
function attendreAucunePerte(original: string, nettoye: string, contexte: string): void {
  const avant = motsPorteurs(substitute(original, VARS_SANS_NDA));
  const apres = new Set(motsPorteurs(substitute(nettoye, VARS_SANS_NDA)));
  const perdus = avant.filter((mot) => !apres.has(mot));
  expect(perdus, `${contexte} : contenu légitime perdu → ${perdus.join(", ")}`).toEqual([]);
}

describe("isNdaProvided", () => {
  it("EST le prédicat hasNda de centre-to-company (définition unique côté front)", () => {
    // Les deux divergeaient : hasNda rejetait toute valeur contenant un crochet,
    // isNdaProvided seulement celles ENTIÈREMENT entre crochets. Un centre dont
    // le champ valait « [NDA requis] (à confirmer) » voyait donc la mention
    // masquée dans les PDF et imprimée dans les gabarits.
    expect(isNdaProvided).toBe(hasNda);
  });

  it("considère vide, espaces, null et undefined comme absents", () => {
    expect(isNdaProvided("")).toBe(false);
    expect(isNdaProvided("   ")).toBe(false);
    expect(isNdaProvided(null)).toBe(false);
    expect(isNdaProvided(undefined)).toBe(false);
  });

  it("considère un marqueur entre crochets comme absent", () => {
    expect(isNdaProvided("[NDA requis]")).toBe(false);
    expect(isNdaProvided("[Non renseigné]")).toBe(false);
    expect(isNdaProvided("[NDA requis] (à confirmer)")).toBe(false);
  });

  it("accepte un vrai numéro", () => {
    expect(isNdaProvided("11755030075")).toBe(true);
    expect(isNdaProvided(" 11 75 12345 75 ")).toBe(true);
  });
});

describe("stripNdaFromTemplate — NDA absent", () => {
  it("motif 1 : ligne dédiée terminée par <br/> (contrat de formation)", () => {
    const gabarit = `<p>{{centre_nom}}<br/>
SIRET : {{centre_siret}}<br/>
N° Déclaration d'Activité : {{centre_nda}}<br/>
Adresse : {{centre_adresse}}<br/>
Représenté par : {{responsable_nom}}</p>`;

    const attendu = `<p>{{centre_nom}}<br/>
SIRET : {{centre_siret}}<br/>
Adresse : {{centre_adresse}}<br/>
Représenté par : {{responsable_nom}}</p>`;

    expect(stripNdaFromTemplate(gabarit, "")).toBe(attendu);
  });

  it("motif 1 bis : ligne dédiée en fin de paragraphe (attestation)", () => {
    const gabarit = `<p>Organisme : {{centre_nom}}<br/>
SIRET : {{centre_siret}}<br/>
NDA : {{centre_nda}}</p>`;

    const attendu = `<p>Organisme : {{centre_nom}}<br/>
SIRET : {{centre_siret}}</p>`;

    expect(stripNdaFromTemplate(gabarit, "")).toBe(attendu);
  });

  it("motif 1 ter : ligne encadrée de <br/> sans retour à la ligne (facture)", () => {
    const gabarit =
      '<p style="margin:4px 0;font-size:12px;">SIRET : {{centre_siret}}<br/>NDA : {{centre_nda}}<br/>{{centre_adresse}}</p>';
    const attendu =
      '<p style="margin:4px 0;font-size:12px;">SIRET : {{centre_siret}}<br/>{{centre_adresse}}</p>';

    expect(stripNdaFromTemplate(gabarit, "")).toBe(attendu);
  });

  it("motif 2 : segment en milieu de phrase séparé par des virgules (gabarit seedé en base)", () => {
    const gabarit =
      "<p>Le centre de formation : {{centre_nom}}, {{centre_adresse}}, NDA : {{centre_nda}}, SIRET : {{centre_siret}}</p>";
    const attendu =
      "<p>Le centre de formation : {{centre_nom}}, {{centre_adresse}}, SIRET : {{centre_siret}}</p>";

    expect(stripNdaFromTemplate(gabarit, "")).toBe(attendu);
  });

  it("motif 3 : segment en fin de phrase séparé par un tiret cadratin (programme)", () => {
    const gabarit =
      "<p><em>Organisme : {{centre_nom}} — SIRET : {{centre_siret}} — NDA : {{centre_nda}}</em></p>";
    const attendu =
      "<p><em>Organisme : {{centre_nom}} — SIRET : {{centre_siret}}</em></p>";

    expect(stripNdaFromTemplate(gabarit, "")).toBe(attendu);
  });

  it("retire le paragraphe entier quand il ne portait que le NDA et son disclaimer", () => {
    const gabarit =
      "<h1>Attestation</h1>\n<p>Déclaration d'activité N° {{centre_nda}} (ne vaut pas agrément de l'État)</p>\n<p>Suite</p>";
    const attendu = "<h1>Attestation</h1>\n<p>Suite</p>";

    expect(stripNdaFromTemplate(gabarit, "")).toBe(attendu);
  });

  it("laisse le document grammaticalement correct après substitution", () => {
    const gabarit = `<p>{{centre_nom}}<br/>
SIRET : {{centre_siret}}<br/>
N° Déclaration d'Activité : {{centre_nda}}<br/>
Adresse : {{centre_adresse}}</p>
<p><em>Organisme : {{centre_nom}} — SIRET : {{centre_siret}} — NDA : {{centre_nda}}</em></p>`;

    const html = substitute(stripNdaFromTemplate(gabarit, ""), VARS_SANS_NDA);

    expect(html).not.toMatch(/NDA/i);
    expect(html).not.toMatch(/déclaration/i);
    expect(html).not.toMatch(/—\s*</); // pas de séparateur orphelin
    expect(html).not.toMatch(/:\s*(<br\/?>|<\/)/i); // pas de libellé amputé
    expect(html).toContain("SIRET : 12345678901234");
    expect(html).toContain("1 rue de Paris, 92120 Montrouge");
  });

  it("traite un marqueur [NDA requis] comme une absence", () => {
    const gabarit =
      "<p><strong>{{centre_nom}}</strong><br/>SIRET : {{centre_siret}} — NDA : {{centre_nda}}</p>";
    expect(stripNdaFromTemplate(gabarit, "[NDA requis]")).toBe(
      "<p><strong>{{centre_nom}}</strong><br/>SIRET : {{centre_siret}}</p>"
    );
  });

  it("ne touche pas aux autres variables ni au reste du HTML", () => {
    const gabarit =
      '<table><tr><td style="border:1px solid #ccc">SIRET : {{centre_siret}} — NDA : {{centre_nda}}</td></tr></table>';
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toBe(
      '<table><tr><td style="border:1px solid #ccc">SIRET : {{centre_siret}}</td></tr></table>'
    );
    expect(resultat).toContain("{{centre_siret}}");
  });

  it("retire aussi le libellé quand il est porté par sa propre balise", () => {
    const gabarit =
      '<p>SIRET : {{centre_siret}}<br/><span class="lbl">NDA :</span> {{centre_nda}}<br/>Fin</p>';
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toBe("<p>SIRET : {{centre_siret}}<br/>Fin</p>");
    expect(resultat).not.toMatch(/NDA/i);
  });

  it("retire un libellé <strong> et sa ligne sans coller la ligne suivante", () => {
    const gabarit =
      "<p><strong>N° de déclaration d'activité :</strong> {{centre_nda}}<br/>SIRET : {{centre_siret}}</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toBe("<p>SIRET : {{centre_siret}}</p>");
    expect(resultat).not.toMatch(/déclaration/i);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// R4 — LES QUATRE DESTRUCTIONS MESURÉES PAR LES RELECTEURS
//
// Chacune reproduit une mesure brute de l'heuristique précédente. Le test ne
// vérifie PAS que la mention part joliment : il vérifie que le texte
// contractuel légitime SURVIT.
// ════════════════════════════════════════════════════════════════════════════
describe("stripNdaFromTemplate — R4 : aucun contenu légitime supprimé", () => {
  it("mesure 1 : « Organisme de formation » n'est PAS effacé par le libellé voisin", () => {
    // Mesuré : <p><strong>Organisme de formation</strong> NDA : {{centre_nda}}…
    //       → <p>SIRET : {{centre_siret}}</p>   (le <strong> disparaissait)
    const gabarit =
      "<p><strong>Organisme de formation</strong> NDA : {{centre_nda}}<br/>SIRET : {{centre_siret}}</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("<strong>Organisme de formation</strong>");
    expect(resultat).toContain("{{centre_siret}}");
    expect(resultat).not.toContain("{{centre_nda}}");
    expect(resultat).not.toMatch(/NDA :/);
    attendreAucunePerte(gabarit, resultat, "mesure 1");
  });

  it("mesure 2 : le paragraphe entier ne disparaît pas derrière une parenthèse", () => {
    // Mesuré : <p>Formation VTC (durée 140 heures, dont 105 en présentiel) NDA {{centre_nda}}</p>
    //       → chaîne VIDE
    const gabarit =
      "<p>Formation VTC (durée 140 heures, dont 105 en présentiel) NDA {{centre_nda}}</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("Formation VTC");
    expect(resultat).toContain("durée 140 heures, dont 105 en présentiel");
    expect(resultat).not.toContain("{{centre_nda}}");
    expect(resultat.length).toBeGreaterThan(0);
    attendreAucunePerte(gabarit, resultat, "mesure 2");
  });

  it("mesure 3 : le renvoi d'article et la suite de la clause survivent", () => {
    // Mesuré : <p>NDA : {{centre_nda}} (voir article 3 du présent contrat) et le
    //           stagiaire reconnaît…</p> → <p> et le stagiaire reconnaît…</p>
    const gabarit =
      "<p>NDA : {{centre_nda}} (voir article 3 du présent contrat) et le stagiaire reconnaît avoir pris connaissance du règlement intérieur.</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("(voir article 3 du présent contrat)");
    expect(resultat).toContain("le stagiaire reconnaît avoir pris connaissance");
    expect(resultat).not.toContain("{{centre_nda}}");
    attendreAucunePerte(gabarit, resultat, "mesure 3");
  });

  it("mesure 4 : une clause d'engagement n'est pas amputée de son sujet", () => {
    // Mesuré : <p>L'organisme est déclaré sous le numéro {{centre_nda}} et
    //           s'engage à respecter le règlement…</p>
    //       → <p> et s'engage à respecter le règlement…</p>
    //
    // Le segment « L'organisme est déclaré sous le numéro » n'est PAS un libellé
    // connu : on ne coupe rien, le jeton reste et la substitution le vide.
    const gabarit =
      "<p>L'organisme est déclaré sous le numéro {{centre_nda}} et s'engage à respecter le règlement intérieur.</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("L'organisme est déclaré sous le numéro");
    expect(resultat).toContain("s'engage à respecter le règlement intérieur");
    attendreAucunePerte(gabarit, resultat, "mesure 4");

    // R3 : rien d'inventé, et aucun jeton résiduel dans le document rendu.
    const html = renderTemplateHtml(gabarit, VARS_SANS_NDA);
    expect(html).toContain("s'engage à respecter le règlement");
    expect(html).not.toContain("{{centre_nda}}");
    expect(html).not.toMatch(/\[[^\]]*NDA[^\]]*\]/i);
  });

  it("ne coupe pas la fin de phrase quand elle suit le jeton sans ponctuation", () => {
    const gabarit = "<p>NDA {{centre_nda}} et le centre est certifié Qualiopi</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("et le centre est certifié Qualiopi");
    expect(resultat).not.toMatch(/NDA/i);
    expect(resultat).not.toContain("{{centre_nda}}");
  });

  it("conserve le texte qui suit une mention ponctuée", () => {
    const resultat = stripNdaFromTemplate(
      "<p>Déclaration d'activité : {{centre_nda}} : mention légale</p>",
      ""
    );
    expect(resultat).toContain("mention légale");
    expect(resultat).not.toMatch(/déclaration/i);
  });

  it("ne détruit pas la balise quand le jeton vit dans un attribut", () => {
    const gabarit = '<div data-nda="{{centre_nda}}" class="org">Organisme {{centre_nom}}</div>';
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("<div");
    expect(resultat).toContain('class="org"');
    expect(resultat).toContain("Organisme");
    expect(renderTemplateHtml(gabarit, VARS_SANS_NDA)).toContain("Organisme ECOLE T3P");
  });

  it("ne perd pas le texte qui suit une balise portant le jeton en attribut", () => {
    const gabarit =
      '<span title="NDA : {{centre_nda}}">Organisme</span> et la suite du texte';
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("Organisme");
    expect(resultat).toContain("et la suite du texte");
  });

  it("ne dévore pas un titre de section adjacent", () => {
    const gabarit =
      "<h2>Article 4 — Conditions de résiliation</h2>\n<p>NDA : {{centre_nda}}</p>\n<h2>Article 5 — Rétractation</h2>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("Article 4 — Conditions de résiliation");
    expect(resultat).toContain("Article 5 — Rétractation");
    attendreAucunePerte(gabarit, resultat, "titres adjacents");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CONSTAT BLOQUANT 1 — le libellé VERBAL emportait le SUJET de la clause
//
// La grammaire mêlait les libellés NOMINAUX (« NDA : ») aux formulations
// VERBALES qui englobent le sujet de la phrase (« l'organisme de formation est
// déclaré sous le numéro »). Comme la coupe couvre le segment ENTIER, elle
// partait du début de la clause : trois phrases contractuelles en sortaient
// décapitées. Un libellé verbal ne part donc plus que s'il TERMINE son segment.
// ════════════════════════════════════════════════════════════════════════════
describe("classe B — un libellé verbal ne part que s'il TERMINE son segment", () => {
  it("mesure 1 : la clause d'engagement garde son sujet", () => {
    // Mesuré : → « et s'engage à respecter le règlement intérieur. »
    const gabarit =
      "<p>L'organisme de formation est déclaré sous le numéro {{centre_nda}} et s'engage à respecter le règlement intérieur.</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("L'organisme de formation est déclaré sous le numéro");
    expect(resultat).toContain("s'engage à respecter le règlement intérieur.");
    attendreAucunePerte(gabarit, resultat, "classe B — clause d'engagement");

    // Le JETON, lui, reste dans le GABARIT : c'est la substitution qui le vide.
    // Le couper avec son libellé aurait décapité la clause. Rien n'en subsiste
    // dans le document rendu — et R3 : aucun marqueur inventé.
    const html = renderTemplateHtml(gabarit, VARS_SANS_NDA);
    expect(html).toContain("s'engage à respecter le règlement intérieur.");
    expect(html).not.toContain("{{centre_nda}}");
    expect(html).not.toMatch(/\[[^\]]*NDA[^\]]*\]/i);
  });

  it("mesure 2 : le préfet de région et son enregistrement survivent", () => {
    // Mesuré : → « auprès du préfet de région d'Île-de-France. Cet
    // enregistrement ne vaut pas agrément. » — phrase sans sujet.
    const gabarit =
      "<p>Déclaration d'activité enregistrée sous le n° {{centre_nda}} auprès du préfet de région d'Île-de-France. Cet enregistrement ne vaut pas agrément.</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("auprès du préfet de région d'Île-de-France.");
    expect(resultat).toContain("Cet enregistrement ne vaut pas agrément.");
    // La phrase n'est plus décapitée : elle ne commence pas par « auprès ».
    expect(substitute(resultat, VARS_SANS_NDA)).not.toMatch(/<p>\s*auprès/i);
    attendreAucunePerte(gabarit, resultat, "classe B — préfet de région");
  });

  it("mesure 3 : le SIRET et la TVA qui suivent le jeton survivent", () => {
    // Mesuré : → « SIRET 12345678901234, TVA non applicable. »
    const gabarit =
      "<p>Organisme de formation enregistré sous le n° {{centre_nda}}, SIRET {{centre_siret}}, TVA non applicable.</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("Organisme de formation");
    expect(resultat).toContain("{{centre_siret}}");
    expect(substitute(resultat, VARS_SANS_NDA)).toContain(
      "SIRET 12345678901234, TVA non applicable."
    );
    attendreAucunePerte(gabarit, resultat, "classe B — SIRET et TVA");
  });

  it("mais part ENTIÈREMENT quand le jeton termine le segment", () => {
    const gabarit =
      "<p>{{centre_nom}}<br/>Organisme de formation enregistré sous le n° {{centre_nda}}<br/>SIRET : {{centre_siret}}</p>";

    expect(stripNdaFromTemplate(gabarit, "")).toBe(
      "<p>{{centre_nom}}<br/>SIRET : {{centre_siret}}</p>"
    );
  });

  it("part aussi quand seule une ponctuation finale suit le jeton", () => {
    const gabarit =
      "<p>Formation VTC.</p>\n<p>Déclaration d'activité enregistrée sous le n° {{centre_nda}}.</p>\n<p>Suite</p>";

    expect(stripNdaFromTemplate(gabarit, "")).toBe("<p>Formation VTC.</p>\n<p>Suite</p>");
  });

  it("classe A : une mention en MILIEU de phrase part, la phrase reste", () => {
    const gabarit =
      "<p>Le centre, NDA : {{centre_nda}}, forme des chauffeurs de taxi depuis 2015.</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("Le centre");
    expect(resultat).toContain("forme des chauffeurs de taxi depuis 2015.");
    expect(resultat).not.toMatch(/NDA/i);
    expect(resultat).not.toContain("{{centre_nda}}");
    attendreAucunePerte(gabarit, resultat, "classe A en milieu de phrase");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CONSTAT BLOQUANT 2 — la coupe tombait À L'INTÉRIEUR d'une entité HTML
//
// « ; » bornait le fragment : sur « NDA&nbsp;: {{centre_nda}} » la borne tombait
// dans l'entité, le segment se réduisait à « : » — accepté comme libellé — et le
// rendu donnait « NDA&nbsp », mot NDA imprimé et entité cassée.
// ════════════════════════════════════════════════════════════════════════════
describe("entités HTML — atomes indivisibles", () => {
  /** Une entité tronquée laisse un « & » que rien ne referme. */
  function attendreAucuneEntiteCassee(html: string): void {
    expect(html, "entité HTML tronquée").not.toMatch(/&(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-f]+;)/i);
  }

  it("mesure : la coupe ne scinde plus &nbsp;", () => {
    // Mesuré : <p>NDA&nbsp<br/>SIRET&nbsp;: 12345678901234</p>
    // Rendu navigateur : « NDA  SIRET : 12345678901234 ».
    const gabarit = "<p>NDA&nbsp;: {{centre_nda}}<br/>SIRET&nbsp;: {{centre_siret}}</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toBe("<p>SIRET&nbsp;: {{centre_siret}}</p>");
    expect(resultat).not.toMatch(/NDA/i);
    attendreAucuneEntiteCassee(substitute(resultat, VARS_SANS_NDA));
  });

  it("ne casse ni &amp; ni &eacute; ni &#160; (entité en fin de libellé)", () => {
    const gabarit =
      "<p>Formation Taxi &amp; VTC<br/>D&eacute;claration d'activit&eacute;&#160;: {{centre_nda}}<br/>SIRET : {{centre_siret}}</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toBe("<p>Formation Taxi &amp; VTC<br/>SIRET : {{centre_siret}}</p>");
    expect(resultat).toContain("Formation Taxi &amp; VTC");
    expect(resultat).not.toMatch(/claration/i);
    attendreAucuneEntiteCassee(substitute(resultat, VARS_SANS_NDA));
  });

  it("traite l'entité d'espace comme un blanc sans jamais la couper en deux", () => {
    const gabarit = "<p>SIRET : {{centre_siret}} — NDA&#160;:&nbsp;{{centre_nda}}</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toBe("<p>SIRET : {{centre_siret}}</p>");
    attendreAucuneEntiteCassee(substitute(resultat, VARS_SANS_NDA));
  });

  it("ne touche pas à une entité portée par du contenu légitime", () => {
    // Le segment n'est pas un libellé : le jeton seul part, le reste est intact.
    const gabarit = "<p>Formation Taxi&nbsp;&amp;&nbsp;VTC — {{centre_nda}}</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("Formation Taxi&nbsp;&amp;&nbsp;VTC");
    attendreAucuneEntiteCassee(substitute(resultat, VARS_SANS_NDA));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TRACE RÉSIDUELLE — le disclaimer réglementaire hors parenthèses
// ════════════════════════════════════════════════════════════════════════════
describe("disclaimer réglementaire", () => {
  it("part avec la mention même HORS parenthèses", () => {
    // Mesuré : il restait seul — « Cette déclaration ne vaut pas agrément de
    // l'État. » — sans le numéro qu'il commente.
    const gabarit =
      "<h2>Article 1</h2>\n<p>Déclaration d'activité n° {{centre_nda}} — Cette déclaration ne vaut pas agrément de l'État.</p>\n<p>Suite</p>";

    expect(stripNdaFromTemplate(gabarit, "")).toBe("<h2>Article 1</h2>\n<p>Suite</p>");
  });

  it("n'emporte QUE le disclaimer : la phrase suivante reste", () => {
    const gabarit =
      "<p>Déclaration d'activité n° {{centre_nda}} — Cette déclaration ne vaut pas agrément de l'État. Le stagiaire en est informé.</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("Le stagiaire en est informé.");
    expect(resultat).not.toMatch(/d[ée]claration/i);
    expect(resultat).not.toMatch(/agr[ée]ment/i);
  });

  it("ne confond pas une autre phrase avec le disclaimer", () => {
    const gabarit =
      "<p>Déclaration d'activité n° {{centre_nda}} — Le centre est agréé par la préfecture.</p>";
    const resultat = stripNdaFromTemplate(gabarit, "");

    expect(resultat).toContain("Le centre est agréé par la préfecture.");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// LES GABARITS RÉELS DU PROJET
// ════════════════════════════════════════════════════════════════════════════

/** Contrat VTC seedé par supabase/migrations/20260409231829… */
const SEED_CONTRAT_VTC =
  "<h1>CONTRAT DE FORMATION PROFESSIONNELLE</h1><h2>Formation VTC — Parcours Initial</h2><p><strong>Entre :</strong></p><p>Le centre de formation : {{centre_nom}}, {{centre_adresse}}, NDA : {{centre_nda}}, SIRET : {{centre_siret}}</p><p><strong>Et :</strong></p><p>{{civilite}} {{prenom}} {{nom}}, né(e) le {{date_naissance}} à {{ville_naissance}}</p><p>Adresse : {{rue}}, {{code_postal}} {{ville}}</p><p>Email : {{email}} — Tél : {{telephone}}</p><hr/><h3>Article 1 — Objet</h3><p>Le présent contrat a pour objet la formation professionnelle de conducteur VTC conformément au décret n°2015-1252.</p><h3>Article 2 — Nature et caractéristiques</h3><p>Intitulé : {{session_nom}}</p><p>Durée : {{session_duree_heures}} heures</p><p>Dates : du {{session_date_debut}} au {{session_date_fin}}</p><h3>Article 3 — Prix</h3><p>Montant total : {{montant_formation}} € TTC</p><h3>Article 4 — Modalités de paiement</h3><p>Le paiement est dû selon l'échéancier convenu entre les parties.</p><h3>Article 5 — Délai de rétractation</h3><p>Conformément à l'article L.6353-5 du Code du travail, le stagiaire dispose d'un délai de 10 jours à compter de la signature pour se rétracter.</p><h3>Article 6 — Conditions de résiliation</h3><p>En cas d'abandon en cours de formation, seules les heures effectuées seront facturées.</p>";

/** Contrat passerelle Taxi → VTC seedé par la même migration. */
const SEED_CONTRAT_PASSERELLE =
  "<h1>CONTRAT DE FORMATION PROFESSIONNELLE</h1><h2>Formation Passerelle Taxi → VTC</h2><p><strong>Entre :</strong></p><p>Le centre de formation : {{centre_nom}}, {{centre_adresse}}, NDA : {{centre_nda}}, SIRET : {{centre_siret}}</p><p><strong>Et :</strong></p><p>{{civilite}} {{prenom}} {{nom}}, né(e) le {{date_naissance}} à {{ville_naissance}}</p><p>Adresse : {{rue}}, {{code_postal}} {{ville}}</p><p>Email : {{email}} — Tél : {{telephone}}</p><hr/><h3>Article 1 — Objet</h3><p>Le présent contrat a pour objet la formation passerelle permettant aux titulaires d'une carte professionnelle Taxi d'obtenir la carte VTC.</p><h3>Article 2 — Nature et caractéristiques</h3><p>Intitulé : {{session_nom}}</p><p>Durée : {{session_duree_heures}} heures</p><p>Dates : du {{session_date_debut}} au {{session_date_fin}}</p><h3>Article 3 — Prérequis</h3><p>Le stagiaire certifie être titulaire d'une carte professionnelle de conducteur de Taxi en cours de validité.</p><h3>Article 4 — Prix</h3><p>Montant total : {{montant_formation}} € TTC</p><h3>Article 5 — Délai de rétractation</h3><p>Conformément à l'article L.6353-5, le stagiaire dispose d'un délai de 10 jours pour se rétracter.</p>";

/**
 * Tous les gabarits HTML réellement produits par le projet :
 * les 16 entrées de TEMPLATE_GENERATORS (complianceEngine), les 2 corps seedés
 * par la migration 20260409231829, et les 2 contrats de conduite.
 */
const GABARITS_REELS: { nom: string; body: string }[] = [
  ...Object.entries(TEMPLATE_GENERATORS).map(([type, def]) => ({
    nom: `TEMPLATE_GENERATORS.${type}`,
    body: def.generator(),
  })),
  { nom: "migration 20260409231829 — contrat VTC", body: SEED_CONTRAT_VTC },
  { nom: "migration 20260409231829 — contrat passerelle", body: SEED_CONTRAT_PASSERELLE },
  { nom: "contrat de conduite — VTC", body: buildDefaultContratConduiteHtml("vtc") },
  { nom: "contrat de conduite — Taxi", body: buildDefaultContratConduiteHtml("taxi") },
];

describe("gabarits réels du projet", () => {
  it("le corpus couvre bien tous les gabarits du projet", () => {
    expect(GABARITS_REELS.length).toBeGreaterThanOrEqual(20);
    // Au moins un gabarit porte la mention, sinon le corpus ne prouve rien.
    const porteurs = GABARITS_REELS.filter(
      (g) => g.body.includes("{{centre_nda}}") || g.body.includes("{{centre_numero_da}}")
    );
    expect(porteurs.length).toBeGreaterThanOrEqual(10);
  });

  it.each(GABARITS_REELS)("$nom : nettoyé sans aucune perte de contenu", ({ body }) => {
    const nettoye = stripNdaFromTemplate(body, "");
    attendreAucunePerte(body, nettoye, "gabarit réel");

    // Tous les autres jetons survivent, au même nombre d'occurrences.
    const autresJetons = (source: string) =>
      (source.match(/\{\{(\w+)\}\}/g) || []).filter(
        (j) => j !== "{{centre_nda}}" && j !== "{{centre_numero_da}}"
      );
    expect(autresJetons(nettoye)).toEqual(autresJetons(body));

    // Tous les titres survivent.
    const titres = (source: string) => source.match(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi) || [];
    expect(titres(nettoye).length).toBe(titres(body).length);
  });

  it.each(GABARITS_REELS)("$nom : aucune trace de la mention une fois rendu", ({ body }) => {
    const html = renderTemplateHtml(body, VARS_SANS_NDA);

    expect(html).not.toMatch(/\bNDA\b/i);
    expect(html).not.toMatch(/d[ée]claration\s+d['’]\s*activit[ée]/i);
    expect(html).not.toContain("{{centre_nda}}");
    expect(html).not.toContain("{{centre_numero_da}}");
    // R3 : aucun marqueur inventé entre crochets.
    expect(html).not.toMatch(/\[[^\]]*(NDA|SIRET)[^\]]*\]/i);
  });

  it.each(GABARITS_REELS)("$nom : INCHANGÉ quand le NDA est renseigné (R2)", ({ body }) => {
    expect(stripNdaFromTemplate(body, "11755030075")).toBe(body);
    expect(stripNdaFromTemplate(body, " 11 75 12345 75 ")).toBe(body);
  });

  it.each(GABARITS_REELS)("$nom : le nettoyage est idempotent", ({ body }) => {
    const une = stripNdaFromTemplate(body, "");
    const deux = stripNdaFromTemplate(une, "");
    expect(deux).toBe(une);
  });
});

describe("Contrat de formation pratique à la conduite", () => {
  const centreSansNda = {
    raison_sociale: "ECOLE T3P MONTROUGE",
    adresse: "3 rue Corneille, 92120 Montrouge",
    siret: "12345678900012",
    nda: "",
    email: "montrouge@ecolet3p.fr",
    telephone: "01 88 75 05 55",
  };

  function rendre(centre: typeof centreSansNda) {
    const vars = buildContratConduiteVariables({
      contact: null,
      centre,
      filiere: "vtc",
      prix_ttc: 300,
    });
    return renderTemplateHtml(buildDefaultContratConduiteHtml("vtc"), vars);
  }

  it("ne porte aucune mention de déclaration d'activité sans NDA", () => {
    const html = rendre(centreSansNda);

    expect(html).not.toMatch(/d[ée]claration\s+d['’]\s*activit[ée]/i);
    expect(html).not.toMatch(/\bNDA\b/);
    expect(html).toContain("SIRET 12345678900012");
  });

  it("n'invente jamais de valeur de repli sur l'identité légale", () => {
    const vars = buildContratConduiteVariables({
      contact: null,
      centre: null,
      filiere: "vtc",
      prix_ttc: 300,
    });

    for (const cle of [
      "centre_raison_sociale",
      "centre_adresse",
      "centre_siret",
      "centre_nda",
      "centre_numero_da",
      "centre_email",
      "centre_telephone",
    ]) {
      expect(vars[cle], `${cle} ne doit pas porter de repli inventé`).toBe("");
    }
  });

  it("affiche le NDA du 2ᵉ centre quand il est renseigné", () => {
    const vars = buildContratConduiteVariables({
      contact: null,
      centre: { ...centreSansNda, nda: "11755030075" },
      filiere: "vtc",
      prix_ttc: 300,
    });
    expect(vars.centre_nda).toBe("11755030075");
    expect(vars.centre_numero_da).toBe("11755030075");

    const html = renderTemplateHtml(
      "<p>Déclaration d'activité n° {{centre_numero_da}}</p>",
      vars
    );
    expect(html).toContain("Déclaration d'activité n° 11755030075");
  });

  it("nettoie aussi le jeton {{centre_numero_da}} d'un gabarit publié en base", () => {
    const resultat = stripNdaFromTemplate(
      "<p>SIRET {{centre_siret}} — Déclaration d'activité n° {{centre_numero_da}}<br/>Suite</p>",
      ""
    );
    expect(resultat).toBe("<p>SIRET {{centre_siret}}<br/>Suite</p>");
  });
});

describe("stripNdaFromTemplate — NDA renseigné (2ᵉ centre)", () => {
  const gabarits = [
    `<p>{{centre_nom}}<br/>\nN° Déclaration d'Activité : {{centre_nda}}<br/>\nAdresse : {{centre_adresse}}</p>`,
    "<p><em>Organisme : {{centre_nom}} — SIRET : {{centre_siret}} — NDA : {{centre_nda}}</em></p>",
    "<p>Le centre de formation : {{centre_nom}}, {{centre_adresse}}, NDA : {{centre_nda}}, SIRET : {{centre_siret}}</p>",
  ];

  it("rend le gabarit strictement inchangé", () => {
    for (const gabarit of gabarits) {
      expect(stripNdaFromTemplate(gabarit, "11755030075")).toBe(gabarit);
    }
  });

  it("laisse le NDA visible dans le document rendu", () => {
    const html = substitute(
      stripNdaFromTemplate(gabarits[1], VARS_AVEC_NDA.centre_nda),
      VARS_AVEC_NDA
    );
    expect(html).toContain("NDA : 11755030075");
  });
});

describe("stripNdaFromTemplate — gabarit sans NDA", () => {
  it("rend un gabarit sans {{centre_nda}} strictement inchangé, octet pour octet", () => {
    const gabarit =
      "<h1>Convocation</h1>\n<p>{{centre_nom}}<br/>\nSIRET : {{centre_siret}}<br/>\n{{centre_adresse}}</p>";
    expect(stripNdaFromTemplate(gabarit, "")).toBe(gabarit);
    expect(stripNdaFromTemplate(gabarit, "11755030075")).toBe(gabarit);
  });

  it("rend chaque gabarit réel SANS mention octet pour octet identique", () => {
    const sansMention = GABARITS_REELS.filter(
      (g) => !g.body.includes("{{centre_nda}}") && !g.body.includes("{{centre_numero_da}}")
    );
    expect(sansMention.length).toBeGreaterThan(0);
    for (const { nom, body } of sansMention) {
      expect(stripNdaFromTemplate(body, ""), nom).toBe(body);
    }
  });

  it("supporte une chaîne vide", () => {
    expect(stripNdaFromTemplate("", "")).toBe("");
  });
});

describe("stripNdaFromMarkdown — mentions légales publiques", () => {
  const gabarit = `# Mentions Légales

## Éditeur du site

**SIRET** : {SIRET}

**Numéro de Déclaration d'Activité (NDA)** : {NDA}

**Directeur de la publication** : {DIRECTEUR_PUBLICATION}`;

  it("retire la ligne entière quand elle ne porte QUE la mention", () => {
    const resultat = stripNdaFromMarkdown(gabarit, "");

    expect(resultat).not.toContain("{NDA}");
    expect(resultat).not.toMatch(/déclaration d'activité/i);
    expect(resultat).toContain("**SIRET** : {SIRET}");
    expect(resultat).toContain("**Directeur de la publication** : {DIRECTEUR_PUBLICATION}");
    expect(resultat).not.toMatch(/\n{3,}/);
  });

  it("ne retire que le segment quand la ligne porte d'autres variables", () => {
    const ligne = "**SIRET** : {SIRET} — **NDA** : {NDA}";
    expect(stripNdaFromMarkdown(ligne, "")).toBe("**SIRET** : {SIRET}");
  });

  it("R4 : l'agrément préfectoral ne disparaît PAS avec la mention", () => {
    // Mesuré : « Le centre, déclaré sous le n° {NDA}, est agréé par la
    // préfecture. » devenait une chaîne VIDE — l'agrément préfectoral
    // disparaissait de la page publique. La ligne ne part QUE si, jeton et
    // libellé retirés, il ne reste aucun texte porteur.
    const ligne = "Le centre, déclaré sous le n° {NDA}, est agréé par la préfecture.";
    const resultat = stripNdaFromMarkdown(ligne, "");

    expect(resultat.trim().length).toBeGreaterThan(0);
    expect(resultat).toContain("Le centre");
    expect(resultat).toContain("est agréé par la préfecture.");

    // « déclaré sous le n° » est un libellé de CLASSE B suivi de texte porteur :
    // le couper décapiterait la clause (c'est le constat mesuré sur trois
    // phrases contractuelles), il RESTE donc — R4 prime sur R1. Seul le jeton
    // s'efface : `{NDA}` vaut "" dans processContent (MentionsLegales.tsx),
    // donc rien ne s'imprime sur la page publique.
    expect(resultat).toContain("déclaré sous le n°");
  });

  it("R4 : une ligne porteuse survit même sans autre variable", () => {
    const ligne = "L'organisme est déclaré sous le numéro {NDA} auprès de la DREETS.";
    const resultat = stripNdaFromMarkdown(ligne, "");

    expect(resultat).toContain("auprès de la DREETS.");
    expect(resultat.trim().length).toBeGreaterThan(0);
  });

  it("rend le gabarit inchangé quand le NDA est renseigné", () => {
    expect(stripNdaFromMarkdown(gabarit, "11755030075")).toBe(gabarit);
  });

  it("rend un contenu sans {NDA} inchangé", () => {
    const sansNda = "# Mentions Légales\n\n**SIRET** : {SIRET}\n";
    expect(stripNdaFromMarkdown(sansNda, "")).toBe(sansNda);
  });

  it("est idempotent", () => {
    const une = stripNdaFromMarkdown(gabarit, "");
    expect(stripNdaFromMarkdown(une, "")).toBe(une);
  });
});

describe("renderTemplateHtml — chemin de rendu partagé (émargement, packs, contrat conduite)", () => {
  it("ne laisse aucune trace du NDA dans le HTML réellement produit", () => {
    const gabarit = `<p>{{centre_nom}}<br/>
SIRET : {{centre_siret}}<br/>
N° Déclaration d'Activité : {{centre_nda}}<br/>
Adresse : {{centre_adresse}}</p>`;

    const html = renderTemplateHtml(gabarit, VARS_SANS_NDA);

    expect(html).not.toMatch(/NDA/i);
    expect(html).not.toMatch(/déclaration/i);
    expect(html).toContain("SIRET : 12345678901234");
    expect(html).toContain("Adresse : 1 rue de Paris, 92120 Montrouge");
  });

  it("affiche le NDA quand il est renseigné", () => {
    const html = renderTemplateHtml("<p>NDA : {{centre_nda}}</p>", VARS_AVEC_NDA);
    expect(html).toContain("NDA : 11755030075");
  });
});
