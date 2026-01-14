import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FichePratiqueStatut = 
  | "non_commencee" 
  | "en_cours" 
  | "pret_examen" 
  | "examen_planifie" 
  | "reussi" 
  | "echoue";

export interface FichePratique {
  id: string;
  contact_id: string;
  formation_type: string;
  heures_prevues: number;
  heures_realisees: number;
  date_debut: string | null;
  date_fin_prevue: string | null;
  statut: FichePratiqueStatut;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FichePratiqueInsert = Omit<FichePratique, "id" | "created_at" | "updated_at" | "heures_realisees">;
export type FichePratiqueUpdate = Partial<Omit<FichePratiqueInsert, "contact_id">>;

export const fichePratiqueStatutConfig: Record<FichePratiqueStatut, { label: string; class: string }> = {
  non_commencee: { label: "Non commencée", class: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", class: "bg-info/10 text-info" },
  pret_examen: { label: "Prêt examen", class: "bg-success/10 text-success" },
  examen_planifie: { label: "Examen planifié", class: "bg-warning/10 text-warning" },
  reussi: { label: "Réussi", class: "bg-success text-success-foreground" },
  echoue: { label: "Échoué", class: "bg-destructive/10 text-destructive" },
};

export function useContactFichesPratique(contactId: string | null) {
  return useQuery({
    queryKey: ["fiches-pratique", "contact", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("fiches_pratique")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FichePratique[];
    },
    enabled: !!contactId,
  });
}

export function useFichePratique(id: string | null) {
  return useQuery({
    queryKey: ["fiche-pratique", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("fiches_pratique")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as FichePratique;
    },
    enabled: !!id,
  });
}

export function useCreateFichePratique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fiche: FichePratiqueInsert) => {
      const { data, error } = await supabase
        .from("fiches_pratique")
        .insert(fiche)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fiches-pratique", "contact", variables.contact_id] });
      toast.success("Fiche pratique créée");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Une fiche existe déjà pour cette formation");
      } else {
        toast.error("Erreur lors de la création");
      }
      console.error(error);
    },
  });
}

export function useUpdateFichePratique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId, ...updates }: FichePratiqueUpdate & { id: string; contactId: string }) => {
      const { data, error } = await supabase
        .from("fiches_pratique")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fiches-pratique", "contact", result.contactId] });
      queryClient.invalidateQueries({ queryKey: ["fiche-pratique", result.data.id] });
      toast.success("Fiche mise à jour");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeleteFichePratique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from("fiches_pratique")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fiches-pratique", "contact", result.contactId] });
      toast.success("Fiche supprimée");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}
