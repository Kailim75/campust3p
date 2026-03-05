import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUserCentreId } from "@/utils/getCentreId";

export function useRecalcTrackForCatalogue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ catalogueId, recalcInscriptions = true }: { catalogueId: string; recalcInscriptions?: boolean }) => {
      const { data, error } = await supabase.rpc("admin_recalc_track_for_catalogue", {
        p_catalogue_id: catalogueId,
        p_recalc_inscriptions: recalcInscriptions,
      });
      if (error) throw error;
      return data as { success: boolean; track: string; updated_sessions: number; updated_inscriptions: number; error?: string };
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(
          `Recalcul terminé : ${data.updated_sessions} session(s) et ${data.updated_inscriptions} inscription(s) mises à jour`
        );
        queryClient.invalidateQueries({ queryKey: ["catalogue-formations"] });
      } else {
        toast.error(data?.error || "Erreur lors du recalcul");
      }
    },
    onError: (error: any) => {
      console.error("Error recalculating track:", error);
      toast.error("Erreur lors du recalcul du parcours");
    },
  });
}

export interface CatalogueFormation {
  id: string;
  code: string;
  intitule: string;
  description: string | null;
  categorie: string;
  type_formation: string;
  duree_heures: number;
  prix_ht: number;
  tva_percent: number;
  remise_percent: number;
  actif: boolean;
  prerequis: string | null;
  objectifs: string | null;
  track: "initial" | "continuing";
  created_at: string;
  updated_at: string;
}

export interface CatalogueFormationInsert {
  code: string;
  intitule: string;
  description?: string | null;
  categorie?: string;
  type_formation?: string;
  duree_heures?: number;
  prix_ht?: number;
  tva_percent?: number;
  remise_percent?: number;
  actif?: boolean;
  prerequis?: string | null;
  objectifs?: string | null;
}

export interface CatalogueFormationUpdate {
  code?: string;
  intitule?: string;
  description?: string | null;
  categorie?: string;
  type_formation?: string;
  duree_heures?: number;
  prix_ht?: number;
  tva_percent?: number;
  remise_percent?: number;
  actif?: boolean;
  prerequis?: string | null;
  objectifs?: string | null;
}

export function useCatalogueFormations(activeOnly = false) {
  return useQuery({
    queryKey: ["catalogue-formations", activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("catalogue_formations")
        .select("*")
        .order("categorie", { ascending: true })
        .order("intitule", { ascending: true });

      if (activeOnly) {
        query = query.eq("actif", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CatalogueFormation[];
    },
  });
}

export function useCatalogueFormation(id: string | null) {
  return useQuery({
    queryKey: ["catalogue-formations", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("catalogue_formations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as CatalogueFormation | null;
    },
    enabled: !!id,
  });
}

export function useCreateCatalogueFormation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formation: CatalogueFormationInsert) => {
      const centreId = await getUserCentreId();
      const { data, error } = await supabase
        .from("catalogue_formations")
        .insert({ ...formation, centre_id: centreId } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogue-formations"] });
      toast.success("Article ajouté au catalogue");
    },
    onError: (error: any) => {
      console.error("Error creating catalogue item:", error);
      if (error.code === "23505") {
        toast.error("Ce code existe déjà");
      } else {
        toast.error("Erreur lors de la création");
      }
    },
  });
}

export function useUpdateCatalogueFormation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CatalogueFormationUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("catalogue_formations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogue-formations"] });
      toast.success("Article mis à jour");
    },
    onError: (error: any) => {
      console.error("Error updating catalogue item:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteCatalogueFormation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("catalogue_formations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogue-formations"] });
      toast.success("Article supprimé du catalogue");
    },
    onError: (error: any) => {
      console.error("Error deleting catalogue item:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}
