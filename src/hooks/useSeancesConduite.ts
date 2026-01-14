import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SeanceConduite {
  id: string;
  fiche_pratique_id: string;
  contact_id: string;
  formateur_id: string | null;
  vehicule_id: string | null;
  date_seance: string;
  heure_debut: string;
  heure_fin: string;
  duree_minutes: number;
  type_seance: string;
  parcours: string | null;
  observations: string | null;
  competences_travaillees: string[] | null;
  note_globale: number | null;
  validation_formateur: boolean;
  date_validation: string | null;
  signature_data: string | null;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  formateurs?: { id: string; nom: string; prenom: string } | null;
  vehicules?: { id: string; immatriculation: string; marque: string; modele: string } | null;
}

export type SeanceConduiteInsert = Omit<SeanceConduite, "id" | "created_at" | "updated_at" | "formateurs" | "vehicules">;
export type SeanceConduiteUpdate = Partial<Omit<SeanceConduiteInsert, "fiche_pratique_id" | "contact_id">>;

export const typeSeanceOptions = [
  { value: "conduite", label: "Conduite" },
  { value: "simulation", label: "Simulation" },
  { value: "evaluation", label: "Évaluation" },
  { value: "rattrapage", label: "Rattrapage" },
];

export const parcoursOptions = [
  { value: "urbain", label: "Urbain" },
  { value: "periurbain", label: "Périurbain" },
  { value: "autoroute", label: "Autoroute" },
  { value: "mixte", label: "Mixte" },
];

export function useFicheSeances(fichePratiqueId: string | null) {
  return useQuery({
    queryKey: ["seances-conduite", "fiche", fichePratiqueId],
    queryFn: async () => {
      if (!fichePratiqueId) return [];
      const { data, error } = await supabase
        .from("seances_conduite")
        .select(`
          *,
          formateurs (id, nom, prenom),
          vehicules (id, immatriculation, marque, modele)
        `)
        .eq("fiche_pratique_id", fichePratiqueId)
        .order("date_seance", { ascending: false });

      if (error) throw error;
      return data as SeanceConduite[];
    },
    enabled: !!fichePratiqueId,
  });
}

export function useContactSeances(contactId: string | null) {
  return useQuery({
    queryKey: ["seances-conduite", "contact", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("seances_conduite")
        .select(`
          *,
          formateurs (id, nom, prenom),
          vehicules (id, immatriculation, marque, modele)
        `)
        .eq("contact_id", contactId)
        .order("date_seance", { ascending: false });

      if (error) throw error;
      return data as SeanceConduite[];
    },
    enabled: !!contactId,
  });
}

export function useCreateSeanceConduite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seance: SeanceConduiteInsert) => {
      const { data, error } = await supabase
        .from("seances_conduite")
        .insert(seance)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["seances-conduite", "fiche", variables.fiche_pratique_id] });
      queryClient.invalidateQueries({ queryKey: ["seances-conduite", "contact", variables.contact_id] });
      queryClient.invalidateQueries({ queryKey: ["fiches-pratique"] });
      toast.success("Séance enregistrée");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    },
  });
}

export function useUpdateSeanceConduite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fichePratiqueId, contactId, ...updates }: SeanceConduiteUpdate & { id: string; fichePratiqueId: string; contactId: string }) => {
      const { data, error } = await supabase
        .from("seances_conduite")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, fichePratiqueId, contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["seances-conduite", "fiche", result.fichePratiqueId] });
      queryClient.invalidateQueries({ queryKey: ["seances-conduite", "contact", result.contactId] });
      queryClient.invalidateQueries({ queryKey: ["fiches-pratique"] });
      toast.success("Séance mise à jour");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeleteSeanceConduite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fichePratiqueId, contactId }: { id: string; fichePratiqueId: string; contactId: string }) => {
      const { error } = await supabase
        .from("seances_conduite")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { fichePratiqueId, contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["seances-conduite", "fiche", result.fichePratiqueId] });
      queryClient.invalidateQueries({ queryKey: ["seances-conduite", "contact", result.contactId] });
      queryClient.invalidateQueries({ queryKey: ["fiches-pratique"] });
      toast.success("Séance supprimée");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}
