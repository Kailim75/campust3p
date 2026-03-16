import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Emargement {
  id: string;
  session_id: string;
  contact_id: string;
  date_emargement: string;
  periode: "matin" | "apres_midi" | "soir";
  heure_debut: string | null;
  heure_fin: string | null;
  present: boolean;
  signature_url: string | null;
  signature_data: string | null;
  ip_signature: string | null;
  user_agent_signature: string | null;
  date_signature: string | null;
  commentaires: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    nom: string;
    prenom: string;
  };
}

export function useEmargements(sessionId: string | null) {
  return useQuery({
    queryKey: ["emargements", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from("emargements")
        .select(`
          *,
          contact:contacts(id, nom, prenom)
        `)
        .eq("session_id", sessionId)
        .is("deleted_at", null)
        .order("date_emargement", { ascending: true })
        .order("periode", { ascending: true });

      if (error) throw error;
      return data as Emargement[];
    },
    enabled: !!sessionId,
  });
}

export function useCreateEmargement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emargement: {
      session_id: string;
      contact_id: string;
      date_emargement: string;
      periode: "matin" | "apres_midi";
      heure_debut?: string;
      heure_fin?: string;
    }) => {
      const { data, error } = await supabase
        .from("emargements")
        .insert(emargement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["emargements", variables.session_id] });
    },
    onError: (error: Error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useSignEmargement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      emargementId,
      sessionId,
      signatureData,
    }: {
      emargementId: string;
      sessionId: string;
      signatureData: string;
    }) => {
      // Upload signature to storage
      const fileName = `emargement_${emargementId}_${Date.now()}.png`;
      const base64Data = signatureData.split(",")[1];
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(fileName, binaryData, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("signatures")
        .getPublicUrl(fileName);

      // Update emargement
      const { data, error } = await supabase
        .from("emargements")
        .update({
          present: true,
          signature_url: urlData.publicUrl,
          signature_data: signatureData,
          ip_signature: "N/A", // Could be fetched from a service
          user_agent_signature: navigator.userAgent,
          date_signature: new Date().toISOString(),
        })
        .eq("id", emargementId)
        .select()
        .single();

      if (error) throw error;
      return { data, sessionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["emargements", result.sessionId] });
      toast.success("Émargement signé");
    },
    onError: (error: Error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useTogglePresence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      emargementId,
      sessionId,
      present,
    }: {
      emargementId: string;
      sessionId: string;
      present: boolean;
    }) => {
      const { data, error } = await supabase
        .from("emargements")
        .update({ present })
        .eq("id", emargementId)
        .select()
        .single();

      if (error) throw error;
      return { data, sessionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["emargements", result.sessionId] });
    },
    onError: (error: Error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useGenerateEmargements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      dateDebut,
      dateFin,
    }: {
      sessionId: string;
      dateDebut: string;
      dateFin: string;
    }) => {
      // Get all inscriptions for this session (all active statuses)
      const { data: inscriptions, error: inscError } = await supabase
        .from("session_inscriptions")
        .select("contact_id")
        .eq("session_id", sessionId)
        .in("statut", ["inscrit", "confirme", "present", "encours", "valide", "en_attente", "document"]);

      if (inscError) throw inscError;
      if (!inscriptions || inscriptions.length === 0) {
        throw new Error("Aucun stagiaire inscrit à cette session");
      }

      const inscritContactIds = new Set(inscriptions.map(i => i.contact_id));

      // Get existing emargements to find ones to remove (contacts no longer enrolled)
      const { data: existingEmargements, error: existError } = await supabase
        .from("emargements")
        .select("id, contact_id")
        .eq("session_id", sessionId);

      if (existError) throw existError;

      // Soft delete emargements for contacts no longer enrolled
      const toDelete = (existingEmargements || []).filter(e => !inscritContactIds.has(e.contact_id));
      if (toDelete.length > 0) {
        const deleteIds = toDelete.map(e => e.id);
        const { error: delError } = await supabase
          .from("emargements")
          .update({ 
            deleted_at: new Date().toISOString(),
            deleted_by: null, // Could be enhanced to track user
            delete_reason: "Contact désinscrit de la session"
          })
          .in("id", deleteIds);
        if (delError) throw delError;
      }

      // Find contacts that already have emargements
      const existingContactIds = new Set((existingEmargements || []).map(e => e.contact_id));
      const newContactIds = [...inscritContactIds].filter(id => !existingContactIds.has(id));

      // Detect FC (formation continue) sessions - often held on weekends
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("formation_type, horaire_type, heure_debut, heure_fin")
        .eq("id", sessionId)
        .single();
      const isFC = sessionData?.formation_type?.toUpperCase().startsWith("FC-");
      const isSoir = (sessionData as any)?.horaire_type === "soir";

      // Generate dates between start and end
      const dates: string[] = [];
      const start = new Date(dateDebut);
      const end = new Date(dateFin);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Skip weekends only for non-FC sessions
        if (isFC || (d.getDay() !== 0 && d.getDay() !== 6)) {
          dates.push(d.toISOString().split("T")[0]);
        }
      }

      // Create emargements only for NEW contacts
      const emargements = [];
      for (const contactId of newContactIds) {
        for (const date of dates) {
          if (isSoir) {
            // Evening sessions: single "soir" period
            emargements.push({
              session_id: sessionId,
              contact_id: contactId,
              date_emargement: date,
              periode: "soir",
              heure_debut: (sessionData as any)?.heure_debut?.slice(0, 5) || "18:00",
              heure_fin: (sessionData as any)?.heure_fin?.slice(0, 5) || "21:30",
            });
          } else {
            // Day sessions: matin + apres_midi
            for (const periode of ["matin", "apres_midi"] as const) {
              emargements.push({
                session_id: sessionId,
                contact_id: contactId,
                date_emargement: date,
                periode,
                heure_debut: periode === "matin" ? "09:00" : "14:00",
                heure_fin: periode === "matin" ? "12:30" : "17:30",
              });
            }
          }
        }
      }

      // Insert in batches
      if (emargements.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < emargements.length; i += batchSize) {
          const batch = emargements.slice(i, i + batchSize);
          const { error } = await supabase.from("emargements").insert(batch);
          if (error && !error.message.includes("duplicate")) throw error;
        }
      }

      return { count: emargements.length, deleted: toDelete.length, sessionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["emargements", result.sessionId] });
      const parts = [];
      if (result.count > 0) parts.push(`${result.count} émargements ajoutés`);
      if (result.deleted > 0) parts.push(`${result.deleted} supprimés`);
      toast.success(parts.length > 0 ? parts.join(", ") : "Émargements synchronisés");
    },
    onError: (error: Error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}
