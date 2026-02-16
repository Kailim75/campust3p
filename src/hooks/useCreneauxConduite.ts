import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CreneauConduite {
  id: string;
  centre_id: string | null;
  formateur_id: string | null;
  vehicule_id: string | null;
  contact_id: string | null;
  fiche_pratique_id: string | null;
  date_creneau: string;
  heure_debut: string;
  heure_fin: string;
  statut: string;
  type_seance: string;
  lieu_depart: string | null;
  lieu_arrivee: string | null;
  parcours: string | null;
  commentaires: string | null;
  recurrence_id: string | null;
  reserve_par: string | null;
  reserve_at: string | null;
  confirme_par: string | null;
  confirme_at: string | null;
  annule_par: string | null;
  annule_at: string | null;
  motif_annulation: string | null;
  rappel_envoye: boolean;
  rappel_envoye_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreneauConduiteWithDetails extends CreneauConduite {
  formateur?: { id: string; nom: string; prenom: string } | null;
  vehicule?: { id: string; marque: string; modele: string; immatriculation: string } | null;
  contact?: { id: string; nom: string; prenom: string; formation: string | null } | null;
}

export type CreneauConduiteInsert = Omit<CreneauConduite, "id" | "created_at" | "updated_at" | "rappel_envoye" | "rappel_envoye_at" | "reserve_at" | "confirme_at" | "annule_at">;

export function useCreneauxConduite(filters?: {
  dateDebut?: string;
  dateFin?: string;
  formateurId?: string;
  vehiculeId?: string;
  contactId?: string;
  statut?: string;
}) {
  return useQuery({
    queryKey: ["creneaux-conduite", filters],
    queryFn: async () => {
      let query = supabase
        .from("creneaux_conduite")
        .select(`
          *,
          formateur:formateurs(id, nom, prenom),
          vehicule:vehicules(id, marque, modele, immatriculation),
          contact:contacts(id, nom, prenom, formation)
        `)
        .order("date_creneau", { ascending: true })
        .order("heure_debut", { ascending: true });

      if (filters?.dateDebut) {
        query = query.gte("date_creneau", filters.dateDebut);
      }
      if (filters?.dateFin) {
        query = query.lte("date_creneau", filters.dateFin);
      }
      if (filters?.formateurId) {
        query = query.eq("formateur_id", filters.formateurId);
      }
      if (filters?.vehiculeId) {
        query = query.eq("vehicule_id", filters.vehiculeId);
      }
      if (filters?.contactId) {
        query = query.eq("contact_id", filters.contactId);
      }
      if (filters?.statut) {
        query = query.eq("statut", filters.statut);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CreneauConduiteWithDetails[];
    },
  });
}

export function useCreateCreneau() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creneau: Partial<CreneauConduiteInsert>) => {
      const { data, error } = await supabase
        .from("creneaux_conduite")
        .insert(creneau as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creneaux-conduite"] });
      toast.success("Créneau créé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la création du créneau");
    },
  });
}

export function useUpdateCreneau() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreneauConduiteInsert>) => {
      const { data, error } = await supabase
        .from("creneaux_conduite")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creneaux-conduite"] });
      toast.success("Créneau mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteCreneau() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("creneaux_conduite")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creneaux-conduite"] });
      toast.success("Créneau supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function useCheckConflicts() {
  return useMutation({
    mutationFn: async (params: {
      date: string;
      heureDebut: string;
      heureFin: string;
      formateurId?: string;
      vehiculeId?: string;
      contactId?: string;
      excludeId?: string;
    }) => {
      const { data, error } = await supabase.rpc("check_creneau_conflicts", {
        p_date: params.date,
        p_heure_debut: params.heureDebut,
        p_heure_fin: params.heureFin,
        p_formateur_id: params.formateurId || null,
        p_vehicule_id: params.vehiculeId || null,
        p_contact_id: params.contactId || null,
        p_exclude_id: params.excludeId || null,
      });

      if (error) throw error;
      return data as { conflict_type: string; conflict_id: string; conflict_label: string; conflict_heure_debut: string; conflict_heure_fin: string }[];
    },
  });
}

export function useReserverCreneau() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { creneauId: string; contactId: string }) => {
      const { data, error } = await supabase.rpc("reserver_creneau", {
        p_creneau_id: params.creneauId,
        p_contact_id: params.contactId,
      });

      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creneaux-conduite"] });
      toast.success("Créneau réservé avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la réservation");
    },
  });
}
