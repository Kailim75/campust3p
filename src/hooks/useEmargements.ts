import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Emargement {
  id: string;
  session_id: string;
  contact_id: string;
  date_emargement: string;
  periode: "matin" | "apres_midi";
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
      // Get all inscriptions for this session
      const { data: inscriptions, error: inscError } = await supabase
        .from("session_inscriptions")
        .select("contact_id")
        .eq("session_id", sessionId)
        .eq("statut", "inscrit");

      if (inscError) throw inscError;
      if (!inscriptions || inscriptions.length === 0) {
        throw new Error("Aucun stagiaire inscrit à cette session");
      }

      // Generate dates between start and end
      const dates: string[] = [];
      const start = new Date(dateDebut);
      const end = new Date(dateFin);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Skip weekends
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          dates.push(d.toISOString().split("T")[0]);
        }
      }

      // Create emargements for each contact, date, and period
      const emargements = [];
      for (const inscription of inscriptions) {
        for (const date of dates) {
          for (const periode of ["matin", "apres_midi"] as const) {
            emargements.push({
              session_id: sessionId,
              contact_id: inscription.contact_id,
              date_emargement: date,
              periode,
              heure_debut: periode === "matin" ? "09:00" : "14:00",
              heure_fin: periode === "matin" ? "12:30" : "17:30",
            });
          }
        }
      }

      // Insert in batches
      const batchSize = 50;
      for (let i = 0; i < emargements.length; i += batchSize) {
        const batch = emargements.slice(i, i + batchSize);
        const { error } = await supabase.from("emargements").insert(batch);
        if (error && !error.message.includes("duplicate")) throw error;
      }

      return { count: emargements.length, sessionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["emargements", result.sessionId] });
      toast.success(`${result.count} émargements générés`);
    },
    onError: (error: Error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}
