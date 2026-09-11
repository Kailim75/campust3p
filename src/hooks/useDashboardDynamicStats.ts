import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardPeriod } from "./useDashboardPeriod";
import { format, parseISO } from "date-fns";
import {
  filtreFacturesComptees,
  sommeFactures,
  sommePaiementsFacturesPeriode,
} from "@/lib/montants";

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

      // Fetch all contacts (not archived, exclude historical SmartOF from operational KPIs)
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("id, statut, created_at")
        .eq("archived", false)
        .eq("is_historical_import", false);

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
      
      const inscriptionCounts: Record<string, number> = {};
      if (sessionIds.length > 0) {
        const { data: inscriptions, error: inscError } = await supabase
          .from("session_inscriptions")
          .select("session_id")
          .in("session_id", sessionIds)
          .is("deleted_at", null);
        
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

/** Lignes minimales attendues des requêtes ci-dessous (le reste est ignoré). */
export interface FactureLigne {
  id?: string | null;
  montant_total?: number | string | null;
  statut?: string | null;
  date_emission?: string | null;
}

export interface PaiementLigne {
  montant?: number | string | null;
  facture_id?: string | null;
  date_paiement: string;
}

export interface FinancesDynamiques {
  caThisPeriod: number;
  caPreviousPeriod: number;
  payeThisPeriod: number;
  payePreviousPeriod: number;
}

/**
 * CA émis et encaissé de la période courante ET de la précédente.
 *
 * Les quatre montants sortent d'une seule fonction à dessein : l'écran affiche
 * un pourcentage d'évolution entre les deux bornes, et ne corriger que la
 * période courante ferait apparaître une chute du CA là où seuls des brouillons
 * ont cessé d'être comptés.
 *
 * Un BROUILLON ne compte plus dans le CA (il n'est pas encore dû), et le
 * « payé » ne retient que les versements RATTACHÉS à une facture comptée :
 * sommer tous les versements de la période faisait passer le payé au-dessus du
 * facturé affiché juste à côté. Fonction pure, donc testable seule.
 */
export function calculerFinancesDynamiques(
  factures: ReadonlyArray<FactureLigne>,
  paiements: ReadonlyArray<PaiementLigne>,
  currentStart: Date,
  previousStart: Date,
): FinancesDynamiques {
  const emisesEntre = (debut: Date, fin?: Date) =>
    factures.filter((f) => {
      if (!f.date_emission) return false;
      const d = parseISO(f.date_emission);
      return d >= debut && (!fin || d < fin);
    });

  // Rattachement sur TOUTES les factures comptées : un versement de la période
  // peut solder une facture émise avant elle.
  const encaisseEntre = (debut: Date, fin?: Date) =>
    sommePaiementsFacturesPeriode(factures, paiements, (p) => {
      const d = parseISO(p.date_paiement);
      return d >= debut && (!fin || d < fin);
    });

  return {
    caThisPeriod: sommeFactures(emisesEntre(currentStart)),
    caPreviousPeriod: sommeFactures(emisesEntre(previousStart, currentStart)),
    payeThisPeriod: encaisseEntre(currentStart),
    payePreviousPeriod: encaisseEntre(previousStart, currentStart),
  };
}

export function useDynamicFinanceStats() {
  const { getStartDate, getPreviousPeriodStart, selectedPeriod } = useDashboardPeriod();
  
  return useQuery({
    queryKey: ["dashboard", "dynamic-finance-stats", selectedPeriod],
    queryFn: async (): Promise<DynamicFinanceStats> => {
      const currentStart = getStartDate();
      const previousStart = getPreviousPeriodStart();
      
      // Get invoices
      // `deleted_at` : une facture en corbeille ne doit plus peser dans le CA
      // de la période — la suppression est douce dans tout le CRM.
      const { data: factures, error } = await filtreFacturesComptees(
        supabase
          .from("factures")
          .select("id, montant_total, date_emission, statut")
          .is("deleted_at", null),
      );

      if (error) throw error;

      // Get payments
      // `facture_id` est INDISPENSABLE : c'est la clé de rattachement des
      // versements aux factures comptées. Sans elle, le payé retomberait à 0.
      const { data: paiements, error: pError } = await supabase
        .from("paiements")
        .select("montant, date_paiement, facture_id")
        .is("deleted_at", null);

      if (pError) throw pError;

      // CA émis et encaissé des deux périodes, sur la même assiette de factures.
      const { caThisPeriod, caPreviousPeriod, payeThisPeriod, payePreviousPeriod } =
        calculerFinancesDynamiques(factures || [], paiements || [], currentStart, previousStart);

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
