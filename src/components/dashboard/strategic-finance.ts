/**
 * Volet « Finance » du pilier stratégique de la page d'accueil.
 *
 * Extrait de `StrategicPillars.tsx` pour être testable : un composant qui
 * exporte autre chose qu'un composant casse le rafraîchissement à chaud
 * (règle `react-refresh/only-export-components`).
 */

import { parseISO } from "date-fns";
import { sommeFactures, sommePaiementsFactures } from "@/lib/montants";

export interface FactureLigne {
  id?: string | null;
  montant_total?: number | string | null;
  statut?: string | null;
  date_emission?: string | null;
}

export interface PaiementLigne {
  montant?: number | string | null;
  facture_id?: string | null;
  date_paiement: string;
}

/**
 * `caConfirme` ne compte plus les brouillons : une facture en préparation n'est
 * pas du chiffre d'affaires confirmé. `totalPaye` ne retient que les versements
 * RATTACHÉS à une facture comptée — sommer tous les paiements du mois faisait
 * entrer l'argent reçu sur un brouillon ou une annulée dans l'encaissé.
 */
export function calculerFinanceMois(
  factures: ReadonlyArray<FactureLigne>,
  paiements: ReadonlyArray<PaiementLigne>,
  monthStart: Date,
  monthEnd: Date,
) {
  const facturesDuMois = factures.filter(
    (f) =>
      f.date_emission &&
      parseISO(f.date_emission) >= monthStart &&
      parseISO(f.date_emission) <= monthEnd,
  );
  const paiementsDuMois = paiements.filter((p) => parseISO(p.date_paiement) >= monthStart);

  return {
    caConfirme: sommeFactures(facturesDuMois),
    // Rattachement sur TOUTES les factures comptées : un versement de ce mois
    // peut solder une facture émise le mois dernier.
    totalPaye: sommePaiementsFactures(factures, paiementsDuMois),
  };
}
