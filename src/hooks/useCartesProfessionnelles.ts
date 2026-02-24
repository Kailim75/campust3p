import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CarteProfessionnelle {
  id: string;
  contact_id: string;
  type_carte: string;
  formation_type: string | null;
  numero_dossier: string | null;
  numero_carte: string | null;
  date_demande: string | null;
  date_obtention: string | null;
  date_expiration: string | null;
  statut: string;
  prefecture: string | null;
  notes: string | null;
  documents_manquants: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CarteProInsert {
  contact_id: string;
  type_carte: string;
  formation_type?: string | null;
  numero_dossier?: string | null;
  numero_carte?: string | null;
  date_demande?: string | null;
  date_obtention?: string | null;
  date_expiration?: string | null;
  statut?: string;
  prefecture?: string | null;
  notes?: string | null;
}

export interface CarteProUpdate {
  type_carte?: string;
  formation_type?: string | null;
  numero_dossier?: string | null;
  numero_carte?: string | null;
  date_demande?: string | null;
  date_obtention?: string | null;
  date_expiration?: string | null;
  statut?: string;
  prefecture?: string | null;
  notes?: string | null;
}

export function useCartesProfessionnelles(contactId: string | null) {
  return useQuery({
    queryKey: ["cartes-professionnelles", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("cartes_professionnelles")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CarteProfessionnelle[];
    },
    enabled: !!contactId,
  });
}

export function useCreateCartePro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (carte: CarteProInsert) => {
      const { data, error } = await supabase
        .from("cartes_professionnelles")
        .insert(carte)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cartes-professionnelles", data.contact_id] });
      toast.success("Carte professionnelle ajoutée");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la carte");
    },
  });
}

export function useUpdateCartePro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId, ...updates }: CarteProUpdate & { id: string; contactId: string }) => {
      const { data, error } = await supabase
        .from("cartes_professionnelles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, contactId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cartes-professionnelles", data.contactId] });
      toast.success("Carte professionnelle mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteCartePro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from("cartes_professionnelles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { contactId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cartes-professionnelles", data.contactId] });
      toast.success("Carte professionnelle supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });
}
