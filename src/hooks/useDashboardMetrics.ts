import { useMemo } from "react";
import { type UseQueryResult } from "@tanstack/react-query";
import { type DashboardMetrics as DashboardDataMetrics, useDashboardData } from "./useDashboardData";
import { type PeriodValue } from "./useDashboardPeriodV2";

type MetricKeys =
  | "encaissements"
  | "encaissementsPrev"
  | "facturesEnAttente"
  | "facturesEnAttentePrev"
  | "facturesEnAttenteMontant"
  | "facturesEnAttenteAgeDays"
  | "paiementsRetard"
  | "paiementsRetardPrev"
  | "paiementsRetardMontant"
  | "paiementsRetardAgeDays"
  | "prospectsRelance"
  | "prospectsRelancePrev"
  | "sessionsRisque"
  | "sessionsRisquePrev"
  | "apprenantsCritiques"
  | "apprenantsCritiquesPrev"
  | "dossiersInitialManquants"
  | "dossiersContinuManquants"
  | "nouveauxProspects"
  | "nouveauxProspectsPrev";

export type DashboardMetrics = Pick<DashboardDataMetrics, MetricKeys>;

export function useDashboardMetrics(period: PeriodValue) {
  const query = useDashboardData(period);

  const data = useMemo<DashboardMetrics | undefined>(() => {
    const metrics = query.data?.metrics;
    if (!metrics) return undefined;

    return {
      encaissements: metrics.encaissements,
      encaissementsPrev: metrics.encaissementsPrev,
      facturesEnAttente: metrics.facturesEnAttente,
      facturesEnAttentePrev: metrics.facturesEnAttentePrev,
      facturesEnAttenteMontant: metrics.facturesEnAttenteMontant,
      facturesEnAttenteAgeDays: metrics.facturesEnAttenteAgeDays,
      paiementsRetard: metrics.paiementsRetard,
      paiementsRetardPrev: metrics.paiementsRetardPrev,
      paiementsRetardMontant: metrics.paiementsRetardMontant,
      paiementsRetardAgeDays: metrics.paiementsRetardAgeDays,
      prospectsRelance: metrics.prospectsRelance,
      prospectsRelancePrev: metrics.prospectsRelancePrev,
      sessionsRisque: metrics.sessionsRisque,
      sessionsRisquePrev: metrics.sessionsRisquePrev,
      apprenantsCritiques: metrics.apprenantsCritiques,
      apprenantsCritiquesPrev: metrics.apprenantsCritiquesPrev,
      dossiersInitialManquants: metrics.dossiersInitialManquants,
      dossiersContinuManquants: metrics.dossiersContinuManquants,
      nouveauxProspects: metrics.nouveauxProspects,
      nouveauxProspectsPrev: metrics.nouveauxProspectsPrev,
    };
  }, [query.data]);

  return {
    ...query,
    data,
  };
}
