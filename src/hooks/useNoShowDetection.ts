import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

/**
 * Hook de détection automatique des no-shows.
 * S'exécute au montage et toutes les 30 minutes.
 * Met à jour le statut des réservations confirmées dont le créneau est passé.
 */
export function useNoShowDetection() {
  const queryClient = useQueryClient();

  const detectNoShows = useCallback(async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const now = format(new Date(), "HH:mm:ss");

      // 1. Créneaux de jours passés avec réservations encore confirmées
      const { data: pastDaysCreneaux } = await supabase
        .from("creneaux_conduite")
        .select("id, date_creneau, heure_debut, heure_fin, type_seance")
        .lt("date_creneau", today)
        .neq("statut", "annule");

      // 2. Créneaux d'aujourd'hui dont l'heure est passée
      const { data: todayCreneaux } = await supabase
        .from("creneaux_conduite")
        .select("id, date_creneau, heure_debut, heure_fin, type_seance")
        .eq("date_creneau", today)
        .neq("statut", "annule");

      const passedTodayCreneaux = (todayCreneaux || []).filter(
        (c) => c.heure_fin && c.heure_fin < now
      );

      const allPassedCreneauxIds = [
        ...(pastDaysCreneaux || []).map((c) => c.id),
        ...passedTodayCreneaux.map((c) => c.id),
      ];

      if (allPassedCreneauxIds.length === 0) return;

      // 3. Trouver les réservations encore confirmées
      const { data: noShows } = await supabase
        .from("reservations_conduite")
        .select(
          "id, creneau_id, apprenant_id, contacts:apprenant_id(prenom, nom)"
        )
        .in("creneau_id", allPassedCreneauxIds)
        .eq("statut", "confirmee" as any);

      if (!noShows || noShows.length === 0) return;

      // 4. Marquer comme no_show
      const ids = noShows.map((r) => r.id);
      await supabase
        .from("reservations_conduite")
        .update({ statut: "no_show" as any })
        .in("id", ids);

      // 5. Invalider les caches pour rafraîchir l'UI
      queryClient.invalidateQueries({ queryKey: ["reservations-conduite"] });
      queryClient.invalidateQueries({ queryKey: ["planning-conduite-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-paiements-month"] });

      if (noShows.length > 0) {
        console.log(
          `[NoShow] ${noShows.length} réservation(s) marquée(s) no-show`
        );
      }
    } catch (error) {
      console.error("[NoShow] Erreur détection no-shows:", error);
    }
  }, [queryClient]);

  useEffect(() => {
    // Exécuter au montage
    detectNoShows();

    // Exécuter toutes les 30 minutes
    const interval = setInterval(detectNoShows, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [detectNoShows]);
}
