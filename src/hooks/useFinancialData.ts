import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from "date-fns";

export type Periode = "mois" | "trimestre" | "annee" | "personnalise";

export interface PeriodRange {
  start: string; // yyyy-MM-dd
  end: string;   // yyyy-MM-dd
  prevStart: string;
  prevEnd: string;
}

export function computePeriodRange(periode: Periode, customStart?: Date, customEnd?: Date): PeriodRange {
  const now = new Date();
  let start: Date, end: Date, prevStart: Date, prevEnd: Date;

  switch (periode) {
    case "mois":
      start = startOfMonth(now);
      end = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 1));
      prevEnd = endOfMonth(subMonths(now, 1));
      break;
    case "trimestre":
      start = startOfQuarter(now);
      end = endOfQuarter(now);
      prevStart = startOfQuarter(subQuarters(now, 1));
      prevEnd = endOfQuarter(subQuarters(now, 1));
      break;
    case "annee":
      start = startOfYear(now);
      end = endOfYear(now);
      prevStart = startOfYear(subYears(now, 1));
      prevEnd = endOfYear(subYears(now, 1));
      break;
    case "personnalise":
      start = customStart || startOfMonth(now);
      end = customEnd || endOfMonth(now);
      const diff = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diff);
      break;
    default:
      start = startOfMonth(now);
      end = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 1));
      prevEnd = endOfMonth(subMonths(now, 1));
  }

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
    prevStart: format(prevStart, "yyyy-MM-dd"),
    prevEnd: format(prevEnd, "yyyy-MM-dd"),
  };
}

// ── Versements (CA encaissé) ──
export function useVersements(range: PeriodRange) {
  return useQuery({
    queryKey: ["financial-versements", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("versements")
        .select("id, montant, date_encaissement, mode, reference, notes, paiement_id")
        .gte("date_encaissement", range.start)
        .lte("date_encaissement", range.end)
        .order("date_encaissement", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useVersementsPrev(range: PeriodRange) {
  return useQuery({
    queryKey: ["financial-versements-prev", range.prevStart, range.prevEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("versements")
        .select("montant, mode")
        .gte("date_encaissement", range.prevStart)
        .lte("date_encaissement", range.prevEnd);
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Versements enrichis (avec contact info via paiement → facture → contact) ──
export function useVersementsEnriched(range: PeriodRange) {
  return useQuery({
    queryKey: ["financial-versements-enriched", range.start, range.end],
    queryFn: async () => {
      // Get versements
      const { data: versements, error: e1 } = await supabase
        .from("versements")
        .select("id, montant, date_encaissement, mode, reference, notes, paiement_id")
        .gte("date_encaissement", range.start)
        .lte("date_encaissement", range.end)
        .order("date_encaissement", { ascending: false });
      if (e1) throw e1;
      if (!versements?.length) return [];

      // Get paiement IDs
      const paiementIds = [...new Set(versements.map(v => v.paiement_id))];
      
      // Get paiements with facture info
      const { data: paiements, error: e2 } = await supabase
        .from("paiements")
        .select("id, facture_id")
        .in("id", paiementIds);
      if (e2) throw e2;

      const factureIds = [...new Set((paiements || []).map(p => p.facture_id))];
      
      // Get factures with contact info
      const { data: factures, error: e3 } = await supabase
        .from("factures")
        .select("id, contact_id, contacts(id, nom, prenom, formation)")
        .in("id", factureIds);
      if (e3) throw e3;

      // Build lookup maps
      const paiementMap = new Map((paiements || []).map(p => [p.id, p]));
      const factureMap = new Map((factures || []).map(f => [f.id, f]));

      return versements.map(v => {
        const paiement = paiementMap.get(v.paiement_id);
        const facture = paiement ? factureMap.get(paiement.facture_id) : null;
        const contact = (facture as any)?.contacts;
        return {
          ...v,
          contactNom: contact ? `${contact.prenom} ${contact.nom}` : "—",
          contactId: contact?.id,
          formation: contact?.formation || "—",
        };
      });
    },
  });
}

// ── Charges ──
export function useCharges(range: PeriodRange) {
  return useQuery({
    queryKey: ["financial-charges", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charges")
        .select("*")
        .gte("date_charge", range.start)
        .lte("date_charge", range.end)
        .order("date_charge", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useChargesPrev(range: PeriodRange) {
  return useQuery({
    queryKey: ["financial-charges-prev", range.prevStart, range.prevEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charges")
        .select("montant, type_charge, statut")
        .gte("date_charge", range.prevStart)
        .lte("date_charge", range.prevEnd)
        .eq("statut", "active");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAllCharges() {
  return useQuery({
    queryKey: ["financial-all-charges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charges")
        .select("*")
        .eq("statut", "active")
        .order("date_charge", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRecurringCharges() {
  return useQuery({
    queryKey: ["financial-recurring-charges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charges")
        .select("*")
        .eq("statut", "active")
        .in("periodicite", ["mensuelle", "trimestrielle", "annuelle"])
        .order("libelle", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Mutations ──
export function useCreateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (charge: {
      categorie: string;
      type_charge: string;
      libelle: string;
      montant: number;
      date_charge: string;
      periodicite: string;
      prestataire?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("charges")
        .insert(charge as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-charges"] });
      qc.invalidateQueries({ queryKey: ["financial-all-charges"] });
      qc.invalidateQueries({ queryKey: ["financial-recurring-charges"] });
    },
  });
}

export function useUpdateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("charges").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-charges"] });
      qc.invalidateQueries({ queryKey: ["financial-all-charges"] });
      qc.invalidateQueries({ queryKey: ["financial-recurring-charges"] });
    },
  });
}

export function useCancelCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("charges")
        .update({ statut: "annulee" as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-charges"] });
      qc.invalidateQueries({ queryKey: ["financial-all-charges"] });
      qc.invalidateQueries({ queryKey: ["financial-recurring-charges"] });
    },
  });
}

// ── Parametres Financiers ──
export function useParametresFinanciers() {
  return useQuery({
    queryKey: ["parametres-financiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametres_financiers")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || {
        id: null,
        prix_moyen_taxi: 990,
        prix_moyen_vtc: 990,
        prix_moyen_vmdtr: 990,
        prix_moyen_recyclage: 350,
        regime_tva: false,
        devise: "EUR",
      };
    },
  });
}

export function useUpsertParametres() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id?: string | null;
      prix_moyen_taxi: number;
      prix_moyen_vtc: number;
      prix_moyen_vmdtr: number;
      prix_moyen_recyclage: number;
    }) => {
      if (params.id) {
        const { error } = await supabase
          .from("parametres_financiers")
          .update({
            prix_moyen_taxi: params.prix_moyen_taxi,
            prix_moyen_vtc: params.prix_moyen_vtc,
            prix_moyen_vmdtr: params.prix_moyen_vmdtr,
            prix_moyen_recyclage: params.prix_moyen_recyclage,
          })
          .eq("id", params.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("parametres_financiers")
          .insert({
            prix_moyen_taxi: params.prix_moyen_taxi,
            prix_moyen_vtc: params.prix_moyen_vtc,
            prix_moyen_vmdtr: params.prix_moyen_vmdtr,
            prix_moyen_recyclage: params.prix_moyen_recyclage,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres-financiers"] });
    },
  });
}

// ── Budget Prévisionnel ──
export function useBudgetPrevisionnel(annee: number) {
  return useQuery({
    queryKey: ["budget-previsionnel", annee],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_previsionnel")
        .select("*")
        .eq("annee", annee)
        .order("mois", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      annee: number;
      mois: number;
      type: string;
      categorie: string;
      montant_prevu: number;
    }) => {
      // Try to find existing
      const { data: existing } = await supabase
        .from("budget_previsionnel")
        .select("id")
        .eq("annee", entry.annee)
        .eq("mois", entry.mois)
        .eq("type", entry.type as any)
        .eq("categorie", entry.categorie)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("budget_previsionnel")
          .update({ montant_prevu: entry.montant_prevu })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("budget_previsionnel")
          .insert(entry as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-previsionnel"] });
    },
  });
}

// ── 12-Month History ──
export function use12MonthsHistory() {
  return useQuery({
    queryKey: ["financial-12months-history"],
    queryFn: async () => {
      const now = new Date();
      const results: { month: string; monthKey: string; ca: number; charges: number; resultat: number }[] = [];

      for (let i = 11; i >= 0; i--) {
        const m = subMonths(now, i);
        const mStart = format(startOfMonth(m), "yyyy-MM-dd");
        const mEnd = format(endOfMonth(m), "yyyy-MM-dd");
        const monthLabel = format(m, "MMM yy");

        const [versRes, chargesRes] = await Promise.all([
          supabase.from("versements").select("montant").gte("date_encaissement", mStart).lte("date_encaissement", mEnd),
          supabase.from("charges").select("montant").gte("date_charge", mStart).lte("date_charge", mEnd).eq("statut", "active" as any),
        ]);

        const ca = (versRes.data || []).reduce((s, v) => s + Number(v.montant), 0);
        const ch = (chargesRes.data || []).reduce((s, c) => s + Number(c.montant), 0);

        results.push({ month: monthLabel, monthKey: mStart, ca, charges: ch, resultat: ca - ch });
      }
      return results;
    },
    staleTime: 5 * 60 * 1000,
  });
}
