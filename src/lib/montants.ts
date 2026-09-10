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

interface FactureLigne {
  id?: string | null;
  montant_total?: Montant;
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
    (s, f) => s + Math.max(0, num(f.montant_total) - (f.id ? paye.get(f.id) ?? 0 : 0)),
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
    (s, f) => s + Math.max(0, (f.id ? paye.get(f.id) ?? 0 : 0) - num(f.montant_total)),
    0,
  );
}
