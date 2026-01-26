import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Legacy category type (for backwards compatibility)
export type PartnerCategory = "assurance" | "comptable" | "medecin" | "banque" | "vehicule" | "autre";

// New partner enums
export type PartnerStatus = "actif" | "inactif" | "suspendu";
export type PartnerType = "apporteur_affaires" | "auto_ecole" | "entreprise" | "organisme_formation" | "prescripteur" | "autre";
export type PartnerRemunerationMode = "commission" | "forfait" | "aucun";
export type ContactOrigin = "site_web" | "bouche_a_oreille" | "partenaire" | "reseaux_sociaux" | "publicite" | "salon" | "autre";

export interface Partner {
  id: string;
  company_name: string;
  category: PartnerCategory;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  centre_id: string | null;
  // New fields
  statut_partenaire: PartnerStatus | null;
  type_partenaire: PartnerType | null;
  zone_geographique: string | null;
  mode_remuneration: PartnerRemunerationMode | null;
  taux_commission: number | null;
  montant_forfait: number | null;
  date_debut_contrat: string | null;
  date_fin_contrat: string | null;
  commission_payee: number | null;
}

export interface PartnerStats {
  partner_id: string;
  company_name: string;
  statut_partenaire: PartnerStatus | null;
  type_partenaire: PartnerType | null;
  mode_remuneration: PartnerRemunerationMode | null;
  taux_commission: number | null;
  montant_forfait: number | null;
  commission_payee: number | null;
  centre_id: string | null;
  nb_apprenants: number;
  ca_genere: number;
  commission_calculee: number;
  commission_restante: number;
}

export interface PartnerInsert {
  company_name: string;
  category?: PartnerCategory;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
  centre_id?: string | null;
  statut_partenaire?: PartnerStatus;
  type_partenaire?: PartnerType;
  zone_geographique?: string | null;
  mode_remuneration?: PartnerRemunerationMode;
  taux_commission?: number;
  montant_forfait?: number;
  date_debut_contrat?: string | null;
  date_fin_contrat?: string | null;
}

export interface PartnerUpdate {
  company_name?: string;
  category?: PartnerCategory;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
  statut_partenaire?: PartnerStatus;
  type_partenaire?: PartnerType;
  zone_geographique?: string | null;
  mode_remuneration?: PartnerRemunerationMode;
  taux_commission?: number;
  montant_forfait?: number;
  date_debut_contrat?: string | null;
  date_fin_contrat?: string | null;
}

export function usePartners() {
  return useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .order("company_name", { ascending: true });

      if (error) throw error;
      return data as Partner[];
    },
  });
}

export function usePartnerStats() {
  return useQuery({
    queryKey: ["partner-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_stats")
        .select("*");

      if (error) throw error;
      return data as PartnerStats[];
    },
  });
}

export function usePartnerStatsById(partnerId: string) {
  return useQuery({
    queryKey: ["partner-stats", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_partner_stats", { p_partner_id: partnerId });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!partnerId,
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partner: PartnerInsert) => {
      const { data, error } = await supabase
        .from("partners")
        .insert(partner)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stats"] });
      toast.success("Partenaire créé avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création du partenaire");
      console.error(error);
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PartnerUpdate }) => {
      const { data, error } = await supabase
        .from("partners")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stats"] });
      toast.success("Partenaire mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partners")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stats"] });
      toast.success("Partenaire supprimé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}

export function usePayPartnerCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ partnerId, amount }: { partnerId: string; amount: number }) => {
      const { data, error } = await supabase
        .rpc("pay_partner_commission", { 
          p_partner_id: partnerId, 
          p_amount: amount 
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stats"] });
      toast.success("Paiement de commission enregistré");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement du paiement");
      console.error(error);
    },
  });
}

// Contact-Partner associations
export interface ContactPartner {
  id: string;
  contact_id: string;
  partner_id: string;
  notes: string | null;
  created_at: string;
  partner?: Partner;
}

export function useContactPartners(contactId: string) {
  return useQuery({
    queryKey: ["contact-partners", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_partners")
        .select(`
          *,
          partner:partners(*)
        `)
        .eq("contact_id", contactId);

      if (error) throw error;
      return data as (ContactPartner & { partner: Partner })[];
    },
    enabled: !!contactId,
  });
}

// Contacts linked to a partner via partenaire_referent_id
export function usePartnerContacts(partnerId: string) {
  return useQuery({
    queryKey: ["partner-contacts", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, nom, prenom, email, telephone, formation, statut, date_apport, origine")
        .eq("partenaire_referent_id", partnerId)
        .eq("archived", false)
        .order("date_apport", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });
}

export function useAssociatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, partnerId, notes }: { contactId: string; partnerId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("contact_partners")
        .insert({ contact_id: contactId, partner_id: partnerId, notes })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-partners", variables.contactId] });
      toast.success("Partenaire associé");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Ce partenaire est déjà associé");
      } else {
        toast.error("Erreur lors de l'association");
      }
      console.error(error);
    },
  });
}

export function useDissociatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from("contact_partners")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ["contact-partners", contactId] });
      toast.success("Association supprimée");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}

// Set partenaire_referent_id on contact
export function useSetContactPartnerReferent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      partnerId, 
      dateApport,
      origine
    }: { 
      contactId: string; 
      partnerId: string | null;
      dateApport?: string;
      origine?: ContactOrigin;
    }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update({ 
          partenaire_referent_id: partnerId,
          date_apport: dateApport || new Date().toISOString().split('T')[0],
          origine: origine || (partnerId ? 'partenaire' : null)
        })
        .eq("id", contactId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ["partner-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stats"] });
      toast.success(variables.partnerId ? "Partenaire référent défini" : "Partenaire référent retiré");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}
