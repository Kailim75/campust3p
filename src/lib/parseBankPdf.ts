// Parser PDF de relevé bancaire (BNP, LCL, CA, SG, etc.)
// Stratégie : on lit les éléments texte avec leurs positions (x, y), on reconstruit
// les lignes par regroupement vertical, puis on détecte les colonnes Débit/Crédit
// à partir de l'en-tête. Le libellé est ce qui reste après extraction des dates,
// montants et numéros de pièce.
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore — Vite résout en URL
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

import type { TransactionBancaire } from "@/hooks/useTresorerie";

export type SignSource =
  | "column" // signe issu de la colonne Débit/Crédit détectée
  | "explicit" // signe explicite dans le token (ex: -12,00 ou 12,00-)
  | "keyword" // déduit via mots-clés (prélèvement, virement reçu, etc.)
  | "amount-column" // colonne Montant unique signée
  | "fallback"; // dernier montant + aucun indice → signe brut

type TxInput = Omit<TransactionBancaire, "id" | "created_at" | "rapproche"> & {
  _signSource?: SignSource;
};

interface TextItem {
  x: number;
  y: number;
  width: number;
  str: string;
}

interface PageData {
  items: TextItem[];
  // Bandes verticales détectées : [debit, credit] (x du centre de la colonne)
  debitX: number | null;
  creditX: number | null;
  amountX: number | null; // colonne montant unique (signée)
}

// ── Regex utilitaires ───────────────────────────────────────────────────────
const DATE_RE = /^(\d{2})[./-](\d{2})[./-](\d{2,4})$/;
const DATE_INLINE_RE = /(\d{2})[./-](\d{2})[./-](\d{2,4})/g;
// Montant FR : 1 234,56 / 1234,56 / -12,00 / 12,00- (signe en suffixe LCL)
const AMOUNT_TOKEN_RE = /^-?\d{1,3}(?:[ \u00A0]\d{3})*,\d{2}-?$/;
const AMOUNT_INLINE_RE = /-?\d{1,3}(?:[ \u00A0]\d{3})*,\d{2}-?/g;

function normalizeDate(d: string): string | null {
  const m = d.match(DATE_RE) ?? d.match(/(\d{2})[./-](\d{2})[./-](\d{2,4})/);
  if (!m) return null;
  let [, dd, mm, yy] = m;
  if (yy.length === 2) yy = (parseInt(yy, 10) > 50 ? "19" : "20") + yy;
  return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseAmount(s: string): number {
  const trailingMinus = s.endsWith("-");
  const cleaned = s.replace(/-$/, "").replace(/[ \u00A0]/g, "").replace(",", ".");
  const v = parseFloat(cleaned);
  if (isNaN(v)) return NaN;
  return trailingMinus ? -v : v;
}

// ── Extraction texte avec coordonnées ───────────────────────────────────────
async function extractPages(file: File): Promise<PageData[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: PageData[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    const items: TextItem[] = [];
    for (const it of content.items as any[]) {
      if (!("str" in it) || !it.str || !it.str.trim()) continue;
      items.push({
        x: it.transform[4],
        y: Math.round(it.transform[5]),
        width: it.width || 0,
        str: it.str,
      });
    }

    pages.push({ items, ...detectColumns(items) });
  }

  return pdf.numPages > 0 ? pages : [];
}

/**
 * Détecte les colonnes Débit / Crédit / Montant à partir des en-têtes textuels.
 * Retourne le centre x des colonnes ou null si non détectées.
 */
function detectColumns(items: TextItem[]): {
  debitX: number | null;
  creditX: number | null;
  amountX: number | null;
} {
  let debitX: number | null = null;
  let creditX: number | null = null;
  let amountX: number | null = null;

  for (const it of items) {
    const s = it.str.toLowerCase().trim();
    const cx = it.x + it.width / 2;
    if (debitX === null && /^d[ée]bit$/.test(s)) debitX = cx;
    else if (creditX === null && /^cr[ée]dit$/.test(s)) creditX = cx;
    else if (amountX === null && /^montant(s)?(\s*\(?eur\)?)?$/.test(s)) amountX = cx;
  }

  return { debitX, creditX, amountX };
}

// ── Reconstruction des lignes ───────────────────────────────────────────────
/**
 * Regroupe les items par bande verticale (tolérance 3px) et trie par x.
 */
function groupRows(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextItem[][] = [];
  const TOLERANCE = 3;

  for (const it of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= TOLERANCE) {
      last.push(it);
    } else {
      rows.push([it]);
    }
  }
  // Tri intra-ligne par x
  rows.forEach((r) => r.sort((a, b) => a.x - b.x));
  return rows;
}

/**
 * Détecte un montant placé sous une colonne donnée (tolérance horizontale).
 */
function findAmountInColumn(row: TextItem[], colX: number, tolerance = 60): number | null {
  let best: { item: TextItem; dist: number } | null = null;
  for (const it of row) {
    if (!AMOUNT_TOKEN_RE.test(it.str.trim())) continue;
    const cx = it.x + it.width / 2;
    const dist = Math.abs(cx - colX);
    if (dist > tolerance) continue;
    if (!best || dist < best.dist) best = { item: it, dist };
  }
  if (!best) return null;
  const v = parseAmount(best.item.str.trim());
  return isNaN(v) ? null : v;
}

// Mots-clés indiquant le type d'opération (fallback si pas de colonnes)
const DEBIT_KEYWORDS =
  /(prelevement|prlv|paiement carte|cb |achat cb|virement emis|vir emis|frais|cotisation|retrait dab|retrait|cheque emis|chq)/i;
const CREDIT_KEYWORDS =
  /(virement recu|vir recu|vir\.? recu|remise|versement|credit|encaissement|recu de)/i;

/**
 * Parse un relevé bancaire PDF.
 * - Détecte d'abord les colonnes Débit/Crédit via en-tête → assignation fiable du signe.
 * - Sinon, fallback : dernier montant + heuristique de mots-clés sur le libellé.
 * - Multi-lignes : si une ligne n'a pas de date mais que la précédente est une transaction,
 *   on l'ajoute au libellé (continuation).
 */
export async function parseBankPdf(file: File): Promise<TxInput[]> {
  const pages = await extractPages(file);
  const txs: TxInput[] = [];

  for (const page of pages) {
    const rows = groupRows(page.items);

    let lastTx: TxInput | null = null;

    for (const row of rows) {
      // Détection d'une ligne de transaction = au moins 1 token date au début
      const dateTokens = row.filter((it) => DATE_RE.test(it.str.trim()));
      const amountTokens = row.filter((it) => AMOUNT_TOKEN_RE.test(it.str.trim()));

      if (dateTokens.length === 0) {
        // Ligne sans date : potentielle continuation de libellé
        if (lastTx && amountTokens.length === 0) {
          const extra = row
            .map((it) => it.str.trim())
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          // On ignore les lignes manifestement non-libellé (ex: numéros de page)
          if (extra && extra.length > 2 && !/^page\s+\d+/i.test(extra)) {
            lastTx.libelle = `${lastTx.libelle} ${extra}`.slice(0, 500);
          }
        }
        continue;
      }

      if (amountTokens.length === 0) {
        lastTx = null;
        continue;
      }

      const dateOp = normalizeDate(dateTokens[0].str.trim());
      if (!dateOp) {
        lastTx = null;
        continue;
      }
      const dateVal = dateTokens[1] ? normalizeDate(dateTokens[1].str.trim()) : null;

      // Calcul du montant signé + traçabilité de l'origine du signe
      let montant: number | null = null;
      let signSource: SignSource = "fallback";

      if (page.debitX !== null || page.creditX !== null) {
        const debit = page.debitX !== null ? findAmountInColumn(row, page.debitX) : null;
        const credit = page.creditX !== null ? findAmountInColumn(row, page.creditX) : null;
        if (credit !== null && credit !== 0) {
          montant = Math.abs(credit);
          signSource = "column";
        } else if (debit !== null && debit !== 0) {
          montant = -Math.abs(debit);
          signSource = "column";
        }
      } else if (page.amountX !== null) {
        const m = findAmountInColumn(row, page.amountX);
        if (m !== null) {
          montant = m;
          signSource = "amount-column";
        }
      }

      // Fallback : dernier montant de la ligne + heuristique mots-clés
      if (montant === null) {
        const lastRaw = amountTokens[amountTokens.length - 1].str.trim();
        montant = parseAmount(lastRaw);
        const hasExplicitSign = /^-/.test(lastRaw) || /-$/.test(lastRaw);
        const text = row.map((i) => i.str).join(" ").toLowerCase();
        const isDebit = DEBIT_KEYWORDS.test(text);
        const isCredit = CREDIT_KEYWORDS.test(text);
        if (hasExplicitSign) {
          signSource = "explicit";
        } else if (montant > 0 && isDebit && !isCredit) {
          montant = -montant;
          signSource = "keyword";
        } else if (montant < 0 && isCredit && !isDebit) {
          montant = Math.abs(montant);
          signSource = "keyword";
        } else if (isDebit || isCredit) {
          signSource = "keyword";
        } else {
          signSource = "fallback";
        }
      }

      if (montant === null || isNaN(montant) || montant === 0) {
        lastTx = null;
        continue;
      }

      // Libellé = items qui ne sont ni dates, ni montants, ni numéros pure
      const dateStrs = new Set(dateTokens.map((t) => t.str.trim()));
      const amountStrs = new Set(amountTokens.map((t) => t.str.trim()));
      const libelleParts = row
        .filter((it) => {
          const s = it.str.trim();
          if (dateStrs.has(s) || amountStrs.has(s)) return false;
          // Filtre : tokens qui sont uniquement des chiffres/espaces courts (codes pièce courts)
          // mais on garde les références alphanumériques
          return s.length > 0;
        })
        .map((it) => it.str.trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const libelle = libelleParts || "Transaction";

      // Tentative d'extraction d'une référence (ex: "REF: 12345" ou suite chiffres ≥6)
      const refMatch = libelle.match(/\b([A-Z0-9]{6,})\b/);
      const reference_bancaire = refMatch ? refMatch[1] : null;

      const tx: TxInput = {
        date_operation: dateOp,
        date_valeur: dateVal,
        libelle: libelle.slice(0, 500),
        montant: Number(montant.toFixed(2)),
        type_operation: montant > 0 ? "credit" : "debit",
        categorie: null,
        reference_bancaire,
        banque: "BNP",
        compte: null,
        facture_id: null,
        paiement_id: null,
        charge_id: null,
        notes: null,
        import_batch_id: null,
        _signSource: signSource,
      };

      txs.push(tx);
      lastTx = tx;
    }
  }

  return txs;
}
