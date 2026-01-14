import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export interface MonthlyCA {
  mois: string;
  moisLabel: string;
  ca: number;
  paye: number;
}

export interface FormationStats {
  formation: string;
  count: number;
  ca: number;
}

export interface InscriptionTrend {
  mois: string;
  moisLabel: string;
  inscriptions: number;
}

// CA mensuel sur les 12 derniers mois
export function useMonthlyCA() {
  return useQuery({
    queryKey: ["dashboard", "monthly-ca"],
    queryFn: async () => {
      const now = new Date();
      const months: MonthlyCA[] = [];

      // Récupérer les factures avec leur date d'émission
      const { data: factures, error } = await supabase
        .from("factures")
        .select("id, montant_total, date_emission, statut")
        .not("statut", "eq", "annulee");

      if (error) throw error;

      // Récupérer les paiements avec leur date
      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("montant, date_paiement, facture_id");

      if (paiementsError) throw paiementsError;

      // Créer un map des paiements par facture
      const paiementsByFacture = (paiements || []).reduce((acc, p) => {
        if (!acc[p.facture_id]) acc[p.facture_id] = [];
        acc[p.facture_id].push(p);
        return acc;
      }, {} as Record<string, typeof paiements>);

      // Générer les 12 derniers mois
      for (let i = 11; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const mois = format(monthStart, "yyyy-MM");
        const moisLabel = format(monthStart, "MMM yy", { locale: fr });

        // CA émis ce mois (basé sur date_emission)
        const caEmis = (factures || [])
          .filter((f) => f.date_emission && format(parseISO(f.date_emission), "yyyy-MM") === mois)
          .reduce((acc, f) => acc + Number(f.montant_total), 0);

        // Paiements reçus ce mois
        const payeThisMonth = (paiements || [])
          .filter((p) => format(parseISO(p.date_paiement), "yyyy-MM") === mois)
          .reduce((acc, p) => acc + Number(p.montant), 0);

        months.push({
          mois,
          moisLabel,
          ca: caEmis,
          paye: payeThisMonth,
        });
      }

      return months;
    },
  });
}

// Répartition par type de formation
export function useFormationStats() {
  return useQuery({
    queryKey: ["dashboard", "formation-stats"],
    queryFn: async () => {
      // Récupérer les inscriptions avec leur session
      const { data: inscriptions, error } = await supabase
        .from("session_inscriptions")
        .select(`
          id,
          sessions (
            formation_type,
            prix
          )
        `);

      if (error) throw error;

      // Récupérer les factures pour le CA
      const { data: factures, error: facturesError } = await supabase
        .from("factures")
        .select(`
          montant_total,
          session_inscription:session_inscriptions (
            sessions (
              formation_type
            )
          )
        `)
        .not("statut", "eq", "annulee");

      if (facturesError) throw facturesError;

      // Compter par formation
      const stats: Record<string, FormationStats> = {};

      (inscriptions || []).forEach((insc: any) => {
        const formation = insc.sessions?.formation_type || "Non défini";
        if (!stats[formation]) {
          stats[formation] = { formation, count: 0, ca: 0 };
        }
        stats[formation].count += 1;
      });

      // Ajouter le CA par formation
      (factures || []).forEach((f: any) => {
        const formation = f.session_inscription?.sessions?.formation_type || "Autre";
        if (!stats[formation]) {
          stats[formation] = { formation, count: 0, ca: 0 };
        }
        stats[formation].ca += Number(f.montant_total);
      });

      return Object.values(stats).sort((a, b) => b.count - a.count);
    },
  });
}

// Évolution des inscriptions sur 6 mois
export function useInscriptionTrend() {
  return useQuery({
    queryKey: ["dashboard", "inscription-trend"],
    queryFn: async () => {
      const now = new Date();
      const months: InscriptionTrend[] = [];

      const { data: inscriptions, error } = await supabase
        .from("session_inscriptions")
        .select("date_inscription");

      if (error) throw error;

      // Générer les 6 derniers mois
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const mois = format(monthStart, "yyyy-MM");
        const moisLabel = format(monthStart, "MMMM", { locale: fr });

        const count = (inscriptions || []).filter(
          (insc) => format(parseISO(insc.date_inscription), "yyyy-MM") === mois
        ).length;

        months.push({
          mois,
          moisLabel,
          inscriptions: count,
        });
      }

      return months;
    },
  });
}

// Stats financières globales
export function useFinancialSummary() {
  return useQuery({
    queryKey: ["dashboard", "financial-summary"],
    queryFn: async () => {
      const { data: factures, error } = await supabase
        .from("factures")
        .select("montant_total, statut")
        .not("statut", "eq", "annulee");

      if (error) throw error;

      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("montant");

      if (paiementsError) throw paiementsError;

      const totalFacture = (factures || []).reduce((acc, f) => acc + Number(f.montant_total), 0);
      const totalPaye = (paiements || []).reduce((acc, p) => acc + Number(p.montant), 0);
      const totalImpaye = totalFacture - totalPaye;

      const enAttente = (factures || [])
        .filter((f) => f.statut === "emise" || f.statut === "partiel")
        .reduce((acc, f) => acc + Number(f.montant_total), 0);

      return {
        totalFacture,
        totalPaye,
        totalImpaye,
        enAttente,
        tauxRecouvrement: totalFacture > 0 ? Math.round((totalPaye / totalFacture) * 100) : 0,
      };
    },
  });
}

// Taux de conversion prospects -> clients
export function useConversionRate() {
  return useQuery({
    queryKey: ["dashboard", "conversion-rate"],
    queryFn: async () => {
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("statut, created_at")
        .eq("archived", false);

      if (error) throw error;

      const total = contacts?.length || 0;
      
      // Prospects = en attente de validation
      const prospects = contacts?.filter((c) => 
        c.statut === "En attente de validation"
      ).length || 0;
      
      // Clients = Client ou Bravo (formations terminées)
      const clients = contacts?.filter((c) => 
        c.statut === "Client" || c.statut === "Bravo"
      ).length || 0;

      // Calcul du taux de conversion (clients / total contacts)
      const tauxConversion = total > 0 ? Math.round((clients / total) * 100) : 0;

      return {
        total,
        prospects,
        clients,
        tauxConversion,
      };
    },
  });
}

export interface CAParSource {
  source: string;
  ca: number;
  count: number;
}

// CA par source de lead
export function useCAParSource() {
  return useQuery({
    queryKey: ["dashboard", "ca-par-source"],
    queryFn: async () => {
      // Récupérer les factures avec les contacts et leur source
      const { data: factures, error } = await supabase
        .from("factures")
        .select(`
          montant_total,
          statut,
          contact:contacts (
            source
          )
        `)
        .not("statut", "eq", "annulee");

      if (error) throw error;

      // Grouper par source
      const sourceStats: Record<string, CAParSource> = {};

      (factures || []).forEach((f: any) => {
        const source = f.contact?.source || "Non défini";
        if (!sourceStats[source]) {
          sourceStats[source] = { source, ca: 0, count: 0 };
        }
        sourceStats[source].ca += Number(f.montant_total);
        sourceStats[source].count += 1;
      });

      return Object.values(sourceStats).sort((a, b) => b.ca - a.ca);
    },
  });
}
