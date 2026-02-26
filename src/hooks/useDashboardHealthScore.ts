import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO } from "date-fns";

export interface HealthScoreData {
  score: number;
  tauxConversion: number;
  tauxRemplissage: number;
  caConfirmeVsObjectif: number;
  nbUrgences: number;
  insights: string[];
  sessionsAtRisk: number;
  manqueAGagner: number;
}

export function useDashboardHealthScore() {
  return useQuery({
    queryKey: ["dashboard", "health-score"],
    queryFn: async (): Promise<HealthScoreData> => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Parallel queries
      const [contactsRes, sessionsRes, inscriptionsRes, facturesRes, paiementsRes, alertsPaymentRes] = await Promise.all([
        supabase.from("contacts").select("id, statut").eq("archived", false),
        supabase.from("sessions").select("id, places_totales, prix, statut, date_debut").eq("archived", false).gte("date_fin", todayStr),
        supabase.from("session_inscriptions").select("session_id"),
        supabase.from("factures").select("montant_total, statut, date_echeance").not("statut", "eq", "annulee"),
        supabase.from("paiements").select("montant"),
        supabase.from("factures").select("id").in("statut", ["emise", "partiel", "impayee"]),
      ]);

      const contacts = contactsRes.data || [];
      const sessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];
      const factures = facturesRes.data || [];
      const paiements = paiementsRes.data || [];
      const unpaidCount = alertsPaymentRes.data?.length || 0;

      // 1. Taux de conversion
      const total = contacts.length;
      const clients = contacts.filter(c => c.statut === "Client" || c.statut === "Bravo").length;
      const tauxConversion = total > 0 ? Math.round((clients / total) * 100) : 0;

      // 2. Taux de remplissage moyen
      const inscriptionCounts: Record<string, number> = {};
      inscriptions.forEach(i => {
        inscriptionCounts[i.session_id] = (inscriptionCounts[i.session_id] || 0) + 1;
      });

      const upcomingSessions = sessions.filter(s => s.statut === "a_venir" || s.statut === "en_cours" || s.statut === "complet");
      let totalPlaces = 0;
      let filledPlaces = 0;
      let sessionsAtRisk = 0;
      let manqueAGagner = 0;

      upcomingSessions.forEach(s => {
        const places = s.places_totales || 0;
        const filled = inscriptionCounts[s.id] || 0;
        const rate = places > 0 ? filled / places : 0;
        totalPlaces += places;
        filledPlaces += filled;

        if (rate < 0.4 && s.date_debut) {
          const daysUntil = differenceInDays(parseISO(s.date_debut), today);
          if (daysUntil <= 30) {
            sessionsAtRisk++;
            manqueAGagner += (places - filled) * Number(s.prix || 0);
          }
        }
      });

      const tauxRemplissage = totalPlaces > 0 ? Math.round((filledPlaces / totalPlaces) * 100) : 0;

      // 3. CA confirmé vs objectif (simplified: payé / facturé)
      const totalFacture = factures.reduce((acc, f) => acc + Number(f.montant_total), 0);
      const totalPaye = paiements.reduce((acc, p) => acc + Number(p.montant), 0);
      const caConfirmeVsObjectif = totalFacture > 0 ? Math.round((totalPaye / totalFacture) * 100) : 100;

      // 4. Count urgences
      const nbUrgences = unpaidCount;

      // Calculate score (weighted)
      const scoreConversion = Math.min(tauxConversion * 1.5, 25); // max 25
      const scoreRemplissage = Math.min(tauxRemplissage * 0.35, 25); // max 25
      const scoreCA = Math.min(caConfirmeVsObjectif * 0.25, 25); // max 25
      const scoreUrgences = Math.max(25 - nbUrgences * 3, 0); // max 25, -3 per urgency

      const score = Math.round(Math.min(scoreConversion + scoreRemplissage + scoreCA + scoreUrgences, 100));

      // Generate insights
      const insights: string[] = [];
      if (sessionsAtRisk > 0) {
        insights.push(`${sessionsAtRisk} session${sessionsAtRisk > 1 ? "s" : ""} sous 40% de remplissage`);
      }
      if (nbUrgences > 0) {
        insights.push(`${nbUrgences} facture${nbUrgences > 1 ? "s" : ""} impayée${nbUrgences > 1 ? "s" : ""}`);
      }
      if (manqueAGagner > 0) {
        insights.push(`Manque à gagner estimé : ${manqueAGagner.toLocaleString("fr-FR")}€`);
      }
      if (tauxConversion < 30) {
        insights.push(`Taux de conversion faible (${tauxConversion}%)`);
      }
      if (insights.length === 0) {
        insights.push("Tous les indicateurs sont au vert");
      }

      return {
        score,
        tauxConversion,
        tauxRemplissage,
        caConfirmeVsObjectif,
        nbUrgences,
        insights,
        sessionsAtRisk,
        manqueAGagner,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
