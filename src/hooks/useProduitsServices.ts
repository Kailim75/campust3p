import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUserCentreId } from "@/utils/getCentreId";

export type ProduitType =
  | "unitaire"
  | "horaire"
  | "demi_journee"
  | "journalier"
  | "forfaitaire"
  | "abonnement"
  | "consommable"
  | "location"
  | "pack";

export type ProduitStatut = "actif" | "inactif" | "brouillon" | "archive";

export interface ProduitService {
  id: string;
  centre_id: string;
  nom: string;
  sku: string | null;
  description_courte: string | null;
  description_longue: string | null;
  categorie_id: string | null;
  sous_categorie: string | null;
  tags: string[];
  type: ProduitType;
  unite: string | null;
  prix_ht: number;
  tva_percent: number;
  statut: ProduitStatut;
  photos: string[];
  gestion_stock: boolean;
  stock_actuel: number | null;
  seuil_alerte: number | null;
  caution_montant: number | null;
  duree_minutes: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  categorie?: { id: string; nom: string; couleur: string | null } | null;
}

export interface ProduitCategorie {
  id: string;
  centre_id: string;
  nom: string;
  parent_id: string | null;
  ordre: number;
  couleur: string | null;
  icone: string | null;
  actif: boolean;
}

export type ProduitInsert = Omit<
  ProduitService,
  "id" | "centre_id" | "created_at" | "updated_at" | "categorie"
> & { id?: string };

export function useProduitsServices(filters?: { statut?: ProduitStatut; search?: string; categorie_id?: string }) {
  return useQuery({
    queryKey: ["produits-services", filters],
    queryFn: async () => {
      let q = supabase
        .from("produits_services" as any)
        .select(`*, categorie:produit_categories(id, nom, couleur)`)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters?.statut) q = q.eq("statut", filters.statut);
      if (filters?.categorie_id) q = q.eq("categorie_id", filters.categorie_id);
      if (filters?.search) q = q.ilike("nom", `%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ProduitService[];
    },
  });
}

export function useProduitCategories() {
  return useQuery({
    queryKey: ["produit-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produit_categories" as any)
        .select("*")
        .is("deleted_at", null)
        .eq("actif", true)
        .order("ordre", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProduitCategorie[];
    },
  });
}

export function useUpsertProduitService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProduitInsert> & { id?: string }) => {
      const centreId = await getUserCentreId();
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("produits_services" as any)
          .update(rest as any)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("produits_services" as any)
          .insert({ ...input, centre_id: centreId } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produits-services"] });
      toast.success("Produit enregistré");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur d'enregistrement"),
  });
}

export function useDeleteProduitService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("produits_services" as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produits-services"] });
      toast.success("Produit supprimé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur de suppression"),
  });
}

export function useDuplicateProduitService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (produit: ProduitService) => {
      const centreId = await getUserCentreId();
      const { id, created_at, updated_at, categorie, sku, ...rest } = produit as any;
      const { data, error } = await supabase
        .from("produits_services" as any)
        .insert({
          ...rest,
          centre_id: centreId,
          nom: `${produit.nom} (copie)`,
          sku: sku ? `${sku}-copie` : null,
          statut: "brouillon",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produits-services"] });
      toast.success("Produit dupliqué");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur de duplication"),
  });
}

export function useUpsertProduitCategorie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProduitCategorie> & { id?: string }) => {
      const centreId = await getUserCentreId();
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("produit_categories" as any)
          .update(rest as any)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("produit_categories" as any)
        .insert({ ...input, centre_id: centreId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produit-categories"] });
      toast.success("Catégorie enregistrée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export const PRODUIT_TYPE_LABELS: Record<ProduitType, string> = {
  unitaire: "Unitaire",
  horaire: "Horaire",
  demi_journee: "Demi-journée",
  journalier: "Journalier",
  forfaitaire: "Forfait",
  abonnement: "Abonnement",
  consommable: "Consommable",
  location: "Location",
  pack: "Pack",
};

export const PRODUIT_STATUT_LABELS: Record<ProduitStatut, string> = {
  actif: "Actif",
  inactif: "Inactif",
  brouillon: "Brouillon",
  archive: "Archivé",
};
