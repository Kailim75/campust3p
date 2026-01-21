import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PartnerCategory = "assurance" | "comptable" | "medecin" | "banque" | "vehicule" | "autre";

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
      toast.success("Partenaire supprimé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
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
