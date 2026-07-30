import { useMemo } from "react";
import { parseISO, isAfter, isBefore } from "date-fns";
import type { Session } from "@/hooks/useSessions";

/** Fenêtre temporelle affichée. « actives » = en cours + à venir. */
export type SessionPeriode = "actives" | "terminees" | "toutes";

export interface SessionFilters {
  periode: SessionPeriode;
  search: string;
  status: string;
  formationType: string;
  formateurId: string;
  lieu: string;
  dateStart: string;
  dateEnd: string;
  criticalOnly: boolean;
}

export const defaultFilters: SessionFilters = {
  // Refonte du 23/07/2026 : la page ouvrait sur 45 sessions terminées
  // pour 11 actives — on montre par défaut ce qui reste à faire.
  periode: "actives",
  search: "",
  status: "all",
  formationType: "all",
  formateurId: "all",
  lieu: "all",
  dateStart: "",
  dateEnd: "",
  criticalOnly: false,
};

export function isSessionCritical(
  session: Session,
  inscriptionsCounts: Record<string, number>
): boolean {
  if (session.statut !== "a_venir") return false;
  const daysUntil = Math.ceil(
    (new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntil > 14 || daysUntil < 0) return false;
  const inscrits = inscriptionsCounts[session.id] || 0;
  const fillRate = session.places_totales > 0 ? inscrits / session.places_totales : 0;
  return fillRate < 0.5;
}

export function estSessionActive(session: Session): boolean {
  return session.statut === "a_venir" || session.statut === "en_cours";
}

/** Compteurs des onglets de période (sur le jeu complet, hors autres filtres). */
export function compterParPeriode(sessions: Session[] | undefined) {
  const all = sessions || [];
  const actives = all.filter(estSessionActive).length;
  return { actives, terminees: all.length - actives, toutes: all.length };
}

export function useSessionsFilters(
  sessions: Session[] | undefined,
  filters: SessionFilters,
  inscriptionsCounts: Record<string, number>
) {
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter((session) => {
      // Fenêtre temporelle
      if (filters.periode === "actives" && !estSessionActive(session)) return false;
      if (filters.periode === "terminees" && estSessionActive(session)) return false;

      // Critical filter
      if (filters.criticalOnly && !isSessionCritical(session, inscriptionsCounts)) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          session.nom.toLowerCase().includes(searchLower) ||
          session.formation_type.toLowerCase().includes(searchLower) ||
          session.numero_session?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters.status !== "all" && session.statut !== filters.status) return false;
      if (filters.formationType !== "all" && session.formation_type !== filters.formationType) return false;
      if (filters.formateurId !== "all" && session.formateur_id !== filters.formateurId) return false;

      if (filters.lieu !== "all") {
        const sessionLieu = session.adresse_ville || session.lieu;
        if (sessionLieu !== filters.lieu) return false;
      }

      if (filters.dateStart) {
        const filterStart = parseISO(filters.dateStart);
        const sessionStart = parseISO(session.date_debut);
        if (isBefore(sessionStart, filterStart)) return false;
      }

      if (filters.dateEnd) {
        const filterEnd = parseISO(filters.dateEnd);
        const sessionEnd = parseISO(session.date_fin);
        if (isAfter(sessionEnd, filterEnd)) return false;
      }

      return true;
    });
  }, [sessions, filters, inscriptionsCounts]);

  const hasActiveFilters =
    filters.periode !== defaultFilters.periode ||
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.formationType !== "all" ||
    filters.formateurId !== "all" ||
    filters.lieu !== "all" ||
    filters.dateStart !== "" ||
    filters.dateEnd !== "" ||
    filters.criticalOnly;

  return { filteredSessions, hasActiveFilters };
}
