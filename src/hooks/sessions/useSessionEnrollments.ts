import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SessionInscription = Tables<"session_inscriptions">;

export function useSessionInscriptions(sessionId: string | null) {
  return useQuery({
    queryKey: ["session_inscriptions", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from("session_inscriptions")
        .select(`
          *,
          contacts:contact_id (
            id, civilite, nom, prenom, email, telephone,
            rue, code_postal, ville, date_naissance, ville_naissance,
            pays_naissance, numero_carte_professionnelle, prefecture_carte,
            date_expiration_carte, numero_permis, prefecture_permis,
            date_delivrance_permis, formation
          )
        `)
        .eq("session_id", sessionId)
        .is("deleted_at", null)
        .order("date_inscription", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useSessionInscriptionsCount(sessionId: string) {
  return useQuery({
    queryKey: ["session_inscriptions", "count", sessionId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("session_inscriptions")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .is("deleted_at", null);

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useAllSessionInscriptionsCounts() {
  return useQuery({
    queryKey: ["session_inscriptions", "all_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_inscription_counts")
        .select("session_id, inscription_count");

      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.session_id] = row.inscription_count;
      });
      return counts;
    },
  });
}
