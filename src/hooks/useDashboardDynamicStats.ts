import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardPeriod } from "./useDashboardPeriod";
import { format, parseISO } from "date-fns";

export interface DynamicContactStats {
  total: number;
  totalPrevious: number;
  totalChange: number;
  clients: number;
  clientsPrevious: number;
  clientsChange: number;
  enAttente: number;
  enAttentePrevious: number;
  enAttenteChange: number;
  bravo: number;
  bravoPrevious: number;
  bravoChange: number;
}

export function useDynamicContactStats() {
  const { getStartDate, getPreviousPeriodStart, selectedPeriod } = useDashboardPeriod();
  
  return useQuery({
    queryKey: ["dashboard", "dynamic-contact-stats", selectedPeriod],
    queryFn: async (): Promise<DynamicContactStats> => {
      const currentStart = getStartDate();
      const previousStart = getPreviousPeriodStart();
      
      const currentStartStr = format(currentStart, "yyyy-MM-dd");
      const previousStartStr = format(previousStart, "yyyy-MM-dd");

      // Fetch all contacts (not archived)
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("id, statut, created_at")
        .eq("archived", false);

      if (error) throw error;

      // Current period stats
      const currentContacts = contacts?.filter(c => 
        c.created_at && parseISO(c.created_at) >= currentStart
      ) || [];
      
      // Previous period stats
      const previousContacts = contacts?.filter(c => 
        c.created_at && parseISO(c.created_at) >= previousStart && parseISO(c.created_at) < currentStart
      ) || [];

      // Calculate totals
      const total = contacts?.length || 0;
      const totalPrevious = previousContacts.length;
      const totalCurrent = currentContacts.length;
      
      // Calculate by status - for all time
      const clients = contacts?.filter(c => c.statut === "Client").length || 0;
      const enAttente = contacts?.filter(c => c.statut === "En attente de validation").length || 0;
      const bravo = contacts?.filter(c => c.statut === "Bravo").length || 0;
      
      // Previous period by status
      const clientsPrevious = previousContacts.filter(c => c.statut === "Client").length;
      const enAttentePrevious = previousContacts.filter(c => c.statut === "En attente de validation").length;
      const bravoPrevious = previousContacts.filter(c => c.statut === "Bravo").length;
      
      // Current period by status
      const clientsCurrent = currentContacts.filter(c => c.statut === "Client").length;
      const enAttenteCurrent = currentContacts.filter(c => c.statut === "En attente de validation").length;
      const bravoCurrent = currentContacts.filter(c => c.statut === "Bravo").length;

      // Calculate percentage changes (current vs previous period new entries)
      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        total,
        totalPrevious,
        totalChange: calcChange(totalCurrent, totalPrevious),
        clients,
        clientsPrevious,
        clientsChange: calcChange(clientsCurrent, clientsPrevious),
        enAttente,
        enAttentePrevious,
        enAttenteChange: calcChange(enAttenteCurrent, enAttentePrevious),
        bravo,
        bravoPrevious,
        bravoChange: calcChange(bravoCurrent, bravoPrevious),
      };
    },
  });
}

export interface DynamicSessionStats {
  upcomingSessions: number;
  upcomingChange: number;
  totalPlaces: number;
  filledPlaces: number;
  fillRate: number;
}

export function useDynamicSessionStats() {
  const { selectedPeriod } = useDashboardPeriod();
  
  return useQuery({
    queryKey: ["dashboard", "dynamic-session-stats", selectedPeriod],
    queryFn: async (): Promise<DynamicSessionStats> => {
      const today = new Date().toISOString().split("T")[0];
      
      // Upcoming sessions
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("id, places_totales, statut")
        .gte("date_fin", today);

      if (error) throw error;

      // Get inscriptions for these sessions
      const sessionIds = sessions?.map(s => s.id) || [];
      
      let inscriptionCounts: Record<string, number> = {};
      if (sessionIds.length > 0) {
        const { data: inscriptions, error: inscError } = await supabase
          .from("session_inscriptions")
          .select("session_id")
          .in("session_id", sessionIds);
        
        if (inscError) throw inscError;
        
        inscriptions?.forEach(i => {
          inscriptionCounts[i.session_id] = (inscriptionCounts[i.session_id] || 0) + 1;
        });
      }

      const totalPlaces = sessions?.reduce((acc, s) => acc + (s.places_totales || 0), 0) || 0;
      const filledPlaces = Object.values(inscriptionCounts).reduce((acc, c) => acc + c, 0);
      const fillRate = totalPlaces > 0 ? Math.round((filledPlaces / totalPlaces) * 100) : 0;

      return {
        upcomingSessions: sessions?.length || 0,
        upcomingChange: 0, // Could be calculated with historical data
        totalPlaces,
        filledPlaces,
        fillRate,
      };
    },
  });
}

export interface DynamicFinanceStats {
  caThisPeriod: number;
  caPreviousPeriod: number;
  caChange: number;
  payeThisPeriod: number;
  payePreviousPeriod: number;
  payeChange: number;
}

export function useDynamicFinanceStats() {
  const { getStartDate, getPreviousPeriodStart, selectedPeriod } = useDashboardPeriod();
  
  return useQuery({
    queryKey: ["dashboard", "dynamic-finance-stats", selectedPeriod],
    queryFn: async (): Promise<DynamicFinanceStats> => {
      const currentStart = getStartDate();
      const previousStart = getPreviousPeriodStart();
      
      // Get invoices
      const { data: factures, error } = await supabase
        .from("factures")
        .select("montant_total, date_emission, statut")
        .not("statut", "eq", "annulee");

      if (error) throw error;

      // Get payments
      const { data: paiements, error: pError } = await supabase
        .from("paiements")
        .select("montant, date_paiement");

      if (pError) throw pError;

      // Calculate CA for periods
      const caThisPeriod = (factures || [])
        .filter(f => f.date_emission && parseISO(f.date_emission) >= currentStart)
        .reduce((acc, f) => acc + Number(f.montant_total), 0);

      const caPreviousPeriod = (factures || [])
        .filter(f => f.date_emission && parseISO(f.date_emission) >= previousStart && parseISO(f.date_emission) < currentStart)
        .reduce((acc, f) => acc + Number(f.montant_total), 0);

      // Calculate payments for periods
      const payeThisPeriod = (paiements || [])
        .filter(p => parseISO(p.date_paiement) >= currentStart)
        .reduce((acc, p) => acc + Number(p.montant), 0);

      const payePreviousPeriod = (paiements || [])
        .filter(p => parseISO(p.date_paiement) >= previousStart && parseISO(p.date_paiement) < currentStart)
        .reduce((acc, p) => acc + Number(p.montant), 0);

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        caThisPeriod,
        caPreviousPeriod,
        caChange: calcChange(caThisPeriod, caPreviousPeriod),
        payeThisPeriod,
        payePreviousPeriod,
        payeChange: calcChange(payeThisPeriod, payePreviousPeriod),
      };
    },
  });
}
