/**
 * Calculs monétaires partagés — SOURCE UNIQUE des statuts de facture.
 *
 * Audit du 13/08/2026 (archi P1) : « reste à encaisser » était recalculé
 * inline dans dix écrans avec deux formules divergentes — clampé à 0 ici,
 * pouvant devenir négatif là. Une facture en trop-perçu affichait donc
 * « −250 € restant » sur la fiche apprenant et « 0 € » dans la synthèse
 * de session. Ces helpers figent la règle : un reste dû n'est jamais négatif.
 *
 * Lot du 11/09/2026 (point M1) : les écrans qui calculaient un total d'argent
 * en énumérant les statuts à leur main passent par ces helpers —
 * `filtreFacturesComptees` côté SQL, `estFactureComptee` / `sommeFactures` /
 * `sommePaiementsFactures` côté JS. Effet visible : « Aujourd'hui » ne propose
 * plus de relancer un apprenant dont la fiche affiche « Soldé ».
 *
 * ⚠️ TROIS AVERTISSEMENTS, et AUCUN INVENTAIRE.
 *
 * 1. UNE LISTE BLANCHE N'EST PAS FORCÉMENT UN OUBLI. Beaucoup de
 *    `.in("statut", […])` du projet désignent un ÉTAT métier — « facture due,
 *    à relancer », « en retard », « en attente » — et NON l'assiette d'un
 *    total. Les aligner sur le prédicat partagé ferait entrer les factures
 *    `payee` : elles deviendraient des alertes de paiement, et le directeur
 *    recevrait des relances sur des apprenants soldés. Avant de convertir une
 *    liste blanche, demande-toi si elle nourrit une SOMME ou une SÉLECTION.
 *    Seules les sommes relèvent de ces helpers.
 *
 * 2. LE TAUX DE RECOUVREMENT PEUT DÉPASSER 100 %, et c'est voulu.
 *    `sommePaiementsFactures` additionne l'encaissé réel de chaque facture
 *    comptée SANS le borner à son montant, alors que `sommeFactures` borne le
 *    dénominateur : 600 € facturés encaissés 650 € donnent 108 %. « Encaissé »
 *    doit rester l'argent reçu ; le trop-perçu se lit avec `tropPercu()`.
 *
 * 3. NE PAS ÉCRIRE ICI D'INVENTAIRE DE « CE QUI RESTE À FAIRE ». Quatre
 *    versions successives de cet en-tête en ont contenu un ; les quatre ont
 *    été prises en défaut par la relecture — modules accusés à tort, modules
 *    oubliés, comptes faux, garantie que le code ne tenait pas. Un dépôt de
 *    cette taille compte des dizaines de chaînes de requêtes touchant à
 *    l'argent : un recensement rédigé à la main est faux le lendemain, et un
 *    en-tête faux est plus nuisible qu'un en-tête muet — il envoie le suivant
 *    « corriger » du code correct. L'état réel se constate en ratissant le
 *    dépôt, en distinguant la TABLE visée (plusieurs `.neq("statut","annulee")`
 *    portent sur `sessions` ou `cartes_professionnelles`) et la nature de la
 *    requête (lecture ou écriture). Le suivi du chantier vit dans
 *    `docs/audit/ROADMAP.md`, où il peut être daté et corrigé.
 */

import type { Database } from "@/integrations/supabase/types";

type FactureStatut = Database["public"]["Enums"]["facture_statut"];

/**
 * Statuts qui ne comptent NI dans le total facturé NI dans le reste à
 * encaisser : un brouillon n'est pas encore dû, une annulée ne l'est plus.
 *
 * Revue du 10/09/2026 : la fiche session et Finances filtraient déjà ces deux
 * statuts, la fiche apprenant non — le même apprenant affichait deux « reste à
 * encaisser » différents selon l'écran ouvert. Typée sur l'enum Postgres : si
 * un statut change côté base, la compilation casse ici plutôt qu'en silence à
 * l'écran.
 *
 * Portée : cette liste dit ce qui est EXCLU d'un total. Elle ne dit pas que
 * tout le dépôt s'y conforme — certains écrans gardent volontairement leur
 * propre convention (relances, retards, vue « compte en banque »). Voir les
 * trois avertissements en tête de fichier avant d'en aligner un.
 */
export const STATUTS_FACTURE_EXCLUS: readonly FactureStatut[] = ["brouillon", "annulee"];

const EXCLUS = new Set<string>(STATUTS_FACTURE_EXCLUS);

/**
 * La même liste, au format attendu par un `IN (…)` PostgREST.
 * Construite DEPUIS `STATUTS_FACTURE_EXCLUS` : la liste des statuts n'est
 * écrite qu'une fois dans le projet. Recopier « (brouillon,annulee) » à la
 * main ailleurs casse le test « dérive de STATUTS_FACTURE_EXCLUS ».
 */
const FILTRE_IN_EXCLUS = `(${STATUTS_FACTURE_EXCLUS.join(",")})`;

/** Le minimum qu'une requête doit savoir faire pour être filtrée ici. */
type QueryFiltrable<Q> = {
  not(colonne: string, operateur: string, valeur: string): Q;
};

/**
 * Écarte côté SQL les factures qui ne comptent pas dans les totaux, et
 * RENVOIE la requête pour permettre le chaînage (`.eq(…)`, `.select(…)`).
 *
 * Remplace le `.not("statut","eq","annulee")` recopié dans les écrans, qui
 * n'excluait QUE les annulées : les brouillons entraient dans le chiffre
 * d'affaires alors qu'un brouillon n'est pas encore dû.
 *
 * Pourquoi un `NOT IN` est EXACT ici : `factures.statut` est une colonne
 * enum NOT NULL. En SQL, `NOT (statut IN (…))` vaut NULL — donc écarte la
 * ligne — quand la colonne est NULL ; sur une colonne nullable il faut un
 * `.or("statut.is.null,statut.not.in.(…)")`. Le rapport quotidien
 * `send-daily-report` a été cassé par ce piège sur `session_inscriptions.statut`,
 * qui est du texte libre nullable : des inscrits étaient silencieusement
 * décomptés à zéro. Sur `factures.statut`, la contrainte NOT NULL rend le
 * cas impossible ; si elle disparaissait, ce helper serait à revoir.
 */
export function filtreFacturesComptees<Q>(query: QueryFiltrable<Q>): Q {
  return query.not("statut", "in", FILTRE_IN_EXCLUS);
}

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

/**
 * Factures réellement encaissables : celles qui comptent dans les totaux.
 *
 * Un versement rattaché à une facture écartée est exclu du « Payé » et du
 * reste à encaisser (`sommePaiementsFactures`) : proposer une telle facture
 * à l'encaissement fait disparaître la saisie des totaux.
 */
export function facturesEncaissables<T extends { statut?: string | null }>(
  factures: ReadonlyArray<T>,
): T[] {
  return factures.filter(estFactureComptee);
}

/**
 * État du solde d'un apprenant, en TROIS cas et non deux.
 *
 * « Soldé » ne doit se dire que d'une dette réellement éteinte : sans ce
 * troisième cas, un apprenant n'ayant qu'une facture en brouillon (donc hors
 * total) affichait « Soldé » alors que rien n'a été facturé ni encaissé.
 */
export type EtatSolde = "rien" | "impaye" | "solde";

export function etatSolde(montantTotal: Montant, restant: Montant): EtatSolde {
  if (num(montantTotal) <= 0) return "rien";
  return num(restant) > 0 ? "impaye" : "solde";
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
 * Total encaissé SUR UNE PÉRIODE, restreint aux factures comptées.
 *
 * Défaut réel qu'il empêche : le CA mensuel et les piliers stratégiques
 * sommaient TOUS les versements du mois (`from("paiements").select("montant")`,
 * sans même charger `facture_id`). Un acompte encaissé sur un devis resté en
 * brouillon, ou un versement sur une facture annulée, gonflait donc la barre
 * « payé » du mois — qui pouvait dépasser le « facturé » affiché juste à côté.
 *
 * La période est passée en prédicat plutôt qu'en bornes : les appelants ne
 * découpent pas le temps de la même façon (clé de mois « yyyy-MM » ici,
 * `>= début du mois` là), et ce module reste sans dépendance à une
 * bibliothèque de dates — il est importé par des écrans légers.
 *
 * Exception assumée : `useDashboardData.encaissements` ne doit PAS utiliser
 * ce helper (vue « compte en banque », cf. en-tête du fichier).
 *
 * `NoInfer` sur le prédicat : sans lui, un prédicat déclaré à part
 * (`const enSeptembre = (p: { date_paiement: string }) => …`) sert lui aussi
 * à deviner `P`, les deux candidats se contredisent et TypeScript retombe sur
 * la contrainte — l'appelant reçoit alors une erreur incompréhensible sur son
 * propre prédicat. Le type des paiements vient de la LISTE, et d'elle seule.
 */
export function sommePaiementsFacturesPeriode<P extends PaiementLigne>(
  factures: ReadonlyArray<FactureLigne>,
  paiements: ReadonlyArray<P>,
  dansLaPeriode: (paiement: NoInfer<P>) => boolean,
): number {
  return sommePaiementsFactures(factures, paiements.filter(dansLaPeriode));
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
