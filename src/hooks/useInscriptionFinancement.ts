import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TypePayeur = "apprenant" | "entreprise" | "mixte" | "opco" | "autre";

export interface InscriptionFinancement {
  id: string;
  session_id: string;
  contact_id: string;
  type_payeur: TypePayeur;
  payeur_partner_id: string | null;
  montant_formation: number;
  montant_pris_en_charge: number;
  reste_a_charge: number;
  statut: string;
  statut_paiement: string | null;
  session: {
    id: string;
    nom: string;
    formation_type: string;
    date_debut: string | null;
    date_fin: string | null;
    prix: number | null;
  } | null;
  payeur_partner: {
    id: string;
    company_name: string;
    email: string | null;
    address: string | null;
  } | null;
}

export interface UpdateFinancementParams {
  inscription_id: string;
  type_payeur: TypePayeur;
  payeur_partner_id?: string | null;
  montant_formation?: number;
  montant_pris_en_charge?: number;
}

/**
 * Hook to fetch financing data for all inscriptions of a contact.
 * Source of truth: session_inscriptions table.
 */
export function useContactFinancement(contactId: string | null) {
  return useQuery({
    queryKey: ["contact-financement", contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from("session_inscriptions")
        .select(`
          id,
          session_id,
          contact_id,
          type_payeur,
          payeur_partner_id,
          montant_formation,
          montant_pris_en_charge,
          reste_a_charge,
          statut,
          statut_paiement,
          session:sessions(id, nom, formation_type, date_debut, date_fin, prix),
          payeur_partner:partners!session_inscriptions_payeur_partner_id_fkey(id, company_name, email, address)
        `)
        .eq("contact_id", contactId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as InscriptionFinancement[];
    },
    enabled: !!contactId,
  });
}

/**
 * Mutation to update financing info on an inscription.
 */
export function useUpdateFinancement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateFinancementParams) => {
      const { inscription_id, ...updates } = params;

      const { data, error } = await supabase
        .from("session_inscriptions")
        .update(updates as any)
        .eq("id", inscription_id)
        .select("id, type_payeur, montant_formation, montant_pris_en_charge, reste_a_charge")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ["contact-financement"] });
      queryClient.invalidateQueries({ queryKey: ["session-inscrits-detail"] });
      toast.success("Financement mis à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour du financement");
    },
  });
}

/** Labels for type_payeur */
export const typePayeurLabels: Record<TypePayeur, string> = {
  apprenant: "Autofinancé",
  entreprise: "Entreprise",
  mixte: "Financement mixte",
  opco: "OPCO",
  autre: "Financeur externe",
};

/** Badge variant for type_payeur */
export const typePayeurBadgeClass: Record<TypePayeur, string> = {
  apprenant: "bg-muted text-muted-foreground",
  entreprise: "bg-primary/15 text-primary",
  mixte: "bg-warning/15 text-warning",
  opco: "bg-accent/15 text-accent-foreground",
  autre: "bg-secondary text-secondary-foreground",
};
