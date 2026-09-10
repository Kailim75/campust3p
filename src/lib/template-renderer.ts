// ═══════════════════════════════════════════════════════════════
// Template Renderer — Render published templates with variables and export as PDF
// ═══════════════════════════════════════════════════════════════

import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { hasNda } from "./centre-to-company";

// ═══════════════════════════════════════════════════════════════
// NDA (numéro de déclaration d'activité) — masquage quand il est absent
// ═══════════════════════════════════════════════════════════════

// Décision du directeur (10/09/2026) : le centre n'a PAS de numéro de
// déclaration d'activité. Quand la valeur est vide, AUCUNE trace de la mention
// ne doit subsister sur les documents — ni libellé, ni séparateur orphelin, ni
// ligne vide, ni phrase amputée. Les gabarits vivent EN BASE (seedés par
// migrations, éditables par l'utilisateur) : le nettoyage se fait donc sur le
// gabarit, juste avant la substitution des variables. Quand le NDA est
// renseigné (2ᵉ centre à venir), le gabarit est rendu STRICTEMENT inchangé.

/**
 * Jetons du NDA dans les gabarits HTML (Template Studio, devis, packs, contrat
 * de conduite). `{{centre_numero_da}}` est le jeton historique du gabarit de
 * contrat de formation pratique à la conduite : il désigne la MÊME mention et
 * doit donc être nettoyé par la même règle.
 */
export const NDA_TEMPLATE_TOKENS = ["{{centre_nda}}", "{{centre_numero_da}}"] as const;
/** Jeton principal (compat : anciens imports). */
export const NDA_TEMPLATE_TOKEN = NDA_TEMPLATE_TOKENS[0];
/** Jeton du NDA dans les gabarits Markdown (mentions légales publiques). */
export const NDA_MARKDOWN_TOKEN = "{NDA}";

/** Caractères qui bornent le fragment portant le NDA. */
const STOP_CHARS = new Set([",", ";", ".", "!", "?", "—", "–", "·", "•", "|", "/"]);
/** Séparateurs à retirer avec le fragment (sinon ils resteraient orphelins). */
const JOINERS = new Set([",", ";", "—", "–", "·", "•", "|", "/"]);
/** Ponctuation qui, restée seule, disparaît avec le fragment. */
const ORPHAN_PUNCT = new Set([".", ",", ";", ":", "!", "?"]);
/** Ponctuation qui TERMINE une phrase (borne admise pour un libellé verbal). */
const FINAL_PUNCT = new Set([".", "!", "?"]);
/** Balises dont on retire la paire si le retrait l'a vidée (jamais un <td>). */
const REMOVABLE_WRAPPERS = new Set(["p", "em", "strong", "span", "div", "small", "i", "b", "li"]);

// ── Les entités HTML sont des ATOMES ──────────────────────────────────────
//
// Constat mesuré (relecture adversariale) : « ; » figurait dans STOP_CHARS et
// dans JOINERS. Sur « NDA&nbsp;: {{centre_nda}} » la borne du segment tombait
// DANS l'entité — le segment se réduisait à « : », que l'ancien prédicat
// acceptait comme libellé (segment purement ponctuel) — et la coupe rendait
// « NDA&nbsp », mot NDA imprimé et entité cassée.
//
// Désormais toute entité (`&nom;` ou `&#123;`) est indivisible : le balayage ne
// s'arrête jamais à l'intérieur, il saute d'un bord à l'autre, et aucune borne
// de coupe ne peut tomber entre le « & » et le « ; ». Les entités d'espace
// (nbsp, espace fine, insécable étroite) comptent comme des blancs.

const ENTITY_SOURCE = String.raw`&(?:#(?:[0-9]{1,7}|[xX][0-9a-fA-F]{1,6})|[a-zA-Z][a-zA-Z0-9]{1,31});`;

/** Entités nommées rencontrées dans les gabarits (français + ponctuation). */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: "\u00A0",
  ensp: "\u2002",
  emsp: "\u2003",
  thinsp: "\u2009",
  numsp: "\u2007",
  puncsp: "\u2008",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  euml: "ë",
  agrave: "à",
  acirc: "â",
  ccedil: "ç",
  icirc: "î",
  iuml: "ï",
  ocirc: "ô",
  ugrave: "ù",
  ucirc: "û",
  deg: "°",
  ordm: "º",
  mdash: "—",
  ndash: "–",
  middot: "·",
  bull: "•",
  hellip: "…",
  euro: "€",
};

/** Caractère représenté par l'entité, ou `null` si elle est inconnue. */
function decodeEntity(raw: string): string | null {
  const corps = raw.slice(1, -1);
  if (corps.startsWith("#")) {
    const hexa = corps[1] === "x" || corps[1] === "X";
    const code = Number.parseInt(hexa ? corps.slice(2) : corps.slice(1), hexa ? 16 : 10);
    if (!Number.isInteger(code) || code <= 0 || code > 0x10ffff) return null;
    try {
      return String.fromCodePoint(code);
    } catch {
      return null;
    }
  }
  return NAMED_ENTITIES[corps.toLowerCase()] ?? null;
}

interface Entite {
  start: number;
  end: number;
  /** Caractère représenté, `null` si l'entité est inconnue. */
  char: string | null;
}

/** Position des entités d'une chaîne, interrogeable par index. */
interface IndexEntites {
  /** L'entité qui COUVRE cet index (`start <= index < end`). */
  couvrant(index: number): Entite | undefined;
  /** L'entité qui COMMENCE exactement à cet index. */
  commencantA(index: number): Entite | undefined;
  /** L'entité qui SE TERMINE exactement à cet index. */
  finissantA(index: number): Entite | undefined;
}

function indexerEntites(source: string): IndexEntites {
  const couvre = new Map<number, Entite>();
  const debute = new Map<number, Entite>();
  const finit = new Map<number, Entite>();
  const re = new RegExp(ENTITY_SOURCE, "g");
  let trouve: RegExpExecArray | null;
  while ((trouve = re.exec(source)) !== null) {
    const entite: Entite = {
      start: trouve.index,
      end: trouve.index + trouve[0].length,
      char: decodeEntity(trouve[0]),
    };
    for (let i = entite.start; i < entite.end; i++) couvre.set(i, entite);
    debute.set(entite.start, entite);
    finit.set(entite.end, entite);
  }
  return {
    couvrant: (index) => couvre.get(index),
    commencantA: (index) => debute.get(index),
    finissantA: (index) => finit.get(index),
  };
}

/** Espaces typographiques : insécable, fine, étroite, chasse nulle. */
const SPACE_CHARS_RE = /[\u00A0\u202F\u2009\u200A\u200B\u2007\u2002\u2003\u2008]/g;

function reduireEspaces(text: string): string {
  return text.replace(SPACE_CHARS_RE, " ");
}

function estBlancOuEntiteBlanche(ch: string | null): boolean {
  return ch !== null && (/\s/.test(ch) || reduireEspaces(ch) === " ");
}

/** Avance sur les blancs, entités d'espace comprises. Jamais dans une entité. */
function sauteBlancs(text: string, index: number, ents: IndexEntites): number {
  let i = index;
  for (;;) {
    if (i < text.length && isSpace(text[i])) {
      i++;
      continue;
    }
    const ent = ents.commencantA(i);
    if (ent && estBlancOuEntiteBlanche(ent.char)) {
      i = ent.end;
      continue;
    }
    return i;
  }
}

/** Recule sur les blancs, entités d'espace comprises. Jamais dans une entité. */
function reculeBlancs(text: string, index: number, ents: IndexEntites): number {
  let i = index;
  for (;;) {
    const ent = ents.finissantA(i);
    if (ent && estBlancOuEntiteBlanche(ent.char)) {
      i = ent.start;
      continue;
    }
    if (i > 0 && isSpace(text[i - 1])) {
      i--;
      continue;
    }
    return i;
  }
}

/** Décode les entités connues — pour COMPARER un libellé, jamais pour rendre. */
function decodeEntities(text: string): string {
  return text.replace(new RegExp(ENTITY_SOURCE, "g"), (raw) => decodeEntity(raw) ?? raw);
}

/** Aucune borne de coupe ne peut tomber À L'INTÉRIEUR d'une entité. */
function bornesHorsEntite(
  cut: { start: number; end: number },
  ents: IndexEntites
): { start: number; end: number } {
  let { start, end } = cut;
  const debut = ents.couvrant(start);
  // On resserre (on retire MOINS) : une entité entamée est laissée entière.
  if (debut && start > debut.start) start = debut.end;
  const fin = ents.couvrant(end);
  if (fin && end > fin.start) end = fin.start;
  return { start, end };
}
// ── Grammaire des LIBELLÉS de la mention ──────────────────────────────────
//
// Règle de coupe (réécriture du 10/09/2026) : on ne découpe plus la phrase
// « autour » du jeton par heuristique. On délimite un SEGMENT (le texte entre
// le jeton et la borne précédente : début de nœud, <br>, balise de bloc ou
// caractère d'arrêt) et on ne coupe QUE s'il correspond ENTIÈREMENT — expression
// ANCRÉE — à un libellé connu de la mention. Sinon on laisse le jeton en place,
// que la substitution rendra vide : un libellé orphelin est un défaut
// esthétique, une clause contractuelle supprimée est une faute.
//
// Les libellés viennent des gabarits RÉELS du projet : complianceEngine.ts
// (TEMPLATE_GENERATORS), src/lib/documents/**, les corps seedés par
// supabase/migrations/20260409231829… et 20260125234816…, et le gabarit de
// mentions légales de SuperAdminLegalMentions.tsx.

/** « n° », « N °», « nº », « numéro ». */
const NUM = String.raw`(?:n\s*[°º]|num[ée]ro)`;
/** « déclaration d'activité » (apostrophe droite ou typographique). */
const DA = String.raw`d[ée]claration\s+d\s*['’]?\s*activit[ée]`;
/** « enregistré / déclaré sous le n° ». */
const SOUS_LE = String.raw`(?:enregistr|d[ée]clar)[ée]e?s?\s+sous\s+le\s+${NUM}`;

// ── DEUX CLASSES de libellés ──────────────────────────────────────────────
//
// Constat mesuré (relecture adversariale) : la grammaire mêlait des libellés
// NOMINAUX et des formulations VERBALES qui englobent le SUJET de la phrase.
// Sur « L'organisme de formation est déclaré sous le numéro {{centre_nda}} et
// s'engage à respecter le règlement intérieur. » la coupe partait donc du début
// de la clause et rendait « et s'engage à respecter le règlement intérieur. » —
// une clause contractuelle amputée de son sujet.

/**
 * CLASSE A — libellés NOMINAUX, sans verbe : « NDA : », « N° DA »,
 * « Déclaration d'activité n° », « Numéro de Déclaration d'Activité (NDA) : ».
 * Ils ne portent aucun contenu : supprimables PARTOUT, même en milieu de phrase.
 */
const NDA_LABEL_A_PATTERNS = [
  String.raw`nda`,
  String.raw`\(\s*(?:nda|da)\s*\)`,
  `${NUM}\\s*(?:nda|da)`,
  // « Déclaration d'activité », « N° Déclaration d'Activité »,
  // « N° de déclaration d'activité », « Numéro de Déclaration d'Activité »
  `(?:${NUM}\\s+(?:de\\s+)?)?${DA}`,
  // « Déclaration d'activité N° »
  `${DA}\\s+${NUM}`,
];

/**
 * CLASSE B — formulations VERBALES, ou portant le sujet de la phrase. Les couper
 * en milieu de phrase décapite la clause : elles ne partent QUE si le jeton
 * TERMINE son segment (cf. `segmentTermineApres`). Sinon on retire le seul
 * jeton, que la substitution rendra vide, et le libellé reste visible —
 * compromis assumé : R4 prime sur R1.
 */
const NDA_LABEL_B_PATTERNS = [
  // « L'organisme de formation est déclaré sous le n° »
  `(?:l\\s*['’]\\s*)?organisme\\s+de\\s+formation\\s+(?:est\\s+)?${SOUS_LE}`,
  // « Déclaration d'activité enregistrée sous le n° »
  `${DA}\\s+${SOUS_LE}`,
  // « déclaré sous le numéro », « enregistré sous le n° »
  SOUS_LE,
];

/**
 * Expression ANCRÉE (^…$) : le segment doit correspondre au libellé EN ENTIER.
 * Un simple test de présence emportait « L'organisme est déclaré sous le numéro
 * … et s'engage à respecter le règlement », donc une clause entière.
 */
function buildLabelRe(patterns: string[]): RegExp {
  return new RegExp(
    `^\\s*(?:[-–—·•|/]\\s*)?(?:${patterns.join("|")})` +
      `(?:\\s*\\(\\s*(?:nda|da)\\s*\\))?\\s*:?\\s*$`,
    "i"
  );
}

const NDA_LABEL_A_RE = buildLabelRe(NDA_LABEL_A_PATTERNS);
const NDA_LABEL_B_RE = buildLabelRe(NDA_LABEL_B_PATTERNS);
/** Union des deux classes : libellé porté par sa propre balise, ligne Markdown. */
const NDA_LABEL_RE = buildLabelRe([...NDA_LABEL_A_PATTERNS, ...NDA_LABEL_B_PATTERNS]);

/** Contenu de parenthèse appartenant au libellé : « (NDA) », « (n° DA) ». */
const NDA_PAREN_LABEL_RE = new RegExp(`^(?:nda|da|${NUM}(?:\\s*(?:nda|da))?)$`, "i");

/** Disclaimer réglementaire qui suit le numéro, et part avec lui. */
const NDA_DISCLAIMER_RE =
  /^(?:cette\s+d[ée]claration\s+)?ne\s+vaut\s+pas\s+agr[ée]ment\s+de\s+l\s*['’]?\s*[ée]tat\s*\.?$/i;

/** Entités décodées, espaces insécables réduits, emphase Markdown ôtée. */
function normalizeLabel(text: string): string {
  return reduireEspaces(decodeEntities(text))
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classe du libellé qui précède le jeton dans son segment. */
type ClasseLibelle = "aucune" | "nominale" | "verbale";

/**
 * À quelle classe appartient le segment qui précède le jeton ?
 *
 * Un segment VIDE (le jeton est seul dans son nœud) se comporte comme un libellé
 * nominal : il n'y a rien à perdre. Un segment purement PONCTUEL (« : », « - »)
 * est en revanche REFUSÉ — un libellé doit contenir au moins un mot de la
 * grammaire. C'est ce segment-là qui, sur une entité coupée en deux
 * (« NDA&nbsp;: »), faisait passer un reste de ponctuation pour un libellé.
 */
function classeDuSegment(text: string): ClasseLibelle {
  const normalise = normalizeLabel(text);
  if (normalise.length === 0) return "nominale";
  if (isBlankSegment(normalise)) return "aucune";
  if (NDA_LABEL_A_RE.test(normalise)) return "nominale";
  if (NDA_LABEL_B_RE.test(normalise)) return "verbale";
  return "aucune";
}

/**
 * La ligne Markdown, jeton ôté, ne porte-t-elle QUE la mention ? Les deux
 * classes conviennent ici : si le libellé couvre la ligne ENTIÈRE, le jeton en
 * termine forcément le segment.
 */
function ligneEntierementMention(text: string): boolean {
  const normalise = normalizeLabel(text);
  if (normalise.length === 0 || isBlankSegment(normalise)) return true;
  return NDA_LABEL_RE.test(normalise);
}

/** Balises en ligne susceptibles de porter le LIBELLÉ de la mention. */
const INLINE_LABEL_TAGS = new Set(["span", "strong", "em", "b", "i", "small", "label", "u"]);
/** Balises qui bornent une « ligne visuelle » (saut de ligne ou bloc). */
const BLOCK_BOUNDARY_RE =
  /<\s*\/?\s*(br|p|div|td|th|tr|li|ul|ol|h[1-6]|table|section|header|footer|blockquote)\b/i;
/** Marque temporaire pour les jetons volontairement laissés en place. */
const KEEP_MARK = "\uE000nda\uE000";
const BR_AFTER_RE = /^<br\s*\/?>/i;
const BR_BEFORE_RE = /<br\s*\/?>\s*$/i;

function isSpace(ch: string | undefined): boolean {
  return ch !== undefined && /\s/.test(ch);
}

/**
 * Le `>` en `gtIndex` ferme-t-il une balise en ligne dont le texte visible EST
 * le libellé de la mention (« <strong>NDA :</strong> », « <span>N° DA :</span> ») ?
 *
 * Le texte visible doit correspondre ENTIÈREMENT au libellé (même expression
 * ancrée que le segment) et faire moins de 40 caractères. Une balise portant
 * « Organisme de formation » n'est donc PAS emportée : elle contenait un
 * mot-clé, l'ancienne version l'effaçait avec la mention.
 *
 * Renvoie l'index de la balise ouvrante, sinon `null` — et la coupe s'arrête à
 * la balise (jamais de balise à moitié retirée).
 */
function labelTagStart(source: string, gtIndex: number): number | null {
  const ltIndex = source.lastIndexOf("<", gtIndex);
  if (ltIndex < 0) return null;
  const closing = /^<\/([a-zA-Z][a-zA-Z0-9]*)\s*>$/.exec(source.slice(ltIndex, gtIndex + 1));
  if (!closing) return null;
  const tag = closing[1].toLowerCase();
  if (!INLINE_LABEL_TAGS.has(tag)) return null;

  const head = source.slice(0, ltIndex);
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  let openIndex = -1;
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(head)) !== null) openIndex = match.index;
  if (openIndex < 0) return null;

  const block = source.slice(openIndex, gtIndex + 1);
  // Pas de variable, pas de saut de ligne ni de bloc à l'intérieur du libellé.
  if (block.includes("{{") || BLOCK_BOUNDARY_RE.test(block)) return null;
  const visible = normalizeLabel(block.replace(/<[^>]*>/g, ""));
  if (visible.length === 0 || visible.length >= 40) return null;
  if (!NDA_LABEL_RE.test(visible)) return null;
  return openIndex;
}

/**
 * Début du SEGMENT candidat portant le jeton.
 *
 * La borne est le début du nœud de texte, un `<br>`, une balise de bloc, ou un
 * caractère d'arrêt (, ; . ! ? tiret cadratin, point médian, barre, slash). La
 * coupe ne traverse JAMAIS une balise ni une parenthèse — seule exception :
 * une parenthèse courte dont le contenu appartient au libellé (« (NDA) »),
 * jamais « (durée 140 heures, dont 105 en présentiel) ».
 */
function phraseStart(source: string, tokenStart: number, ents: IndexEntites): number {
  let i = tokenStart;
  while (i > 0) {
    // Une entité est un ATOME : on ne s'arrête jamais à l'intérieur. Si le
    // caractère qu'elle représente borne le fragment, on s'arrête à sa
    // FRONTIÈRE ; sinon on l'enjambe d'un bord à l'autre.
    const ent = ents.couvrant(i - 1);
    if (ent) {
      if (ent.char !== null && (STOP_CHARS.has(ent.char) || ent.char === "(" || ent.char === ")")) {
        i = ent.end;
        break;
      }
      i = ent.start;
      continue;
    }
    const ch = source[i - 1];
    if (ch === "\n" || ch === "\r" || ch === "}") break;
    // La coupe reste confinée à un nœud de texte : jamais au travers d'une
    // balise (ouvrante, fermante ou attribut). L'absorption d'une balise
    // portant le libellé est traitée à part, après reconnaissance du segment.
    if (ch === "<" || ch === ">") break;
    if (ch === "(") break;
    if (ch === ")") {
      const open = source.lastIndexOf("(", i - 2);
      if (open < 0) break;
      const inner = source.slice(open + 1, i - 1);
      if (inner.length >= 40 || /[<>\n\r{}()]/.test(inner)) break;
      if (!NDA_PAREN_LABEL_RE.test(normalizeLabel(inner))) break;
      i = open;
      continue;
    }
    if (ch === "-" && isSpace(source[i - 2]) && isSpace(source[i])) break;
    if (STOP_CHARS.has(ch)) break;
    i--;
  }
  while (i < tokenStart && isSpace(source[i])) i++;
  return i;
}

/**
 * Fin du segment portant le jeton.
 *
 * La coupe s'arrête à la FIN DU JETON. Elle ne s'étend au-delà que pour une
 * parenthèse dont le contenu est EXACTEMENT le disclaimer réglementaire —
 * « {{centre_nda}} (ne vaut pas agrément de l'État) ». Toute autre parenthèse
 * reste : « {{centre_nda}} (voir article 3 du présent contrat) » conserve son
 * renvoi, et le texte qui le suit. Les séparateurs qui suivent le jeton
 * (« , », « — », « | ») restent traités, eux, par extendCut.
 */
function phraseEnd(source: string, tokenEnd: number, ents: IndexEntites): number {
  const i = sauteBlancs(source, tokenEnd, ents);
  if (source[i] === "(") {
    const close = source.indexOf(")", i + 1);
    if (close < 0) return tokenEnd;
    const inner = source.slice(i + 1, close);
    if (/[<>\n\r{}()]/.test(inner)) return tokenEnd;
    if (NDA_DISCLAIMER_RE.test(normalizeLabel(inner))) return close + 1;
    return tokenEnd;
  }
  return finDisclaimerNu(source, i, ents) ?? tokenEnd;
}

/**
 * Le disclaimer réglementaire suit-il le numéro SANS parenthèses ?
 * « … n° {{centre_nda}} — Cette déclaration ne vaut pas agrément de l'État. »
 *
 * Seul le disclaimer EXACT est absorbé, avec le séparateur qui l'introduit et
 * son point final. Toute autre suite de texte — « auprès du préfet de région
 * d'Île-de-France. » — laisse la fin de coupe au jeton : la coupe ne s'élargit
 * à rien d'autre qu'à cette phrase-là.
 */
function finDisclaimerNu(source: string, from: number, ents: IndexEntites): number | null {
  let i = from;
  const sep = source[i];
  if (
    sep !== undefined &&
    (JOINERS.has(sep) || FINAL_PUNCT.has(sep) || (sep === "-" && isSpace(source[i + 1])))
  ) {
    i = sauteBlancs(source, i + 1, ents);
  }
  let j = i;
  while (j < source.length && !"<>{}()\n\r.".includes(source[j])) j++;
  let fin: number;
  if (source[j] === ".") fin = j + 1;
  else if (j >= source.length || source[j] === "<" || source[j] === "\n" || source[j] === "\r")
    fin = j;
  else return null;
  const candidat = source.slice(i, fin);
  if (candidat.trim().length === 0) return null;
  return NDA_DISCLAIMER_RE.test(normalizeLabel(candidat)) ? fin : null;
}

/**
 * Après la coupe, le segment est-il TERMINÉ ?
 *
 * Condition de suppression d'un libellé de CLASSE B : après le jeton (et son
 * éventuel disclaimer) il ne doit rester que des blancs avant une borne —
 * balise, fin de nœud, fin de chaîne — ou une ponctuation finale. Dès qu'un
 * texte porteur suit (« , SIRET {{centre_siret}}, TVA non applicable. »), on ne
 * coupe pas le libellé : on retire le seul jeton.
 */
function segmentTermineApres(source: string, end: number, ents: IndexEntites): boolean {
  let i = sauteBlancs(source, end, ents);
  if (i < source.length && FINAL_PUNCT.has(source[i])) i = sauteBlancs(source, i + 1, ents);
  if (i >= source.length) return true;
  const ch = source[i];
  return ch === "<" || ch === "\n" || ch === "\r";
}

/** Étend le retrait au séparateur ou à la ponctuation devenus orphelins. */
function extendCut(
  source: string,
  start: number,
  end: number,
  ents: IndexEntites
): { start: number; end: number } {
  const left = reculeBlancs(source, start, ents);
  // Le « ; » qui FERME une entité n'est pas un séparateur : sans ce garde-fou,
  // « NDA&nbsp;: {{centre_nda}} » faisait passer la fin de `&nbsp;` pour un
  // joiner et la coupe scindait l'entité.
  const prev = ents.finissantA(left) ? undefined : source[left - 1];
  const prevIsJoiner =
    prev !== undefined && (JOINERS.has(prev) || (prev === "-" && isSpace(source[left - 2])));

  const right = sauteBlancs(source, end, ents);
  const next = ents.commencantA(right) ? undefined : source[right];
  const nextIsJoiner =
    next !== undefined && (JOINERS.has(next) || (next === "-" && isSpace(source[right + 1])));

  if (prevIsJoiner) {
    return { start: reculeBlancs(source, left - 1, ents), end };
  }
  if (nextIsJoiner) {
    return { start, end: sauteBlancs(source, right + 1, ents) };
  }
  if (next !== undefined && ORPHAN_PUNCT.has(next)) {
    const startsSegment = left === 0 || source[left - 1] === ">" || source[left - 1] === "\n";
    if (startsSegment || (prev !== undefined && ORPHAN_PUNCT.has(prev))) {
      return { start, end: right + 1 };
    }
  }
  if (isSpace(source[start - 1]) && isSpace(source[end])) {
    return { start, end: end + 1 };
  }
  return { start, end };
}

/** Bornes de la « ligne » visuelle autour d'une position. */
function lineBounds(source: string, pos: number): [number, number] {
  let start = pos;
  while (start > 0 && source[start - 1] !== ">" && source[start - 1] !== "\n") start--;
  let end = pos;
  while (end < source.length && source[end] !== "<" && source[end] !== "\n") end++;
  return [start, end];
}

/**
 * Segment « vide » au sens du rendu : blancs et ponctuation. Les entités y sont
 * décodées — une ligne réduite à `&nbsp;` est visuellement vide.
 */
function isBlankSegment(text: string): boolean {
  return /^[\s.,;:!?—–·•|/-]*$/.test(reduireEspaces(decodeEntities(text)));
}

/**
 * La LIGNE VISUELLE autour de la coupe est-elle vide ?
 *
 * `lineBounds` ne regarde que le nœud de texte entre `>` et `<` : quand le
 * libellé est porté par une balise (« <span class="lbl">NDA :</span> »), ce
 * nœud est vide alors que la ligne affichée ne l'est pas — retirer le <br/>
 * collait alors le libellé au champ suivant (constat 4). On évalue donc la
 * ligne jusqu'au <br/> ou à la balise de bloc de part et d'autre, balises
 * retirées.
 */
function visualLineIsBlank(source: string, lineStart: number, lineEnd: number): boolean {
  let start = lineStart;
  while (start > 0) {
    const lt = source.lastIndexOf("<", start - 1);
    if (lt < 0) {
      start = 0;
      break;
    }
    const gt = source.indexOf(">", lt);
    if (gt < 0 || gt >= start) {
      start = lt;
      break;
    }
    if (BLOCK_BOUNDARY_RE.test(source.slice(lt, gt + 1))) {
      start = gt + 1;
      break;
    }
    start = lt;
  }

  let end = lineEnd;
  while (end < source.length) {
    const lt = source.indexOf("<", end);
    if (lt < 0) {
      end = source.length;
      break;
    }
    const gt = source.indexOf(">", lt);
    if (gt < 0) {
      end = source.length;
      break;
    }
    if (BLOCK_BOUNDARY_RE.test(source.slice(lt, gt + 1))) {
      end = lt;
      break;
    }
    end = gt + 1;
  }

  return isBlankSegment(source.slice(start, end).replace(/<[^>]*>/g, ""));
}

/** Retire le saut de ligne et la balise vidés par le retrait du fragment. */
function cleanupAt(source: string, pos: number): string {
  let text = source;
  let index = pos;

  const [lineStart, lineEnd] = lineBounds(text, index);
  if (
    isBlankSegment(text.slice(lineStart, lineEnd)) &&
    visualLineIsBlank(text, lineStart, lineEnd)
  ) {
    const brAfter = BR_AFTER_RE.exec(text.slice(lineEnd));
    const brBefore = BR_BEFORE_RE.exec(text.slice(0, lineStart));
    if (brAfter) {
      text = text.slice(0, lineStart) + text.slice(lineEnd + brAfter[0].length);
      index = lineStart;
    } else if (brBefore) {
      text = text.slice(0, brBefore.index) + text.slice(lineEnd);
      index = brBefore.index;
    } else if (text[lineStart - 1] === "\n" && text[lineEnd] === "\n") {
      text = text.slice(0, lineStart) + text.slice(lineEnd + 1);
      index = lineStart;
    } else if (lineEnd > lineStart) {
      text = text.slice(0, lineStart) + text.slice(lineEnd);
      index = lineStart;
    }
    if (text[index] === "\n" && (index === 0 || text[index - 1] === "\n")) {
      text = text.slice(0, index) + text.slice(index + 1);
    }
  }

  for (let depth = 0; depth < 3; depth++) {
    const open = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>\s*$/.exec(text.slice(0, index));
    if (!open) break;
    const tag = open[1].toLowerCase();
    if (!REMOVABLE_WRAPPERS.has(tag)) break;
    const close = new RegExp(`^\\s*</${tag}\\s*>`, "i").exec(text.slice(index));
    if (!close) break;
    text = text.slice(0, open.index) + text.slice(index + close[0].length);
    index = open.index;
    if (text[index] === "\n" && (index === 0 || text[index - 1] === "\n")) {
      text = text.slice(0, index) + text.slice(index + 1);
    }
  }

  return text;
}

/**
 * Le jeton est-il DANS une balise (nom ou valeur d'attribut) plutôt que dans
 * le contenu ? Ex. `<div data-nda="{{centre_nda}}" class="org">`.
 *
 * Aucune coupe n'est alors possible sans détruire la balise et le contenu qui
 * la suit (constat 3) : on laisse le jeton, que la substitution rendra vide —
 * exactement le comportement d'avant ce nettoyage.
 */
function isInsideTag(source: string, tokenStart: number): boolean {
  const lt = source.lastIndexOf("<", tokenStart);
  if (lt < 0) return false;
  return lt > source.lastIndexOf(">", tokenStart);
}

function removeTokenPhrases(source: string, token: string): string {
  let text = source;
  let guard = 0;
  while (text.includes(token) && guard++ < 50) {
    // Les entités sont réindexées à chaque tour : le texte vient d'être coupé.
    const ents = indexerEntites(text);
    const tokenStart = text.indexOf(token);
    const tokenEnd = tokenStart + token.length;
    if (isInsideTag(text, tokenStart)) {
      text = text.slice(0, tokenStart) + KEEP_MARK + text.slice(tokenEnd);
      continue;
    }
    const segmentStart = phraseStart(text, tokenStart, ents);
    const classe = classeDuSegment(text.slice(segmentStart, tokenStart));
    if (classe === "aucune") {
      // Le segment n'est PAS un libellé de la mention : on ne coupe rien. Le
      // jeton reste, la substitution le rendra vide — comportement d'avant le
      // lot. Un libellé orphelin est acceptable, une perte de contenu non.
      text = text.slice(0, tokenStart) + KEEP_MARK + text.slice(tokenEnd);
      continue;
    }
    const end = phraseEnd(text, tokenEnd, ents);
    if (classe === "verbale" && !segmentTermineApres(text, end, ents)) {
      // Libellé VERBAL suivi de texte porteur : le couper décapiterait la
      // clause (« … et s'engage à respecter le règlement intérieur. »). On
      // retire le seul jeton et on laisse le libellé visible — R4 prime.
      text = text.slice(0, tokenStart) + KEEP_MARK + text.slice(tokenEnd);
      continue;
    }
    // Le libellé peut être porté par sa propre balise : « <strong>NDA :</strong> ».
    let start = segmentStart;
    for (let depth = 0; depth < 3; depth++) {
      let before = start;
      while (before > 0 && isSpace(text[before - 1])) before--;
      if (text[before - 1] !== ">") break;
      const tagStart = labelTagStart(text, before - 1);
      if (tagStart === null) break;
      start = tagStart;
    }
    const cut = bornesHorsEntite(extendCut(text, start, end, ents), ents);
    text = cleanupAt(text.slice(0, cut.start) + text.slice(cut.end), cut.start);
  }
  return text.split(KEEP_MARK).join(token);
}

/**
 * Le NDA est-il réellement renseigné ?
 *
 * Prédicat UNIQUE côté front : c'est `hasNda` (src/lib/centre-to-company.ts),
 * simplement réexporté ici sous son nom historique. Les deux divergeaient —
 * `hasNda` rejetait toute valeur contenant un crochet, `isNdaProvided` seulement
 * celles ENTIÈREMENT entre crochets —, donc « [NDA requis] (à confirmer) »
 * masquait la mention dans les PDF et l'imprimait dans les gabarits.
 */
export { hasNda as isNdaProvided };

/**
 * Retire du gabarit HTML le fragment portant `{{centre_nda}}` (libellé,
 * séparateur et saut de ligne compris) quand le NDA est absent.
 * NDA renseigné, ou gabarit sans NDA → chaîne rendue telle quelle.
 */
export function stripNdaFromTemplate(templateBody: string, ndaValue?: string | null): string {
  if (typeof templateBody !== "string" || templateBody.length === 0) return templateBody;
  if (hasNda(ndaValue)) return templateBody;
  let text = templateBody;
  for (const token of NDA_TEMPLATE_TOKENS) {
    if (text.includes(token)) text = removeTokenPhrases(text, token);
  }
  return text;
}

/**
 * Même règle ANCRÉE pour le Markdown des mentions légales publiques.
 *
 * La ligne ne part QUE si, jeton et libellé retirés, il ne reste aucun texte
 * porteur. L'ancienne version supprimait la ligne entière dès qu'elle portait
 * `{NDA}` sans autre variable : sur
 * « Le centre, déclaré sous le n° {NDA}, est agréé par la préfecture. »
 * elle rendait une chaîne VIDE, et l'agrément préfectoral disparaissait de la
 * page publique. Ici la ligne survit, amputée du seul segment de la mention.
 */
export function stripNdaFromMarkdown(content: string, ndaValue?: string | null): string {
  if (typeof content !== "string" || content.length === 0) return content;
  if (hasNda(ndaValue)) return content;
  if (!content.includes(NDA_MARKDOWN_TOKEN)) return content;

  const lines = content.split("\n");
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes(NDA_MARKDOWN_TOKEN)) {
      kept.push(line);
      continue;
    }
    // La ligne ne porte-t-elle QUE la mention ? On teste ce qu'il en reste une
    // fois le jeton ôté, contre la même expression ancrée que le HTML.
    const reste = line.split(NDA_MARKDOWN_TOKEN).join("");
    if (!ligneEntierementMention(reste)) {
      kept.push(removeTokenPhrases(line, NDA_MARKDOWN_TOKEN));
      continue;
    }
    // Ligne dédiée au NDA : elle part, avec UNE ligne vide adjacente.
    if (i + 1 < lines.length && lines[i + 1].trim().length === 0) i++;
    else if (kept.length > 0 && kept[kept.length - 1].trim().length === 0) kept.pop();
  }
  return kept.join("\n");
}

/**
 * Replace {{variable}} placeholders with actual data.
 */
export function renderTemplateHtml(
  templateBody: string,
  variables: Record<string, string>
): string {
  // NDA absent → la mention est retirée du gabarit AVANT substitution.
  const body = stripNdaFromTemplate(templateBody, variables.centre_nda);
  const rendered = body.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (varName in variables) return variables[varName];
    return ""; // Remove unknown variables in production render
  });
  return DOMPurify.sanitize(rendered, { ADD_ATTR: ["style"], ADD_TAGS: ["mark"] });
}

/**
 * Build variable data map for a contact + session + centre.
 */
export async function buildDocumentVariables(opts: {
  contactId?: string;
  sessionId?: string;
  extra?: Record<string, string>;
}): Promise<Record<string, string>> {
  const map: Record<string, string> = {
    date_jour: new Date().toLocaleDateString("fr-FR"),
  };

  // Fetch contact data
  if (opts.contactId) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", opts.contactId)
      .maybeSingle();
    if (contact) {
      map.nom = contact.nom || "";
      map.prenom = contact.prenom || "";
      map.email = contact.email || "";
      map.telephone = contact.telephone || "";
      map.civilite = contact.civilite || "";
      map.date_naissance = contact.date_naissance
        ? new Date(contact.date_naissance).toLocaleDateString("fr-FR")
        : "";
      map.adresse = [contact.rue, contact.code_postal, contact.ville]
        .filter(Boolean)
        .join(", ");
      map.ville = contact.ville || "";
      map.code_postal = contact.code_postal || "";
      map.rue = contact.rue || "";
      map.nom_naissance = (contact as any).nom_naissance || "";
      map.ville_naissance = contact.ville_naissance || "";
      map.pays_naissance = contact.pays_naissance || "";
    }
  }

  // Fetch session data
  if (opts.sessionId) {
    const { data: session } = await supabase
      .from("sessions")
      .select("*, formateurs:formateur_id(nom, prenom)")
      .eq("id", opts.sessionId)
      .maybeSingle();
    if (session) {
      map.session_nom = session.nom || "";
      map.session_date_debut = session.date_debut
        ? new Date(session.date_debut).toLocaleDateString("fr-FR")
        : "";
      map.session_date_fin = session.date_fin
        ? new Date(session.date_fin).toLocaleDateString("fr-FR")
        : "";
      map.duree_heures = String(session.duree_heures || "");
      map.formation_type = session.formation_type || "";
      map.horaires = (session as any).horaires || "";
      map.lieu = session.lieu || "";
      map.numero_session = (session as any).numero_session || "";
      const formateur = (session as any).formateurs;
      if (formateur) {
        map.formateur_nom = `${formateur.prenom || ""} ${formateur.nom || ""}`.trim();
      }
    }
  }

  // Always fetch centre info
  const { data: centre } = await supabase
    .from("centre_formation")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (centre) {
    map.centre_nom = centre.nom_commercial || centre.nom_legal || "";
    map.centre_nom_legal = centre.nom_legal || "";
    map.centre_nom_commercial = centre.nom_commercial || "";
    map.centre_siret = centre.siret || "";
    map.centre_nda = centre.nda || "";
    map.centre_adresse = centre.adresse_complete || "";
    map.centre_email = centre.email || "";
    map.centre_telephone = centre.telephone || "";
    map.centre_forme_juridique = centre.forme_juridique || "";
    map.centre_iban = centre.iban || "";
    map.centre_bic = centre.bic || "";
    map.centre_region = centre.region_declaration || "";
    map.responsable_nom = centre.responsable_legal_nom || "";
    map.responsable_fonction = centre.responsable_legal_fonction || "";
    map.centre_qualiopi_numero = centre.qualiopi_numero || "";
    map.centre_qualiopi_date = centre.qualiopi_date_obtention || "";
    map.centre_agrement = centre.agrement_prefecture || "";
    map.centre_agrement_date = centre.agrement_prefecture_date || "";
    map.centre_code_rncp = centre.code_rncp || "";
    map.centre_code_rs = centre.code_rs || "";
    if (!map.lieu) {
      map.lieu = centre.adresse_complete?.split(",").pop()?.trim() || "";
    }
  }

  // Merge extra variables
  if (opts.extra) {
    Object.assign(map, opts.extra);
  }

  return map;
}

/**
 * Open a print window with rendered HTML document for PDF export.
 */
export function printHtmlDocument(html: string, title: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // Fallback: download as HTML
    downloadHtmlDocument(html, title);
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { margin: 15mm 20mm; size: A4; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 18pt; margin-bottom: 12pt; }
    h2 { font-size: 14pt; margin-bottom: 8pt; }
    h3 { font-size: 12pt; margin-bottom: 6pt; }
    table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
    th, td { border: 1px solid #333; padding: 6pt 8pt; text-align: left; font-size: 10pt; }
    th { background-color: #f5f5f5; font-weight: bold; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${html}
  <script>
    setTimeout(() => { window.print(); }, 300);
  </script>
</body>
</html>`);
  printWindow.document.close();
}

/**
 * Download rendered HTML as an HTML file.
 */
export function downloadHtmlDocument(html: string, title: string): void {
  const fullHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;font-size:11pt;line-height:1.5;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #333;padding:6pt 8pt;}th{background:#f5f5f5;}</style></head><body>${html}</body></html>`;
  const blob = new Blob([fullHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
