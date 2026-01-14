import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type_vehicule: string;
  categorie: string;
  date_mise_circulation: string | null;
  date_controle_technique: string | null;
  date_assurance: string | null;
  statut: string;
  notes: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export type VehiculeInsert = Omit<Vehicule, "id" | "created_at" | "updated_at">;
export type VehiculeUpdate = Partial<VehiculeInsert>;

export function useVehicules() {
  return useQuery({
    queryKey: ["vehicules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules")
        .select("*")
        .order("marque", { ascending: true });

      if (error) throw error;
      return data as Vehicule[];
    },
  });
}

export function useActiveVehicules() {
  return useQuery({
    queryKey: ["vehicules", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules")
        .select("*")
        .eq("actif", true)
        .order("marque", { ascending: true });

      if (error) throw error;
      return data as Vehicule[];
    },
  });
}

export function useVehicule(id: string | null) {
  return useQuery({
    queryKey: ["vehicule", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("vehicules")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Vehicule;
    },
    enabled: !!id,
  });
}

export function useCreateVehicule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicule: VehiculeInsert) => {
      const { data, error } = await supabase
        .from("vehicules")
        .insert(vehicule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Véhicule créé avec succès");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la création du véhicule");
      console.error(error);
    },
  });
}

export function useUpdateVehicule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: VehiculeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Véhicule mis à jour");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeleteVehicule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Véhicule supprimé");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}
