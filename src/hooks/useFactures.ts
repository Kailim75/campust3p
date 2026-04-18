import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUserCentreId } from "@/utils/getCentreId";
import { useSoftDeleteWithUndo } from "@/hooks/useUndoableAction";

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
    civilite?: string | null;
    rue?: string | null;
    code_postal?: string | null;
    ville?: string | null;
  } | null;
  session_inscription: {
    id: string;
    type_payeur: string | null;
    payeur_partner_id: string | null;
    montant_formation: number | null;
    montant_pris_en_charge: number | null;
    reste_a_charge: number | null;
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
    payeur_partner: {
      id: string;
      company_name: string;
      email: string | null;
      address: string | null;
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
// Shared select for facture queries with financing data
const FACTURE_SELECT = `
  *,
  contact:contacts(id, nom, prenom, email, telephone, civilite, rue, code_postal, ville),
  session_inscription:session_inscriptions(
    id,
    type_payeur,
    payeur_partner_id,
    montant_formation,
    montant_pris_en_charge,
    reste_a_charge,
    session:sessions(id, nom, formation_type, date_debut, date_fin, duree_heures, catalogue_formation:catalogue_formations(id, intitule, code)),
    payeur_partner:partners!session_inscriptions_payeur_partner_id_fkey(id, company_name, email, address)
  )
`;

// Fetch all factures with contact, session details and payment totals in parallel
export function useFactures() {
  return useQuery({
    queryKey: ["factures"],
    queryFn: async () => {
      // Run both queries in parallel for performance
      const [facturesRes, paiementsRes] = await Promise.all([
        supabase
          .from("factures")
          .select(FACTURE_SELECT)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("paiements")
          .select("facture_id, montant")
          .is("deleted_at", null),
      ]);

      if (facturesRes.error) throw facturesRes.error;
      if (paiementsRes.error) throw paiementsRes.error;

      // Calculate total paid per facture using a single pass
      const paiementsMap: Record<string, number> = {};
      for (const p of paiementsRes.data || []) {
        paiementsMap[p.facture_id] = (paiementsMap[p.facture_id] || 0) + Number(p.montant);
      }

      return (facturesRes.data || []).map((f) => ({
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
        .select(FACTURE_SELECT)
        .eq("contact_id", contactId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch paiements for these factures
      const factureIds = (factures || []).map((f) => f.id);
      if (factureIds.length === 0) return [];

      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("facture_id, montant")
        .in("facture_id", factureIds)
        .is("deleted_at", null);

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
        .select(FACTURE_SELECT)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch total paid
      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("montant")
        .eq("facture_id", id)
        .is("deleted_at", null);

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
      const centreId = await getUserCentreId();
      const { data, error } = await supabase
        .from("factures")
        .insert({ ...facture, centre_id: centreId } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création de la facture : " + error.message);
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
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour de la facture : " + error.message);
    },
  });
}

// Delete facture
export function useDeleteFacture() {
  const softDelete = useSoftDeleteWithUndo();

  return {
    mutate: (id: string) => {
      softDelete({ table: "factures", id, message: "Facture supprimée" });
    },
    mutateAsync: async (id: string) => {
      await softDelete({ table: "factures", id, message: "Facture supprimée" });
    },
    isPending: false,
  };
}

// Bulk emit draft factures
export function useBulkEmitFactures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const now = new Date().toISOString().split("T")[0];
      const results = [];
      for (const id of ids) {
        const { data, error } = await supabase
          .from("factures")
          .update({ statut: "emise" as any, date_emission: now })
          .eq("id", id)
          .eq("statut", "brouillon" as any)
          .select("id")
          .single();
        if (!error && data) results.push(data);
      }
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      toast.success(`${data.length} facture(s) émise(s) avec succès`);
    },
    onError: () => {
      toast.error("Erreur lors de l'émission des factures");
    },
  });
}

// Stats for dashboard - derive from useFactures cache when available
export function useFacturesStats() {
  return useQuery({
    queryKey: ["factures", "stats"],
    queryFn: async () => {
      // Run both queries in parallel
      const [facturesRes, paiementsRes] = await Promise.all([
        supabase.from("factures").select("id, montant_total, statut").is("deleted_at", null),
        supabase.from("paiements").select("montant").is("deleted_at", null),
      ]);

      if (facturesRes.error) throw facturesRes.error;
      if (paiementsRes.error) throw paiementsRes.error;

      // Exclude brouillons from totals — they are not yet committed revenue
      const allFactures = facturesRes.data || [];
      const activeFactures = allFactures.filter(f => f.statut !== "brouillon");
      const brouillonCount = allFactures.length - activeFactures.length;
      const brouillonMontant = allFactures
        .filter(f => f.statut === "brouillon")
        .reduce((s, f) => s + Number(f.montant_total), 0);

      let total = 0;
      for (const f of activeFactures) total += Number(f.montant_total);
      let paye = 0;
      for (const p of paiementsRes.data || []) paye += Number(p.montant);

      return { total, paye, impaye: total - paye, brouillonCount, brouillonMontant };
    },
  });
}
