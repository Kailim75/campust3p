import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, parseISO, isWithinInterval, addMonths } from "date-fns";

export interface FormateurStats {
  formateur: string;
  sessionsTotal: number;
  sessionsEnCours: number;
  sessionsAVenir: number;
  sessionsTerminees: number;
  stagiairesFormes: number;
  caGenere: number;
  tauxRemplissage: number;
  prochaineSessions: {
    id: string;
    nom: string;
    date_debut: string;
    date_fin: string;
    inscrits: number;
    places: number;
  }[];
}

export interface FormateurDisponibilite {
  formateur: string;
  mois: string;
  joursOccupes: number;
  joursTotaux: number;
  sessions: {
    id: string;
    nom: string;
    date_debut: string;
    date_fin: string;
  }[];
}

// Get unique formateurs from sessions
export function useFormateurs() {
  return useQuery({
    queryKey: ["formateurs", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("formateur")
        .not("formateur", "is", null);

      if (error) throw error;

      const uniqueFormateurs = [...new Set(data.map((s) => s.formateur).filter(Boolean))] as string[];
      return uniqueFormateurs.sort();
    },
  });
}

// Get detailed stats per formateur
export function useFormateursStats() {
  return useQuery({
    queryKey: ["formateurs", "stats"],
    queryFn: async () => {
      // Fetch all sessions
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("*")
        .not("formateur", "is", null);

      if (error) throw error;

      // Fetch all inscriptions
      const { data: inscriptions, error: inscError } = await supabase
        .from("session_inscriptions")
        .select("session_id");

      if (inscError) throw inscError;

      // Fetch factures for CA
      const { data: factures, error: factError } = await supabase
        .from("factures")
        .select(`
          montant_total,
          session_inscription:session_inscriptions (
            session_id
          )
        `)
        .not("statut", "eq", "annulee");

      if (factError) throw factError;

      // Count inscriptions per session
      const inscriptionsBySession: Record<string, number> = {};
      inscriptions?.forEach((i) => {
        inscriptionsBySession[i.session_id] = (inscriptionsBySession[i.session_id] || 0) + 1;
      });

      // CA per session
      const caBySession: Record<string, number> = {};
      factures?.forEach((f: any) => {
        const sessionId = f.session_inscription?.session_id;
        if (sessionId) {
          caBySession[sessionId] = (caBySession[sessionId] || 0) + Number(f.montant_total);
        }
      });

      // Group by formateur
      const formateurMap: Record<string, FormateurStats> = {};
      const today = new Date();

      sessions?.forEach((session) => {
        const formateur = session.formateur!;
        if (!formateurMap[formateur]) {
          formateurMap[formateur] = {
            formateur,
            sessionsTotal: 0,
            sessionsEnCours: 0,
            sessionsAVenir: 0,
            sessionsTerminees: 0,
            stagiairesFormes: 0,
            caGenere: 0,
            tauxRemplissage: 0,
            prochaineSessions: [],
          };
        }

        const stats = formateurMap[formateur];
        stats.sessionsTotal += 1;

        const inscrits = inscriptionsBySession[session.id] || 0;
        stats.stagiairesFormes += inscrits;
        stats.caGenere += caBySession[session.id] || 0;

        // Count by status
        if (session.statut === "en_cours") stats.sessionsEnCours += 1;
        else if (session.statut === "a_venir") stats.sessionsAVenir += 1;
        else if (session.statut === "terminee") stats.sessionsTerminees += 1;

        // Add to upcoming sessions
        if (session.statut === "a_venir" || session.statut === "en_cours") {
          stats.prochaineSessions.push({
            id: session.id,
            nom: session.nom,
            date_debut: session.date_debut,
            date_fin: session.date_fin,
            inscrits,
            places: session.places_totales,
          });
        }
      });

      // Calculate taux de remplissage and sort prochaines sessions
      Object.values(formateurMap).forEach((stats) => {
        const totalPlaces = sessions
          ?.filter((s) => s.formateur === stats.formateur)
          .reduce((acc, s) => acc + s.places_totales, 0) || 0;
        
        stats.tauxRemplissage = totalPlaces > 0 
          ? Math.round((stats.stagiairesFormes / totalPlaces) * 100) 
          : 0;

        stats.prochaineSessions.sort((a, b) => 
          new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
        );
        stats.prochaineSessions = stats.prochaineSessions.slice(0, 3);
      });

      return Object.values(formateurMap).sort((a, b) => b.sessionsTotal - a.sessionsTotal);
    },
  });
}

// Get disponibilité des formateurs sur les 3 prochains mois
export function useFormateursDisponibilite() {
  return useQuery({
    queryKey: ["formateurs", "disponibilite"],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("id, nom, formateur, date_debut, date_fin")
        .not("formateur", "is", null)
        .in("statut", ["a_venir", "en_cours"]);

      if (error) throw error;

      const formateurs = [...new Set(sessions?.map((s) => s.formateur).filter(Boolean))] as string[];
      const today = new Date();
      const result: FormateurDisponibilite[] = [];

      formateurs.forEach((formateur) => {
        const formateurSessions = sessions?.filter((s) => s.formateur === formateur) || [];

        // Check next 3 months
        for (let i = 0; i < 3; i++) {
          const monthStart = startOfMonth(addMonths(today, i));
          const monthEnd = endOfMonth(addMonths(today, i));
          const mois = format(monthStart, "yyyy-MM");

          // Find sessions in this month
          const sessionsInMonth = formateurSessions.filter((s) => {
            const start = parseISO(s.date_debut);
            const end = parseISO(s.date_fin);
            return (
              isWithinInterval(start, { start: monthStart, end: monthEnd }) ||
              isWithinInterval(end, { start: monthStart, end: monthEnd }) ||
              (start <= monthStart && end >= monthEnd)
            );
          });

          // Count occupied days
          let joursOccupes = 0;
          sessionsInMonth.forEach((s) => {
            const start = parseISO(s.date_debut);
            const end = parseISO(s.date_fin);
            const effectiveStart = start < monthStart ? monthStart : start;
            const effectiveEnd = end > monthEnd ? monthEnd : end;
            const days = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            joursOccupes += days;
          });

          // Total days in month (excluding weekends - simplified)
          const joursTotaux = 22; // Approximate working days

          result.push({
            formateur,
            mois,
            joursOccupes: Math.min(joursOccupes, joursTotaux),
            joursTotaux,
            sessions: sessionsInMonth.map((s) => ({
              id: s.id,
              nom: s.nom,
              date_debut: s.date_debut,
              date_fin: s.date_fin,
            })),
          });
        }
      });

      return result;
    },
  });
}
