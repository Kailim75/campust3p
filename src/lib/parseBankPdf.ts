// Parser PDF de relevé bancaire (BNP, et formats similaires)
// Extrait le texte via pdfjs-dist puis détecte les lignes de transactions
import * as pdfjsLib from "pdfjs-dist";
// Worker via CDN pour éviter la config Vite
// @ts-ignore
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

import type { TransactionBancaire } from "@/hooks/useTresorerie";

type TxInput = Omit<TransactionBancaire, "id" | "created_at" | "rapproche">;

/**
 * Extrait toutes les lignes texte d'un PDF, en regroupant par ligne (même y).
 */
async function extractLines(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const allLines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Regroupement par y arrondi
    const rows: Record<number, { x: number; str: string }[]> = {};
    for (const item of content.items as any[]) {
      if (!("str" in item) || !item.str) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x, str: item.str });
    }

    const ys = Object.keys(rows)
      .map(Number)
      .sort((a, b) => b - a); // top->bottom

    for (const y of ys) {
      const line = rows[y]
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) allLines.push(line);
    }
  }

  return allLines;
}

// Date dd/mm/yyyy ou dd.mm.yyyy ou dd/mm/yy
const DATE_RE = /(\d{2})[./](\d{2})[./](\d{2,4})/;
// Montant français: 1 234,56 ou 1234,56 ou -12,00
const AMOUNT_RE = /(-?\d{1,3}(?:[ \u00A0]\d{3})*,\d{2})/g;

function normalizeDate(d: string): string | null {
  const m = d.match(DATE_RE);
  if (!m) return null;
  let [, dd, mm, yy] = m;
  if (yy.length === 2) yy = (parseInt(yy, 10) > 50 ? "19" : "20") + yy;
  return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/[ \u00A0]/g, "").replace(",", "."));
}

/**
 * Parse un relevé bancaire PDF (BNP et formats compatibles).
 * Heuristique : une transaction = ligne contenant 1 date + au moins 1 montant.
 * Si 2 montants sont trouvés (débit + crédit dans des colonnes), on prend le bon.
 */
export async function parseBankPdf(file: File): Promise<TxInput[]> {
  const lines = await extractLines(file);
  const txs: TxInput[] = [];

  // Détection heuristique : une ligne BNP commence souvent par 2 dates (opé + valeur)
  // suivies du libellé puis du montant en fin de ligne.
  for (const line of lines) {
    const dateMatches = [...line.matchAll(new RegExp(DATE_RE, "g"))];
    if (dateMatches.length === 0) continue;

    const amountMatches = [...line.matchAll(AMOUNT_RE)];
    if (amountMatches.length === 0) continue;

    const dateOp = normalizeDate(dateMatches[0][0]);
    if (!dateOp) continue;
    const dateVal = dateMatches[1] ? normalizeDate(dateMatches[1][0]) : null;

    // Le montant pertinent = dernier montant de la ligne (souvent en fin de ligne)
    // On regarde aussi le signe : si le dernier est positif et qu'il y en a 2, on
    // suppose colonne débit/crédit -> on prend le dernier.
    const last = amountMatches[amountMatches.length - 1][0];
    let montant = parseAmount(last);

    // Détection débit/crédit par mot-clé dans le libellé
    const lower = line.toLowerCase();
    const isDebit = /(prelevement|prlv|paiement carte|cb |achat cb|virement emis|frais|cotisation|retrait)/i.test(
      lower,
    );
    const isCredit = /(virement recu|vir recu|remise|versement|credit)/i.test(lower);

    if (montant > 0 && isDebit && !isCredit) montant = -montant;
    if (montant < 0 && isCredit && !isDebit) montant = Math.abs(montant);

    if (isNaN(montant) || montant === 0) continue;

    // Libellé = ligne moins les dates et le montant
    let libelle = line;
    for (const m of dateMatches) libelle = libelle.replace(m[0], "");
    for (const m of amountMatches) libelle = libelle.replace(m[0], "");
    libelle = libelle.replace(/\s+/g, " ").trim();
    if (!libelle) libelle = "Transaction";

    txs.push({
      date_operation: dateOp,
      date_valeur: dateVal,
      libelle: libelle.slice(0, 500),
      montant,
      type_operation: montant > 0 ? "credit" : "debit",
      categorie: null,
      reference_bancaire: null,
      banque: "BNP",
      compte: null,
      facture_id: null,
      paiement_id: null,
      charge_id: null,
      notes: null,
      import_batch_id: null,
    });
  }

  return txs;
}
