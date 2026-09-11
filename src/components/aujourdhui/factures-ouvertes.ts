/**
 * Deux questions que le hub « Aujourd'hui » tranchait à sa main : « cette
 * facture est-elle encore ouverte ? » et « cet inscrit est-il soldé ? ».
 *
 * Le hub retenait `statut !== "payee" && statut !== "annulee"` : un BROUILLON
 * passait donc pour une facture ouverte et déclenchait une relance de paiement
 * sur un apprenant dont la fiche affiche « Soldé » — la fiche, elle, écarte les
 * brouillons (`STATUTS_FACTURE_EXCLUS`). C'était le symptôme constaté par le
 * directeur.
 *
 * Ces deux prédicats délèguent la liste des statuts à `src/lib/montants.ts`,
 * seule source de vérité : aucun écran ne la redéfinit, et la convention est
 * l'EXCLUSION (brouillon, annulée) — pas une liste blanche, qu'un statut
 * ajouté demain ferait disparaître des totaux en silence.
 */

import {
  calculerResteAEncaisser,
  estFactureComptee,
  facturesEncaissables,
} from "@/lib/montants";

export interface FactureOuvertureLigne {
  id?: string | null;
  statut?: string | null;
  montant_total?: number | string | null;
}

/**
 * Ouverte = COMPTÉE (ni brouillon ni annulée) ET NON SOLDÉE.
 *
 * Le solde se lit sur l'argent réellement encaissé, pas seulement sur le
 * libellé : une facture « émise » déjà réglée dont le statut n'a pas suivi ne
 * doit pas déclencher de relance. `calculerResteAEncaisser` borne à 0, donc un
 * trop-perçu ne rouvre pas la facture.
 */
export function estFactureOuverte(
  facture: FactureOuvertureLigne,
  totalPaye: number,
): boolean {
  if (!estFactureComptee(facture)) return false;
  if (facture.statut === "payee") return false;
  return calculerResteAEncaisser(facture.montant_total, totalPaye) > 0;
}

/**
 * Inscrit soldé = il a AU MOINS une facture comptée, et aucune n'est ouverte.
 *
 * La garde sur le vide est essentielle et doit le rester : `[].every()` vaut
 * `true`, donc sans elle un inscrit SANS facture — ou dont la seule facture est
 * un brouillon — passerait « payé » par vacuité.
 */
export function estInscritSolde(
  facturesLiees: ReadonlyArray<FactureOuvertureLigne>,
  payeParFacture: ReadonlyMap<string, number>,
): boolean {
  const comptees = facturesEncaissables(facturesLiees);
  if (comptees.length === 0) return false;
  return comptees.every(
    (f) => !estFactureOuverte(f, f.id ? payeParFacture.get(f.id) ?? 0 : 0),
  );
}

/**
 * Cette facture rend-elle son contact VISIBLE dans « Aujourd'hui » ?
 *
 * Question distincte de « faut-il relancer ? ». Un brouillon compte ici — un
 * devis préparé est un signe d'activité — alors qu'il ne doit JAMAIS déclencher
 * de relance (`estFactureOuverte`). C'est cette confusion qui produisait le
 * symptôme du 11/09/2026.
 *
 * Le critère est celui d'AVANT le lot, volontairement inchangé : `_isActive`
 * décide de l'affichage des blocs CMA et critiques, et ce lot ne doit ni faire
 * disparaître un contact ni en faire réapparaître. Le resserrer exclut des
 * contacts vivants ; l'élargir aux factures `payee` fait remonter des
 * apprenants soldés et dormants. Les deux erreurs ont été commises ici.
 */
export function compteCommeActivite(facture: { statut?: string | null }): boolean {
  return facture.statut !== "payee" && facture.statut !== "annulee";
}
