import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ExamenStatut = "planifie" | "passe" | "reussi" | "echoue" | "absent" | "reporte";
export type ExamenResultat = "admis" | "ajourne" | "absent";

export interface ExamenPratique {
  id: string;
  fiche_pratique_id: string;
  contact_id: string;
  type_examen: string;
  date_examen: string;
  heure_examen: string | null;
  centre_examen: string | null;
  adresse_centre: string | null;
  statut: ExamenStatut;
  resultat: ExamenResultat | null;
  score: number | null;
  observations: string | null;
  document_resultat_path: string | null;
  created_at: string;
  updated_at: string;
}

export type ExamenPratiqueInsert = Omit<ExamenPratique, "id" | "created_at" | "updated_at">;
export type ExamenPratiqueUpdate = Partial<Omit<ExamenPratiqueInsert, "fiche_pratique_id" | "contact_id">>;

export const examenStatutConfig: Record<ExamenStatut, { label: string; class: string }> = {
  planifie: { label: "Planifié", class: "bg-info/10 text-info" },
  passe: { label: "Passé", class: "bg-muted text-muted-foreground" },
  reussi: { label: "Réussi", class: "bg-success text-success-foreground" },
  echoue: { label: "Échoué", class: "bg-destructive/10 text-destructive" },
  absent: { label: "Absent", class: "bg-warning/10 text-warning" },
  reporte: { label: "Reporté", class: "bg-muted text-muted-foreground" },
};

export const examenResultatConfig: Record<ExamenResultat, { label: string; class: string }> = {
  admis: { label: "Admis", class: "bg-success text-success-foreground" },
  ajourne: { label: "Ajourné", class: "bg-destructive/10 text-destructive" },
  absent: { label: "Absent", class: "bg-warning/10 text-warning" },
};

export function useFicheExamens(fichePratiqueId: string | null) {
  return useQuery({
    queryKey: ["examens-pratique", "fiche", fichePratiqueId],
    queryFn: async () => {
      if (!fichePratiqueId) return [];
      const { data, error } = await supabase
        .from("examens_pratique")
        .select("*")
        .eq("fiche_pratique_id", fichePratiqueId)
        .order("date_examen", { ascending: false });

      if (error) throw error;
      return data as ExamenPratique[];
    },
    enabled: !!fichePratiqueId,
  });
}

export function useContactExamens(contactId: string | null) {
  return useQuery({
    queryKey: ["examens-pratique", "contact", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("examens_pratique")
        .select("*")
        .eq("contact_id", contactId)
        .order("date_examen", { ascending: false });

      if (error) throw error;
      return data as ExamenPratique[];
    },
    enabled: !!contactId,
  });
}

export function useCreateExamenPratique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examen: ExamenPratiqueInsert) => {
      const { data, error } = await supabase
        .from("examens_pratique")
        .insert(examen)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["examens-pratique", "fiche", variables.fiche_pratique_id] });
      queryClient.invalidateQueries({ queryKey: ["examens-pratique", "contact", variables.contact_id] });
      toast.success("Examen planifié");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la planification");
      console.error(error);
    },
  });
}

export function useUpdateExamenPratique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fichePratiqueId, contactId, ...updates }: ExamenPratiqueUpdate & { id: string; fichePratiqueId: string; contactId: string }) => {
      const { data, error } = await supabase
        .from("examens_pratique")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, fichePratiqueId, contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["examens-pratique", "fiche", result.fichePratiqueId] });
      queryClient.invalidateQueries({ queryKey: ["examens-pratique", "contact", result.contactId] });
      queryClient.invalidateQueries({ queryKey: ["fiches-pratique"] });
      toast.success("Examen mis à jour");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeleteExamenPratique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fichePratiqueId, contactId }: { id: string; fichePratiqueId: string; contactId: string }) => {
      const { error } = await supabase
        .from("examens_pratique")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { fichePratiqueId, contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["examens-pratique", "fiche", result.fichePratiqueId] });
      queryClient.invalidateQueries({ queryKey: ["examens-pratique", "contact", result.contactId] });
      toast.success("Examen supprimé");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}
