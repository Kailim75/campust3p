import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FactureLigne {
  id: string;
  facture_id: string;
  catalogue_formation_id: string | null;
  description: string;
  quantite: number;
  prix_unitaire_ht: number;
  tva_percent: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  ordre: number;
  created_at: string;
}

export interface FactureLigneInsert {
  facture_id: string;
  catalogue_formation_id?: string | null;
  description: string;
  quantite?: number;
  prix_unitaire_ht: number;
  tva_percent?: number;
  ordre?: number;
}

export interface FactureLigneUpdate {
  description?: string;
  quantite?: number;
  prix_unitaire_ht?: number;
  tva_percent?: number;
  ordre?: number;
}

export function useFactureLignes(factureId: string | null) {
  return useQuery({
    queryKey: ["facture-lignes", factureId],
    queryFn: async () => {
      if (!factureId) return [];
      
      const { data, error } = await supabase
        .from("facture_lignes")
        .select(`
          *,
          catalogue_formation:catalogue_formations(id, code, intitule)
        `)
        .eq("facture_id", factureId)
        .order("ordre", { ascending: true });

      if (error) throw error;
      return data as (FactureLigne & { catalogue_formation: { id: string; code: string; intitule: string } | null })[];
    },
    enabled: !!factureId,
  });
}

export function useCreateFactureLigne() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ligne: FactureLigneInsert) => {
      const { data, error } = await supabase
        .from("facture_lignes")
        .insert(ligne)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["facture-lignes", data.facture_id] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
    onError: (error: any) => {
      console.error("Error creating ligne:", error);
      toast.error("Erreur lors de l'ajout de la ligne");
    },
  });
}

export function useCreateFactureLignes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lignes: FactureLigneInsert[]) => {
      const { data, error } = await supabase
        .from("facture_lignes")
        .insert(lignes)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["facture-lignes", data[0].facture_id] });
        queryClient.invalidateQueries({ queryKey: ["factures"] });
      }
    },
    onError: (error: any) => {
      console.error("Error creating lignes:", error);
      toast.error("Erreur lors de l'ajout des lignes");
    },
  });
}

export function useUpdateFactureLigne() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, factureId, ...updates }: FactureLigneUpdate & { id: string; factureId: string }) => {
      const { data, error } = await supabase
        .from("facture_lignes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, factureId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["facture-lignes", data.factureId] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
    onError: (error: any) => {
      console.error("Error updating ligne:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteFactureLigne() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, factureId }: { id: string; factureId: string }) => {
      const { error } = await supabase
        .from("facture_lignes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { factureId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["facture-lignes", data.factureId] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
    onError: (error: any) => {
      console.error("Error deleting ligne:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function useDeleteFactureLignesByFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (factureId: string) => {
      const { error } = await supabase
        .from("facture_lignes")
        .delete()
        .eq("facture_id", factureId);

      if (error) throw error;
      return { factureId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["facture-lignes", data.factureId] });
    },
    onError: (error: any) => {
      console.error("Error deleting lignes:", error);
    },
  });
}
