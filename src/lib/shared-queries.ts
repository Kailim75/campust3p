import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Requêtes partagées entre les hooks qui, montés en même temps (hub
 * « Aujourd'hui », badge du header, alertes), tiraient chacun les mêmes
 * tables entières en parallèle. `queryClient.fetchQuery` garantit UNE seule
 * requête réseau par clé : les appels concurrents partagent la promesse en
 * vol, les suivants lisent le cache pendant `staleTime`.
 *
 * Audit du 18/07/2026 : contact_documents était téléchargée 3× au chargement
 * d'« Aujourd'hui » (~1,4-1,7 s chacune), session_inscriptions et les rappels
 * 2×. Voir AMELIORATIONS.md.
 */

const STALE_MS = 60_000;

export interface ContactDocLight {
  contact_id: string;
  type_document: string;
}

export function fetchSharedContactDocs(queryClient: QueryClient): Promise<ContactDocLight[]> {
  return queryClient.fetchQuery({
    queryKey: ["shared", "contact-documents-light"],
    staleTime: STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_documents")
        .select("contact_id, type_document")
        .is("deleted_at", null);
      if (error) throw error;
      return (data || []) as ContactDocLight[];
    },
  });
}

export interface SessionInscriptionLight {
  id: string;
  contact_id: string;
  session_id: string;
  statut: string | null;
  statut_paiement: string | null;
  track: string | null;
}

export function fetchSharedInscriptions(queryClient: QueryClient): Promise<SessionInscriptionLight[]> {
  return queryClient.fetchQuery({
    queryKey: ["shared", "session-inscriptions-light"],
    staleTime: STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_inscriptions")
        .select("id, contact_id, session_id, statut, statut_paiement, track")
        .is("deleted_at", null);
      if (error) throw error;
      return (data || []) as SessionInscriptionLight[];
    },
  });
}

export interface RappelActif {
  contact_id: string;
  date_rappel: string;
  alerte_active: boolean;
  rappel_description: string | null;
}

/** Tous les rappels actifs datés — chaque consommateur filtre sa fenêtre. */
export function fetchSharedRappelsActifs(queryClient: QueryClient): Promise<RappelActif[]> {
  return queryClient.fetchQuery({
    queryKey: ["shared", "rappels-actifs"],
    staleTime: STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("contact_id, date_rappel, alerte_active, rappel_description")
        .eq("alerte_active", true)
        .not("date_rappel", "is", null);
      if (error) throw error;
      return (data || []) as RappelActif[];
    },
  });
}
