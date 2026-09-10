/**
 * Calculs monétaires partagés — source de vérité unique.
 *
 * Audit du 13/08/2026 (archi P1) : « reste à encaisser » était recalculé
 * inline dans dix écrans avec deux formules divergentes — clampé à 0 ici,
 * pouvant devenir négatif là. Une facture en trop-perçu affichait donc
 * « −250 € restant » sur la fiche apprenant et « 0 € » dans la synthèse
 * de session. Ces helpers figent la règle : un reste dû n'est jamais négatif.
 */

import type { Database } from "@/integrations/supabase/types";

type FactureStatut = Database["public"]["Enums"]["facture_statut"];

/**
 * Statuts qui ne comptent NI dans le total facturé NI dans le reste à
 * encaisser : un brouillon n'est pas encore dû, une annulée ne l'est plus.
 *
 * Règle unique du CRM (revue du 10/09/2026) : la fiche session, le tableau
 * de bord et Finances filtraient déjà ces deux statuts, la fiche apprenant
 * non — le même apprenant affichait deux « reste à encaisser » différents
 * selon l'écran ouvert. Typée sur l'enum Postgres : si un statut change
 * côté base, la compilation casse ici plutôt qu'en silence à l'écran.
 */
export const STATUTS_FACTURE_EXCLUS: readonly FactureStatut[] = ["brouillon", "annulee"];

const EXCLUS = new Set<string>(STATUTS_FACTURE_EXCLUS);

/**
 * Cette facture compte-t-elle dans les totaux ?
 * Un statut absent compte : les écrans qui ne sélectionnent pas la colonne
 * gardent leur comportement d'origine.
 */
export function estFactureComptee(facture: { statut?: string | null }): boolean {
  return !facture.statut || !EXCLUS.has(facture.statut);
}

type Montant = number | string | null | undefined;

const num = (v: Montant): number => {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? (n as number) : 0;
};

/**
 * Montant saisi dans un champ `type="number"` → nombre exploitable, ou
 * `null` si ce n'est pas un montant strictement positif.
 *
 * La contrainte serveur `CHECK (montant > 0)` refuse 0 et les négatifs :
 * sans ce filtre la saisie part jusqu'à Postgres pour revenir en erreur.
 * La virgule est acceptée (Chrome en locale FR la laisse passer telle quelle).
 */
export function parseMontantSaisi(valeur: string): number | null {
  const n = Number.parseFloat(valeur.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Somme des `montant` d'une liste (paiements, versements…), valeurs manquantes = 0. */
export function sommeMontants(items: ReadonlyArray<{ montant?: Montant }>): number {
  return items.reduce((s, p) => s + num(p.montant), 0);
}

/** Somme des `montant_total` des factures comptées, valeurs manquantes = 0. */
export function sommeFactures(
  items: ReadonlyArray<{ montant_total?: Montant; statut?: string | null }>,
): number {
  return items.reduce((s, f) => (estFactureComptee(f) ? s + num(f.montant_total) : s), 0);
}

/**
 * Reste à encaisser = facturé − payé, jamais négatif : un trop-perçu se
 * traite comme un avoir, pas comme un « reste » négatif dans les totaux.
 */
export function calculerResteAEncaisser(totalFacture: Montant, totalPaye: Montant): number {
  return Math.max(0, num(totalFacture) - num(totalPaye));
}

interface FactureLigne {
  id?: string | null;
  montant_total?: Montant;
  statut?: string | null;
}

interface PaiementLigne {
  facture_id?: string | null;
  montant?: Montant;
}

/** Total versé sur chaque facture ; les versements sans facture sont ignorés. */
function payeParFacture(paiements: ReadonlyArray<PaiementLigne>): Map<string, number> {
  const parFacture = new Map<string, number>();
  for (const p of paiements) {
    if (!p.facture_id) continue;
    parFacture.set(p.facture_id, (parFacture.get(p.facture_id) ?? 0) + num(p.montant));
  }
  return parFacture;
}

/**
 * Total encaissé sur les factures comptées : un versement rattaché à un
 * brouillon ou à une facture annulée est exclu, comme la facture elle-même
 * — sinon le « payé » dépasse le « facturé » sur la fiche apprenant.
 */
export function sommePaiementsFactures(
  factures: ReadonlyArray<FactureLigne>,
  paiements: ReadonlyArray<PaiementLigne>,
): number {
  const paye = payeParFacture(paiements);
  return factures.reduce(
    (s, f) => (estFactureComptee(f) && f.id ? s + (paye.get(f.id) ?? 0) : s),
    0,
  );
}

/**
 * Reste à encaisser d'un lot de factures, calculé FACTURE PAR FACTURE :
 * un trop-perçu sur l'une ne doit jamais masquer un impayé sur l'autre
 * (c'est la granularité utilisée en fiche session, au tableau de bord,
 * dans Finances et sur les PDF).
 */
export function resteAEncaisserParFacture(
  factures: ReadonlyArray<FactureLigne>,
  paiements: ReadonlyArray<PaiementLigne>,
): number {
  const paye = payeParFacture(paiements);
  return factures.reduce(
    (s, f) =>
      estFactureComptee(f)
        ? s + Math.max(0, num(f.montant_total) - (f.id ? paye.get(f.id) ?? 0 : 0))
        : s,
    0,
  );
}

/** Somme des excédents encaissés (argent dû au client, à rembourser ou à passer en avoir). */
export function tropPercu(
  factures: ReadonlyArray<FactureLigne>,
  paiements: ReadonlyArray<PaiementLigne>,
): number {
  const paye = payeParFacture(paiements);
  return factures.reduce(
    (s, f) =>
      estFactureComptee(f)
        ? s + Math.max(0, (f.id ? paye.get(f.id) ?? 0 : 0) - num(f.montant_total))
        : s,
    0,
  );
}
