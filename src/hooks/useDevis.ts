import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DevisStatut = "brouillon" | "envoye" | "accepte" | "refuse" | "expire" | "converti";
export type FinancementType = "personnel" | "entreprise" | "cpf" | "opco";

export interface DevisLigne {
  id: string;
  devis_id: string;
  catalogue_formation_id: string | null;
  description: string;
  quantite: number;
  prix_unitaire_ht: number;
  tva_percent: number;
  remise_percent: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  ordre: number;
  created_at: string;
}

export interface Devis {
  id: string;
  numero_devis: string;
  contact_id: string;
  session_inscription_id: string | null;
  statut: DevisStatut;
  type_financement: FinancementType;
  montant_total: number;
  date_emission: string | null;
  date_validite: string | null;
  commentaires: string | null;
  facture_id: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    nom: string;
    prenom: string;
    email: string | null;
  };
  lignes?: DevisLigne[];
}

export interface DevisInsert {
  numero_devis: string;
  contact_id: string;
  session_inscription_id?: string | null;
  statut?: DevisStatut;
  type_financement?: FinancementType;
  montant_total: number;
  date_emission?: string | null;
  date_validite?: string | null;
  commentaires?: string | null;
}

export interface DevisLigneInsert {
  devis_id: string;
  catalogue_formation_id?: string | null;
  description: string;
  quantite?: number;
  prix_unitaire_ht: number;
  tva_percent?: number;
  remise_percent?: number;
  ordre?: number;
}

// Hook pour récupérer tous les devis
export function useDevis() {
  return useQuery({
    queryKey: ["devis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis")
        .select(`
          *,
          contact:contacts(id, nom, prenom, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Devis[];
    },
  });
}

// Hook pour récupérer un devis avec ses lignes
export function useDevisDetail(id: string | null) {
  return useQuery({
    queryKey: ["devis", id],
    queryFn: async () => {
      if (!id) return null;

      const { data: devis, error: devisError } = await supabase
        .from("devis")
        .select(`
          *,
          contact:contacts(id, nom, prenom, email, telephone)
        `)
        .eq("id", id)
        .maybeSingle();

      if (devisError) throw devisError;
      if (!devis) return null;

      const { data: lignes, error: lignesError } = await supabase
        .from("devis_lignes")
        .select("*")
        .eq("devis_id", id)
        .order("ordre", { ascending: true });

      if (lignesError) throw lignesError;

      return { ...devis, lignes } as Devis;
    },
    enabled: !!id,
  });
}

// Hook pour les stats des devis
export function useDevisStats() {
  return useQuery({
    queryKey: ["devis-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis")
        .select("statut, montant_total");

      if (error) throw error;

      const stats = {
        total: 0,
        brouillon: 0,
        envoye: 0,
        accepte: 0,
        refuse: 0,
        converti: 0,
        montantEnvoye: 0,
        montantAccepte: 0,
      };

      data?.forEach((d) => {
        stats.total++;
        const statut = d.statut as DevisStatut;
        if (statut in stats) {
          (stats as any)[statut]++;
        }
        if (statut === "envoye") {
          stats.montantEnvoye += Number(d.montant_total) || 0;
        }
        if (statut === "accepte") {
          stats.montantAccepte += Number(d.montant_total) || 0;
        }
      });

      return stats;
    },
  });
}

// Générer un numéro de devis
export async function generateNumeroDevis(): Promise<string> {
  const { data, error } = await supabase.rpc("generate_numero_devis");
  if (error) throw error;
  return data as string;
}

// Hook pour créer un devis
export function useCreateDevis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (devis: DevisInsert) => {
      const { data, error } = await supabase
        .from("devis")
        .insert(devis)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devis"] });
      queryClient.invalidateQueries({ queryKey: ["devis-stats"] });
      toast.success("Devis créé avec succès");
    },
    onError: (error: any) => {
      console.error("Error creating devis:", error);
      toast.error("Erreur lors de la création du devis");
    },
  });
}

// Hook pour mettre à jour un devis
export function useUpdateDevis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DevisInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("devis")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["devis"] });
      queryClient.invalidateQueries({ queryKey: ["devis", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["devis-stats"] });
      toast.success("Devis mis à jour");
    },
    onError: (error: any) => {
      console.error("Error updating devis:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

// Hook pour supprimer un devis
export function useDeleteDevis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devis"] });
      queryClient.invalidateQueries({ queryKey: ["devis-stats"] });
      toast.success("Devis supprimé");
    },
    onError: (error: any) => {
      console.error("Error deleting devis:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

// Hook pour ajouter des lignes de devis
export function useAddDevisLignes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lignes: DevisLigneInsert[]) => {
      const { data, error } = await supabase
        .from("devis_lignes")
        .insert(lignes)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["devis", variables[0].devis_id] });
      }
    },
    onError: (error: any) => {
      console.error("Error adding devis lignes:", error);
      toast.error("Erreur lors de l'ajout des lignes");
    },
  });
}

// Hook pour supprimer les lignes d'un devis
export function useDeleteDevisLignes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (devisId: string) => {
      const { error } = await supabase
        .from("devis_lignes")
        .delete()
        .eq("devis_id", devisId);

      if (error) throw error;
    },
    onSuccess: (_, devisId) => {
      queryClient.invalidateQueries({ queryKey: ["devis", devisId] });
    },
    onError: (error: any) => {
      console.error("Error deleting devis lignes:", error);
    },
  });
}

// Hook pour convertir un devis en facture
export function useConvertDevisToFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (devisId: string) => {
      // 1. Récupérer le devis et ses lignes
      const { data: devis, error: devisError } = await supabase
        .from("devis")
        .select("*")
        .eq("id", devisId)
        .single();

      if (devisError) throw devisError;

      const { data: lignes, error: lignesError } = await supabase
        .from("devis_lignes")
        .select("*")
        .eq("devis_id", devisId);

      if (lignesError) throw lignesError;

      // 2. Générer un numéro de facture
      const { data: numeroFacture, error: numError } = await supabase.rpc("generate_numero_facture");
      if (numError) throw numError;

      // 3. Créer la facture
      const { data: facture, error: factureError } = await supabase
        .from("factures")
        .insert({
          numero_facture: numeroFacture,
          contact_id: devis.contact_id,
          session_inscription_id: devis.session_inscription_id,
          type_financement: devis.type_financement,
          montant_total: devis.montant_total,
          date_emission: new Date().toISOString().split("T")[0],
          statut: "emise",
          commentaires: `Converti depuis le devis ${devis.numero_devis}`,
        })
        .select()
        .single();

      if (factureError) throw factureError;

      // 4. Copier les lignes vers facture_lignes
      if (lignes && lignes.length > 0) {
        const factureLignes = lignes.map((ligne, index) => ({
          facture_id: facture.id,
          catalogue_formation_id: ligne.catalogue_formation_id,
          description: ligne.description,
          quantite: ligne.quantite,
          prix_unitaire_ht: ligne.prix_unitaire_ht,
          tva_percent: ligne.tva_percent,
          ordre: index,
        }));

        const { error: lignesFactureError } = await supabase
          .from("facture_lignes")
          .insert(factureLignes);

        if (lignesFactureError) throw lignesFactureError;
      }

      // 5. Mettre à jour le statut du devis
      const { error: updateError } = await supabase
        .from("devis")
        .update({ statut: "converti", facture_id: facture.id })
        .eq("id", devisId);

      if (updateError) throw updateError;

      return facture;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devis"] });
      queryClient.invalidateQueries({ queryKey: ["devis-stats"] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Devis converti en facture avec succès");
    },
    onError: (error: any) => {
      console.error("Error converting devis to facture:", error);
      toast.error("Erreur lors de la conversion en facture");
    },
  });
}
