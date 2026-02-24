import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types for factures (manually defined since types.ts hasn't updated yet)
export type FinancementType = "personnel" | "entreprise" | "cpf" | "opco";
export type FactureStatut = "brouillon" | "emise" | "payee" | "partiel" | "impayee" | "annulee";

export interface Facture {
  id: string;
  contact_id: string;
  session_inscription_id: string | null;
  numero_facture: string;
  montant_total: number;
  type_financement: FinancementType;
  statut: FactureStatut;
  date_emission: string | null;
  date_echeance: string | null;
  commentaires: string | null;
  created_at: string;
  updated_at: string;
}

export interface FactureWithDetails extends Facture {
  contact: {
    id: string;
    nom: string;
    prenom: string;
    email: string | null;
    telephone: string | null;
  } | null;
  session_inscription: {
    id: string;
    session: {
      id: string;
      nom: string;
      formation_type: string;
      date_debut: string | null;
      date_fin: string | null;
      duree_heures: number | null;
      catalogue_formation: {
        id: string;
        intitule: string;
        code: string;
      } | null;
    } | null;
  } | null;
  total_paye: number;
}

export interface FactureInsert {
  contact_id: string;
  session_inscription_id?: string | null;
  numero_facture: string;
  montant_total: number;
  type_financement?: FinancementType;
  statut?: FactureStatut;
  date_emission?: string | null;
  date_echeance?: string | null;
  commentaires?: string | null;
}

export interface FactureUpdate {
  contact_id?: string;
  session_inscription_id?: string | null;
  montant_total?: number;
  type_financement?: FinancementType;
  statut?: FactureStatut;
  date_emission?: string | null;
  date_echeance?: string | null;
  commentaires?: string | null;
}

// Fetch all factures with contact and session details
export function useFactures() {
  return useQuery({
    queryKey: ["factures"],
    queryFn: async () => {
      // First fetch factures with contact and session inscription
      const { data: factures, error } = await supabase
        .from("factures")
        .select(`
          *,
          contact:contacts(id, nom, prenom, email, telephone),
          session_inscription:session_inscriptions(
            id,
            session:sessions(id, nom, formation_type, date_debut, date_fin, duree_heures, catalogue_formation:catalogue_formations(id, intitule, code))
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch all paiements to calculate total paid for each facture
      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("facture_id, montant");

      if (paiementsError) throw paiementsError;

      // Calculate total paid per facture
      const paiementsMap = (paiements || []).reduce((acc, p) => {
        acc[p.facture_id] = (acc[p.facture_id] || 0) + Number(p.montant);
        return acc;
      }, {} as Record<string, number>);

      return (factures || []).map((f) => ({
        ...f,
        total_paye: paiementsMap[f.id] || 0,
      })) as FactureWithDetails[];
    },
  });
}

// Fetch factures for a specific contact
export function useContactFactures(contactId: string | null) {
  return useQuery({
    queryKey: ["factures", "contact", contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data: factures, error } = await supabase
        .from("factures")
        .select(`
          *,
          session_inscription:session_inscriptions(
            id,
            session:sessions(id, nom, formation_type, date_debut, date_fin, duree_heures, catalogue_formation:catalogue_formations(id, intitule, code))
          )
        `)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch paiements for these factures
      const factureIds = (factures || []).map((f) => f.id);
      if (factureIds.length === 0) return [];

      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("facture_id, montant")
        .in("facture_id", factureIds);

      if (paiementsError) throw paiementsError;

      const paiementsMap = (paiements || []).reduce((acc, p) => {
        acc[p.facture_id] = (acc[p.facture_id] || 0) + Number(p.montant);
        return acc;
      }, {} as Record<string, number>);

      return (factures || []).map((f) => ({
        ...f,
        total_paye: paiementsMap[f.id] || 0,
      }));
    },
    enabled: !!contactId,
  });
}

// Fetch a single facture
export function useFacture(id: string | null) {
  return useQuery({
    queryKey: ["factures", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("factures")
        .select(`
          *,
          contact:contacts(id, nom, prenom, email, telephone),
          session_inscription:session_inscriptions(
            id,
            session:sessions(id, nom, formation_type, date_debut, date_fin, duree_heures, catalogue_formation:catalogue_formations(id, intitule, code))
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch total paid
      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("montant")
        .eq("facture_id", id);

      if (paiementsError) throw paiementsError;

      const total_paye = (paiements || []).reduce((acc, p) => acc + Number(p.montant), 0);

      return { ...data, total_paye } as FactureWithDetails;
    },
    enabled: !!id,
  });
}

// Generate next invoice number
export function useGenerateNumeroFacture() {
  return useQuery({
    queryKey: ["factures", "generate-numero"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("generate_numero_facture");
      if (error) throw error;
      return data as string;
    },
  });
}

// Create facture
export function useCreateFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (facture: FactureInsert) => {
      const { data, error } = await supabase
        .from("factures")
        .insert(facture)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
  });
}

// Update facture
export function useUpdateFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FactureUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("factures")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
  });
}

// Delete facture
export function useDeleteFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("factures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
  });
}

// Stats for dashboard
export function useFacturesStats() {
  return useQuery({
    queryKey: ["factures", "stats"],
    queryFn: async () => {
      const { data: factures, error } = await supabase
        .from("factures")
        .select("id, montant_total, statut");

      if (error) throw error;

      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("montant");

      if (paiementsError) throw paiementsError;

      const total = (factures || []).reduce((acc, f) => acc + Number(f.montant_total), 0);
      const paye = (paiements || []).reduce((acc, p) => acc + Number(p.montant), 0);
      const impaye = total - paye;

      return { total, paye, impaye };
    },
  });
}
