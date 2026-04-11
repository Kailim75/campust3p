import { useMemo } from "react";
import { parseISO, isAfter, isBefore } from "date-fns";
import type { Session } from "@/hooks/useSessions";

export interface SessionFilters {
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

export function useSessionsFilters(
  sessions: Session[] | undefined,
  filters: SessionFilters,
  inscriptionsCounts: Record<string, number>
) {
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter((session) => {
      const formationType = session.formation_type ?? "";
      const sessionNumber = session.numero_session ?? "";

      // Critical filter
      if (filters.criticalOnly && !isSessionCritical(session, inscriptionsCounts)) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          session.nom.toLowerCase().includes(searchLower) ||
          formationType.toLowerCase().includes(searchLower) ||
          sessionNumber.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters.status !== "all" && session.statut !== filters.status) return false;
      if (filters.formationType !== "all" && formationType !== filters.formationType) return false;
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
