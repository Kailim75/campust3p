import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ModePaiement = "cb" | "virement" | "cheque" | "especes" | "cpf";

export interface Paiement {
  id: string;
  facture_id: string;
  montant: number;
  date_paiement: string;
  mode_paiement: ModePaiement;
  reference: string | null;
  commentaires: string | null;
  created_at: string;
}

export interface PaiementInsert {
  facture_id: string;
  montant: number;
  date_paiement?: string;
  mode_paiement: ModePaiement;
  reference?: string | null;
  commentaires?: string | null;
}

// Fetch paiements for a facture
export function useFacturePaiements(factureId: string | null) {
  return useQuery({
    queryKey: ["paiements", factureId],
    queryFn: async () => {
      if (!factureId) return [];

      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .eq("facture_id", factureId)
        .order("date_paiement", { ascending: false });

      if (error) throw error;
      return data as Paiement[];
    },
    enabled: !!factureId,
  });
}

// Create paiement
export function useCreatePaiement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paiement: PaiementInsert) => {
      const { data, error } = await supabase
        .from("paiements")
        .insert(paiement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["paiements", variables.facture_id] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
  });
}

// Delete paiement
export function useDeletePaiement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, factureId }: { id: string; factureId: string }) => {
      const { error } = await supabase.from("paiements").delete().eq("id", id);
      if (error) throw error;
      return { factureId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["paiements", result.factureId] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
  });
}
