/**
 * Commissions Alma — coût marchand par nombre d'échéances.
 *
 * Taux MESURÉS le 12/08/2026 sur les ventes réelles du compte marchand
 * « Drop academy montrouge » (dashboard.getalma.eu, détail des ventes) :
 *   P1X : 1,62 € sur 150 €   → 1,08 % TTC (0,90 % HT)
 *   P2X : 10,80 € sur 250 €  → 4,32 % TTC (3,60 % HT)
 *   P3X : 33,74 € sur 740 €  → 4,56 % TTC (3,80 % HT)
 *   P4X : 57,02 € sur 990 €  → 5,76 % TTC (4,80 % HT)
 * Proportionnalité vérifiée sur deux montants en P4X (800 € → 46,08 € et
 * 990 € → 57,02 €) : pas de part fixe. Les frais sont intégralement à la
 * charge du marchand (« frais client : 0 € » sur toutes les ventes).
 *
 * On travaille en TTC : la formation est exonérée de TVA (art. 261), la
 * TVA sur les frais Alma n'est donc pas récupérée — le TTC est le coût
 * réel qui sort du compte. Si le contrat Alma est renégocié, ce fichier
 * est LA seule source de vérité à mettre à jour.
 */

export const TAUX_ALMA_TTC: Record<number, number> = {
  1: 0.0108,
  2: 0.0432,
  3: 0.0456,
  4: 0.0576,
};

/**
 * Paiements Alma saisis à la main sans nombre de fois connu : on applique
 * le taux du 4x (décision du directeur, 12/08/2026) et on marque
 * l'estimation.
 */
export const NB_FOIS_PAR_DEFAUT = 4;

export interface CommissionAlma {
  /** Nombre d'échéances retenu pour le calcul. */
  nbFois: number;
  /** Taux TTC appliqué (ex. 0.0576). */
  taux: number;
  /** Commission en euros, arrondie au centime. */
  commission: number;
  /** Montant net réellement perçu. */
  net: number;
  /** true si le nombre de fois n'était pas enregistré (taux par défaut). */
  estime: boolean;
}

/**
 * Retrouve le nombre d'échéances dans le commentaire d'un paiement.
 * Les trois écritures automatiques (webhook, réconciliation manuelle,
 * cron) écrivent toutes « … Nx … » ; les saisies manuelles ne le font
 * pas forcément.
 */
export function extraireNbFois(commentaires: string | null | undefined): number | null {
  if (!commentaires) return null;
  const m = commentaires.match(/(\d+)\s*[x×]/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n in TAUX_ALMA_TTC ? n : null;
}

export function commissionAlma(montant: number, nbFois: number): Omit<CommissionAlma, "estime"> {
  const taux = TAUX_ALMA_TTC[nbFois] ?? TAUX_ALMA_TTC[NB_FOIS_PAR_DEFAUT];
  const commission = Math.round(montant * taux * 100) / 100;
  return { nbFois, taux, commission, net: Math.round((montant - commission) * 100) / 100 };
}

export interface PaiementPourCommission {
  mode_paiement: string;
  montant: number;
  commentaires?: string | null;
}

/**
 * Commission d'un paiement tel qu'il sort de la base. Retourne null pour
 * tout mode autre qu'Alma : les autres moyens de paiement n'ont pas de
 * commission suivie ici.
 */
export function commissionPourPaiement(paiement: PaiementPourCommission): CommissionAlma | null {
  if (paiement.mode_paiement !== "alma") return null;
  const trouve = extraireNbFois(paiement.commentaires);
  const nbFois = trouve ?? NB_FOIS_PAR_DEFAUT;
  return { ...commissionAlma(Number(paiement.montant) || 0, nbFois), estime: trouve === null };
}

/**
 * Total des commissions Alma d'un lot de paiements — pour les KPI
 * « net réellement encaissé » du cockpit. Les paiements non-Alma pèsent 0.
 */
export function totalCommissionsAlma(paiements: PaiementPourCommission[]): {
  total: number;
  nbPaiementsAlma: number;
  nbEstimes: number;
} {
  let total = 0;
  let nbPaiementsAlma = 0;
  let nbEstimes = 0;
  for (const p of paiements) {
    const c = commissionPourPaiement(p);
    if (!c) continue;
    total += c.commission;
    nbPaiementsAlma += 1;
    if (c.estime) nbEstimes += 1;
  }
  return { total: Math.round(total * 100) / 100, nbPaiementsAlma, nbEstimes };
}

/** Libellé court pour l'UI : « 4,56 % (3x) ». */
export function libelleTaux(nbFois: number): string {
  const taux = TAUX_ALMA_TTC[nbFois];
  if (taux === undefined) return "";
  return `${(taux * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} % (${nbFois}x)`;
}
