import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  runContratCoherenceCheck,
  type CoherenceReport,
} from "@/lib/compliance/contratCoherenceCheck";

/**
 * Vérifie la cohérence du contrat de formation pour une inscription donnée :
 * articles 2/4/5/8/9 + bloc représentant légal vs type de formation et âge.
 */
export function useContratCoherence(inscriptionId: string | null) {
  return useQuery<CoherenceReport | null>({
    queryKey: ["contrat-coherence", inscriptionId],
    enabled: !!inscriptionId,
    queryFn: async () => {
      if (!inscriptionId) return null;

      const { data: ins, error } = await supabase
        .from("session_inscriptions")
        .select(`
          id,
          contact_id,
          session_id,
          contacts:contact_id (
            date_naissance
          ),
          sessions:session_id (
            formation_type,
            duree_heures,
            objectifs
          )
        `)
        .eq("id", inscriptionId)
        .maybeSingle();

      if (error) throw error;
      if (!ins) return null;

      const contact: any = ins.contacts || {};
      const session: any = ins.sessions || {};

      // Pas de stockage dédié du représentant légal pour l'instant : la vérification
      // signalera systématiquement l'absence du bloc lorsque le bénéficiaire est mineur.
      const hasRepresentantLegal = false;

      return runContratCoherenceCheck({
        formationType: session.formation_type,
        dureeHeures: session.duree_heures,
        dateNaissance: contact.date_naissance,
        hasObjectifs: !!session.objectifs,
        hasRepresentantLegal,
      });
    },
  });
}
