/**
 * Calculs monétaires partagés — source de vérité unique.
 *
 * Audit du 13/08/2026 (archi P1) : « reste à encaisser » était recalculé
 * inline dans dix écrans avec deux formules divergentes — clampé à 0 ici,
 * pouvant devenir négatif là. Une facture en trop-perçu affichait donc
 * « −250 € restant » sur la fiche apprenant et « 0 € » dans la synthèse
 * de session. Ces helpers figent la règle : un reste dû n'est jamais négatif.
 */

type Montant = number | string | null | undefined;

const num = (v: Montant): number => {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? (n as number) : 0;
};

/** Somme des `montant` d'une liste (paiements, versements…), valeurs manquantes = 0. */
export function sommeMontants(items: ReadonlyArray<{ montant?: Montant }>): number {
  return items.reduce((s, p) => s + num(p.montant), 0);
}

/** Somme des `montant_total` d'une liste de factures, valeurs manquantes = 0. */
export function sommeFactures(items: ReadonlyArray<{ montant_total?: Montant }>): number {
  return items.reduce((s, f) => s + num(f.montant_total), 0);
}

/**
 * Reste à encaisser = facturé − payé, jamais négatif : un trop-perçu se
 * traite comme un avoir, pas comme un « reste » négatif dans les totaux.
 */
export function calculerResteAEncaisser(totalFacture: Montant, totalPaye: Montant): number {
  return Math.max(0, num(totalFacture) - num(totalPaye));
}
