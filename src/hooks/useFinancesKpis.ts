/**
 * useFinancesKpis — Read-only adapter for the Finances module.
 *
 * Single source of truth for finance KPIs displayed across the Finances tabs.
 * Wraps `useDashboardData` so that all UI consumers (Pilotage tab, Facturation
 * header, etc.) share the exact same formulas as the strategic Dashboard.
 *
 * Rules enforced (inherited from useDashboardData):
 *  - caFacture     = Σ factures.montant_total WHERE statut ∉ {brouillon, annulee} ∧ date_emission ∈ période
 *  - encaissements = Σ paiements.montant WHERE date_paiement ∈ période
 *  - resteAEncaisser = Σ (montant_total - total_paye) WHERE statut ∈ {emise, partiel, impayee} (instantané)
 *  - panierMoyen   = caFacture / inscriptionsCount sur la période
 *  - paiementsRetard = factures émises/partielles dont date_echeance < today et total_paye < montant_total
 *
 * No DB writes, no recomputation. Use this hook everywhere instead of
 * re-aggregating factures client-side.
 */
import { useDashboardData } from "./useDashboardData";
import { useDashboardPeriodV2 } from "./useDashboardPeriodV2";

export interface FinancesKpis {
  caFacture: number;
  caFacturePrev: number;
  encaissements: number;
  encaissementsPrev: number;
  resteAEncaisser: number;
  panierMoyen: number;
  panierMoyenPrev: number;
  tauxRecouvrement: number;
  paiementsRetard: number;
  paiementsRetardMontant: number;
  facturesEnAttente: number;
  facturesEnAttenteMontant: number;
  inscriptionsCount: number;
  isLoading: boolean;
  periodLabel: string;
}

export function useFinancesKpis(): FinancesKpis {
  const { period } = useDashboardPeriodV2();
  const { data, isLoading } = useDashboardData(period);
  const m = data?.metrics;

  const caFacture = m?.caFacture ?? 0;
  const encaissements = m?.encaissements ?? 0;
  // Taux recouvrement = encaissements / CA facturé (période). Sécurisé contre /0.
  const tauxRecouvrement =
    caFacture > 0 ? Math.round((encaissements / caFacture) * 100) : 0;

  return {
    caFacture,
    caFacturePrev: m?.caFacturePrev ?? 0,
    encaissements,
    encaissementsPrev: m?.encaissementsPrev ?? 0,
    resteAEncaisser: m?.resteAEncaisser ?? 0,
    panierMoyen: m?.panierMoyen ?? 0,
    panierMoyenPrev: m?.panierMoyenPrev ?? 0,
    tauxRecouvrement,
    paiementsRetard: m?.paiementsRetard ?? 0,
    paiementsRetardMontant: m?.paiementsRetardMontant ?? 0,
    facturesEnAttente: m?.facturesEnAttente ?? 0,
    facturesEnAttenteMontant: m?.facturesEnAttenteMontant ?? 0,
    inscriptionsCount: m?.inscriptionsCount ?? 0,
    isLoading,
    periodLabel: period.label,
  };
}
