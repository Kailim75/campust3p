import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addYears } from "date-fns";

export type ExamenT3PStatut = "planifie" | "passe" | "reussi" | "echoue" | "absent" | "reporte";
export type ExamenT3PResultat = "admis" | "ajourne" | "absent";

export interface ExamenT3P {
  id: string;
  contact_id: string;
  type_formation: string;
  date_examen: string;
  heure_examen: string | null;
  centre_examen: string | null;
  departement: string | null;
  numero_convocation: string | null;
  numero_dossier: string | null;
  statut: ExamenT3PStatut;
  resultat: ExamenT3PResultat | null;
  score: number | null;
  numero_tentative: number;
  date_reussite: string | null;
  date_expiration: string | null;
  observations: string | null;
  document_resultat_path: string | null;
  created_at: string;
  updated_at: string;
}

export type ExamenT3PInsert = Omit<ExamenT3P, "id" | "created_at" | "updated_at">;
export type ExamenT3PUpdate = Partial<Omit<ExamenT3PInsert, "contact_id">>;

export const examenT3PStatutConfig: Record<ExamenT3PStatut, { label: string; class: string }> = {
  planifie: { label: "Planifié", class: "bg-info/10 text-info" },
  passe: { label: "Passé", class: "bg-muted text-muted-foreground" },
  reussi: { label: "Réussi", class: "bg-success text-success-foreground" },
  echoue: { label: "Échoué", class: "bg-destructive/10 text-destructive" },
  absent: { label: "Absent", class: "bg-warning/10 text-warning" },
  reporte: { label: "Reporté", class: "bg-muted text-muted-foreground" },
};

export const examenT3PResultatConfig: Record<ExamenT3PResultat, { label: string; class: string }> = {
  admis: { label: "Admis", class: "bg-success text-success-foreground" },
  ajourne: { label: "Ajourné", class: "bg-destructive/10 text-destructive" },
  absent: { label: "Absent", class: "bg-warning/10 text-warning" },
};

export const centresExamenT3P = [
  "CCI Paris Île-de-France",
  "CCI Hauts-de-Seine",
  "CCI Seine-Saint-Denis",
  "CCI Val-de-Marne",
  "CCI Essonne",
  "CCI Yvelines",
  "CCI Val-d'Oise",
  "CCI Seine-et-Marne",
  "Centre agréé préfecture",
  "Autre",
];

export function useContactExamensT3P(contactId: string | null) {
  return useQuery({
    queryKey: ["examens-t3p", "contact", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("examens_t3p")
        .select("*")
        .eq("contact_id", contactId)
        .order("date_examen", { ascending: false });

      if (error) throw error;
      return data as ExamenT3P[];
    },
    enabled: !!contactId,
  });
}

export function useCreateExamenT3P() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examen: ExamenT3PInsert) => {
      // Calculate expiration date if exam is passed (5 years)
      let dateExpiration = examen.date_expiration;
      if (examen.statut === "reussi" && examen.date_reussite && !dateExpiration) {
        dateExpiration = addYears(new Date(examen.date_reussite), 5).toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from("examens_t3p")
        .insert({ ...examen, date_expiration: dateExpiration })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["examens-t3p", "contact", variables.contact_id] });
      toast.success("Examen T3P planifié");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la planification");
      console.error(error);
    },
  });
}

export function useUpdateExamenT3P() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId, ...updates }: ExamenT3PUpdate & { id: string; contactId: string }) => {
      // Calculate expiration date if exam is passed (5 years)
      let dateExpiration = updates.date_expiration;
      if (updates.statut === "reussi" && updates.date_reussite && !dateExpiration) {
        dateExpiration = addYears(new Date(updates.date_reussite), 5).toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from("examens_t3p")
        .update({ ...updates, date_expiration: dateExpiration })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["examens-t3p", "contact", result.contactId] });
      toast.success("Examen T3P mis à jour");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeleteExamenT3P() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from("examens_t3p")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["examens-t3p", "contact", result.contactId] });
      toast.success("Examen T3P supprimé");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}

// Get number of attempts for a contact
export function useContactT3PAttempts(contactId: string | null, typeFormation?: string) {
  return useQuery({
    queryKey: ["examens-t3p", "attempts", contactId, typeFormation],
    queryFn: async () => {
      if (!contactId) return 0;
      let query = supabase
        .from("examens_t3p")
        .select("id", { count: "exact" })
        .eq("contact_id", contactId);

      if (typeFormation) {
        query = query.eq("type_formation", typeFormation);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    enabled: !!contactId,
  });
}
