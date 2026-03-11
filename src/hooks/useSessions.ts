import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTrackFromFormationType } from "@/lib/formation-track";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getUserCentreId } from "@/utils/getCentreId";
import { toast } from "sonner";

export type Session = Tables<"sessions">;
export type SessionInsert = TablesInsert<"sessions">;
export type SessionUpdate = TablesUpdate<"sessions">;

export type SessionInscription = Tables<"session_inscriptions">;

export function useSessions(includeArchived = false) {
  return useQuery({
    queryKey: ["sessions", { includeArchived }],
    queryFn: async () => {
      let query = supabase
        .from("sessions")
        .select("*")
        .is("deleted_at", null)
        .order("date_debut", { ascending: true });

      if (!includeArchived) {
        query = query.eq("archived", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Session[];
    },
  });
}

export function useUpcomingSessions(limit = 5) {
  return useQuery({
    queryKey: ["sessions", "upcoming", limit],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .is("deleted_at", null)
        .eq("archived", false)
        .gte("date_fin", today)
        .order("date_debut", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Session[];
    },
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ["sessions", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Session;
    },
    enabled: !!id,
  });
}

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
            id,
            civilite,
            nom,
            prenom,
            email,
            telephone,
            rue,
            code_postal,
            ville,
            date_naissance,
            ville_naissance,
            pays_naissance,
            numero_carte_professionnelle,
            prefecture_carte,
            date_expiration_carte,
            numero_permis,
            prefecture_permis,
            date_delivrance_permis,
            formation
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

// Fetch all inscriptions counts in one query for efficiency
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

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: SessionInsert) => {
      const track = getTrackFromFormationType(session.formation_type);
      const { data, error } = await supabase
        .from("sessions")
        .insert({ ...session, track } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création de la session : " + error.message);
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SessionUpdate }) => {
      const { data, error } = await supabase
        .from("sessions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour de la session : " + error.message);
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("soft_delete_session", {
        p_session_id: id,
        p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression de la session : " + error.message);
    },
  });
}

interface AddInscriptionParams {
  sessionId: string;
  contactId: string;
  sessionPrix?: number;
  sessionNom?: string;
  autoCreateFacture?: boolean;
}

export function useAddInscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      contactId,
      sessionPrix = 0,
      sessionNom = '',
      autoCreateFacture = true,
    }: AddInscriptionParams) => {
      // Insert inscription
      const { data: inscription, error } = await supabase
        .from("session_inscriptions")
        .insert({ session_id: sessionId, contact_id: contactId })
        .select()
        .single();

      if (error) throw error;

      let factureCreated = false;

      // Auto-create invoice if requested
      if (autoCreateFacture && inscription) {
        // Generate unique invoice number
        const { data: numeroFacture, error: numeroError } = await supabase.rpc("generate_numero_facture");
        
        if (!numeroError && numeroFacture) {
          const centreId = await getUserCentreId();
          const { error: factureError } = await supabase
            .from("factures")
            .insert({
              centre_id: centreId,
              contact_id: contactId,
              session_inscription_id: inscription.id,
              numero_facture: numeroFacture,
              montant_total: sessionPrix,
              type_financement: "personnel",
              statut: "brouillon",
              date_emission: new Date().toISOString().split("T")[0],
              commentaires: sessionNom ? `Facture auto-générée pour la session: ${sessionNom}` : 'Facture auto-générée',
            });

          if (!factureError) {
            factureCreated = true;
          }
        }
      }

      return { inscription, factureCreated };
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "count", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'inscription : " + error.message);
    },
  });
}

export function useRemoveInscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      contactId,
    }: {
      sessionId: string;
      contactId: string;
    }) => {
      // Find the inscription to soft-delete
      const { data: inscriptions } = await supabase
        .from("session_inscriptions")
        .select("id")
        .eq("session_id", sessionId)
        .eq("contact_id", contactId)
        .is("deleted_at", null)
        .limit(1);
      
      if (inscriptions && inscriptions.length > 0) {
        const { error: delError } = await supabase.rpc("soft_delete_record", {
          p_table_name: "session_inscriptions",
          p_record_id: inscriptions[0].id,
          p_reason: "Désinscription manuelle",
        });
        if (delError) throw delError;
      }
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "count", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session-inscrits-detail", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
  });
}
