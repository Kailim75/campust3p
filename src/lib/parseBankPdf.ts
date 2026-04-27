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

type TxInput = Omit<TransactionBancaire, "id" | "created_at" | "rapproche">;

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
// Montant FR : 1 234,56 / 1234,56 / -12,00 / 12,00- / +12,00 (signes pré/suffixe)
const AMOUNT_TOKEN_RE = /^[+-]?\d{1,3}(?:[ \u00A0]\d{3})*,\d{2}[+-]?$/;
const AMOUNT_INLINE_RE = /[+-]?\d{1,3}(?:[ \u00A0]\d{3})*,\d{2}[+-]?/g;

function normalizeDate(d: string): string | null {
  const m = d.match(DATE_RE) ?? d.match(/(\d{2})[./-](\d{2})[./-](\d{2,4})/);
  if (!m) return null;
  let [, dd, mm, yy] = m;
  if (yy.length === 2) yy = (parseInt(yy, 10) > 50 ? "19" : "20") + yy;
  return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseAmount(s: string): number {
  const trailingMinus = s.endsWith("-");
  const trailingPlus = s.endsWith("+");
  const leadingMinus = s.startsWith("-");
  const leadingPlus = s.startsWith("+");
  const cleaned = s
    .replace(/^[+-]/, "")
    .replace(/[+-]$/, "")
    .replace(/[ \u00A0]/g, "")
    .replace(",", ".");
  const v = parseFloat(cleaned);
  if (isNaN(v)) return NaN;
  const negative = trailingMinus || leadingMinus;
  return negative ? -Math.abs(v) : v;
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

  // Variantes courantes en français selon les banques
  const DEBIT_HEADER = /^(d[ée]bits?|retraits?|sorties?|d[ée]penses?|paiements?)$/;
  const CREDIT_HEADER = /^(cr[ée]dits?|d[ée]p[oô]ts?|entr[ée]es?|recettes?|encaissements?|versements?)$/;
  const AMOUNT_HEADER = /^(montant(s)?(\s*\(?eur\)?)?|somme(s)?)$/;

  for (const it of items) {
    const s = it.str.toLowerCase().trim();
    const cx = it.x + it.width / 2;
    if (debitX === null && DEBIT_HEADER.test(s)) debitX = cx;
    else if (creditX === null && CREDIT_HEADER.test(s)) creditX = cx;
    else if (amountX === null && AMOUNT_HEADER.test(s)) amountX = cx;
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
  /(pr[ée]l[èe]vement|prlv|paiement\s*(par)?\s*carte|paiement\s*cb|cb\s|carte\s+\d|achat\s*cb|achat\s+carte|virement\s*[ée]mis|vir\.?\s*[ée]mis|vir\.?\s*sepa\s*[ée]mis|frais|commission|cotisation|agios|interets\s*d[ée]biteurs|retrait\s*dab|retrait\s*esp|retrait|cheque\s*[ée]mis|chq\s*[ée]mis|chq\s+\d|remboursement\s*pr[êe]t|[ée]ch[ée]ance\s*pr[êe]t|abonnement|facture)/i;
const CREDIT_KEYWORDS =
  /(virement\s*re[çc]u|vir\.?\s*re[çc]u|vir\.?\s*sepa\s*re[çc]u|remise\s*(de\s*)?ch[èe]que|remise\s*ch[èe]que|remise\s*esp[èe]ces?|versement|encaissement|recu\s*de|de\s*la\s*part\s*de|salaire|paie|allocation|caf|remboursement\s*re[çc]u)/i;

/**
 * Détecte si une ligne contient un solde (à exclure du montant de transaction).
 */
const SOLDE_RE = /(solde|nouveau\s*solde|ancien\s*solde|solde\s*pr[ée]c[ée]dent|total)/i;

/**
 * Parse un relevé bancaire PDF.
 * Stratégie de détection débit/crédit (par ordre de priorité) :
 * 1. Colonnes Débit/Crédit détectées via en-tête → assignation par position x
 * 2. Si 2 montants dans la ligne (transaction + solde) : on prend l'avant-dernier
 *    et on déduit le signe via les mots-clés ou la position relative
 * 3. Heuristique mots-clés (DEBIT_KEYWORDS / CREDIT_KEYWORDS)
 * 4. Signe explicite dans le token (+/-)
 */
export async function parseBankPdf(file: File): Promise<TxInput[]> {
  const pages = await extractPages(file);
  const txs: TxInput[] = [];

  for (const page of pages) {
    const rows = groupRows(page.items);

    let lastTx: TxInput | null = null;

    for (const row of rows) {
      const dateTokens = row.filter((it) => DATE_RE.test(it.str.trim()));
      const amountTokens = row.filter((it) => AMOUNT_TOKEN_RE.test(it.str.trim()));
      const rowText = row.map((i) => i.str).join(" ");

      if (dateTokens.length === 0) {
        if (lastTx && amountTokens.length === 0) {
          const extra = rowText.replace(/\s+/g, " ").trim();
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

      // Ignorer les lignes de solde
      if (SOLDE_RE.test(rowText)) {
        lastTx = null;
        continue;
      }

      const dateOp = normalizeDate(dateTokens[0].str.trim());
      if (!dateOp) {
        lastTx = null;
        continue;
      }
      const dateVal = dateTokens[1] ? normalizeDate(dateTokens[1].str.trim()) : null;

      // Calcul du montant signé
      let montant: number | null = null;
      const textLower = rowText.toLowerCase();
      const isDebitKw = DEBIT_KEYWORDS.test(textLower);
      const isCreditKw = CREDIT_KEYWORDS.test(textLower);

      // 1. Colonnes Débit / Crédit détectées
      if (page.debitX !== null || page.creditX !== null) {
        const debit = page.debitX !== null ? findAmountInColumn(row, page.debitX) : null;
        const credit = page.creditX !== null ? findAmountInColumn(row, page.creditX) : null;
        if (credit !== null && credit !== 0) montant = Math.abs(credit);
        else if (debit !== null && debit !== 0) montant = -Math.abs(debit);
      } else if (page.amountX !== null) {
        const m = findAmountInColumn(row, page.amountX);
        if (m !== null) {
          montant = m;
          // Si valeur absolue mais mots-clés clairs → réajuste le signe
          if (montant > 0 && isDebitKw && !isCreditKw) montant = -montant;
          else if (montant < 0 && isCreditKw && !isDebitKw) montant = Math.abs(montant);
        }
      }

      // 2. Fallback : analyse des montants présents dans la ligne
      if (montant === null) {
        // Si ≥ 2 montants : le dernier est généralement le solde, l'avant-dernier la transaction
        const txTokenStr =
          amountTokens.length >= 2
            ? amountTokens[amountTokens.length - 2].str.trim()
            : amountTokens[amountTokens.length - 1].str.trim();
        let raw = parseAmount(txTokenStr);

        if (!isNaN(raw)) {
          // Signe déjà explicite dans le token → on garde
          const explicitSign = /^[+-]|[+-]$/.test(txTokenStr);
          if (!explicitSign) {
            // Pas de signe explicite : on déduit via mots-clés
            if (isDebitKw && !isCreditKw) raw = -Math.abs(raw);
            else if (isCreditKw && !isDebitKw) raw = Math.abs(raw);
            else {
              // Aucun indice : on regarde la variation du solde si dispo
              if (amountTokens.length >= 2 && lastTx) {
                const newSolde = parseAmount(amountTokens[amountTokens.length - 1].str.trim());
                // À défaut d'autre info, on suppose un débit (cas le plus fréquent en relevé)
                if (!isNaN(newSolde)) raw = -Math.abs(raw);
                else raw = -Math.abs(raw);
              } else {
                raw = -Math.abs(raw);
              }
            }
          }
          montant = raw;
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
      };

      txs.push(tx);
      lastTx = tx;
    }
  }

  return txs;
}
