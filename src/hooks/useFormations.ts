import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FormationStats {
  formation_type: string;
  sessionsCount: number;
  upcomingSessions: number;
  totalPlaces: number;
  totalInscriptions: number;
  avgPrice: number;
}

export function useFormationsStats() {
  return useQuery({
    queryKey: ["formations-stats"],
    queryFn: async () => {
      // Récupérer toutes les sessions avec leurs inscriptions
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select(`
          id,
          formation_type,
          places_totales,
          prix,
          statut,
          date_debut
        `);

      if (error) throw error;

      // Récupérer le nombre d'inscriptions par session
      const { data: inscriptions, error: inscError } = await supabase
        .from("session_inscriptions")
        .select("session_id");

      if (inscError) throw inscError;

      // Compter les inscriptions par session
      const inscriptionsBySession = (inscriptions || []).reduce((acc, insc) => {
        acc[insc.session_id] = (acc[insc.session_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Grouper par type de formation
      const stats: Record<string, FormationStats> = {};
      const now = new Date();

      (sessions || []).forEach((session) => {
        const type = session.formation_type;
        if (!stats[type]) {
          stats[type] = {
            formation_type: type,
            sessionsCount: 0,
            upcomingSessions: 0,
            totalPlaces: 0,
            totalInscriptions: 0,
            avgPrice: 0,
          };
        }

        stats[type].sessionsCount += 1;
        stats[type].totalPlaces += session.places_totales;
        stats[type].totalInscriptions += inscriptionsBySession[session.id] || 0;

        if (session.prix) {
          stats[type].avgPrice = (stats[type].avgPrice * (stats[type].sessionsCount - 1) + Number(session.prix)) / stats[type].sessionsCount;
        }

        // Sessions à venir
        if (session.statut === "a_venir" || (session.date_debut && new Date(session.date_debut) > now)) {
          stats[type].upcomingSessions += 1;
        }
      });

      return Object.values(stats);
    },
  });
}
