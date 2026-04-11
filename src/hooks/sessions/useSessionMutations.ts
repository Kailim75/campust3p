import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getTrackFromFormationType } from "@/lib/formation-track";
import { supabase } from "@/integrations/supabase/client";
import { getUserCentreId } from "@/utils/getCentreId";
import { toast } from "sonner";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type SessionInsert = TablesInsert<"sessions">;
export type SessionUpdate = TablesUpdate<"sessions">;

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: SessionInsert) => {
      const track = getTrackFromFormationType(session.formation_type);
      const sessionPayload: SessionInsert = {
        ...session,
        track,
      };
      const { data, error } = await supabase
        .from("sessions")
        .insert(sessionPayload)
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

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

function isPostgrestErrorLike(error: unknown): error is PostgrestErrorLike {
  return typeof error === "object" && error !== null;
}

async function rollbackInscription(inscriptionId: string) {
  const { error } = await supabase.rpc("soft_delete_record", {
    p_table_name: "session_inscriptions",
    p_record_id: inscriptionId,
    p_reason: "Rollback inscription après échec de génération de facture",
  });

  return error;
}

export function useAddInscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId, contactId, sessionPrix = 0, sessionNom = '', autoCreateFacture = true,
    }: AddInscriptionParams) => {
      const { data: inscription, error } = await supabase
        .from("session_inscriptions")
        .insert({ session_id: sessionId, contact_id: contactId, statut: "inscrit" })
        .select()
        .single();

      if (error) throw error;
      let factureCreated = false;

      if (autoCreateFacture && inscription) {
        const { data: numeroFacture, error: numeroError } = await supabase.rpc("generate_numero_facture");

        if (numeroError || !numeroFacture) {
          const rollbackError = await rollbackInscription(inscription.id);
          const suffix = rollbackError ? ` Rollback impossible: ${rollbackError.message}` : "";
          throw new Error(`Inscription annulée : impossible de générer la facture brouillon.${suffix}`);
        }

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
            commentaires: sessionNom ? `Facture auto-générée pour la session: ${sessionNom}` : "Facture auto-générée",
          });

        if (factureError) {
          const rollbackError = await rollbackInscription(inscription.id);
          const suffix = rollbackError ? ` Rollback impossible: ${rollbackError.message}` : "";
          throw new Error(`Inscription annulée : impossible de créer la facture brouillon.${suffix}`);
        }

        factureCreated = true;
      }

      return { inscription, factureCreated };
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "count", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "all_counts"] });
      queryClient.invalidateQueries({ queryKey: ["session-inscrits-detail", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
    onError: (error: Error) => {
      if (isPostgrestErrorLike(error) && (error as any).code === "23505") {
        toast.error("Ce stagiaire est déjà inscrit à cette session");
        return;
      }

      toast.error("Erreur lors de l'inscription : " + error.message);
    },
  });
}

export function useRemoveInscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, contactId }: { sessionId: string; contactId: string }) => {
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
    onError: (error: Error) => {
      toast.error("Erreur lors de la désinscription : " + error.message);
    },
  });
}
