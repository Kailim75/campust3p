import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SessionFinancialData {
  session_id: string;
  ca_securise: number;       // sum of validated payments
  ca_potentiel: number;      // sum of all invoice totals
  nb_payes: number;          // inscriptions fully paid
  nb_partiel: number;        // inscriptions partially paid
  nb_en_retard: number;      // invoices past due with amount remaining
  total_facture: number;     // total invoiced
  total_paye: number;        // total paid
}

export function useSessionFinancials() {
  return useQuery({
    queryKey: ["session_financials"],
    queryFn: async () => {
      // Single aggregated query: session_inscriptions -> factures -> paiements
      const { data: rawData, error } = await supabase
        .from("session_inscriptions")
        .select(`
          session_id,
          factures:factures!factures_session_inscription_id_fkey (
            id,
            montant_total,
            statut,
            date_echeance,
            paiements:paiements!paiements_facture_id_fkey (
              montant
            )
          )
        `);

      if (error) throw error;

      const map: Record<string, SessionFinancialData> = {};
      const today = new Date().toISOString().split("T")[0];

      for (const inscription of rawData || []) {
        const sid = inscription.session_id;
        if (!map[sid]) {
          map[sid] = {
            session_id: sid,
            ca_securise: 0,
            ca_potentiel: 0,
            nb_payes: 0,
            nb_partiel: 0,
            nb_en_retard: 0,
            total_facture: 0,
            total_paye: 0,
          };
        }

        const entry = map[sid];
        const factures = (inscription as any).factures || [];

        for (const f of factures) {
          const montant = Number(f.montant_total) || 0;
          const paiements = f.paiements || [];
          const totalPaye = paiements.reduce((s: number, p: any) => s + (Number(p.montant) || 0), 0);

          entry.total_facture += montant;
          entry.total_paye += totalPaye;
          entry.ca_potentiel += montant;

          if (f.statut === "payee") {
            entry.ca_securise += totalPaye;
            entry.nb_payes += 1;
          } else if (f.statut === "partiel") {
            entry.ca_securise += totalPaye;
            entry.nb_partiel += 1;
          }

          // En retard: not fully paid and past due date
          if (f.date_echeance && f.date_echeance < today && totalPaye < montant && f.statut !== "annulee") {
            entry.nb_en_retard += 1;
          }
        }
      }

      return map;
    },
    staleTime: 30_000,
  });
}

// Health score calculation
export interface SessionHealthScore {
  score: number;
  level: "saine" | "surveiller" | "danger";
  fillComponent: number;
  caComponent: number;
  calendarComponent: number;
  paymentComponent: number;
}

export function calculateHealthScore(
  inscrits: number,
  placesTotales: number,
  caSecurise: number,
  prix: number,
  dateDebut: string,
  nbPayes: number,
): SessionHealthScore {
  // 1. Fill rate (40%)
  const fillRate = placesTotales > 0 ? (inscrits / placesTotales) * 100 : 0;
  const fillComponent = Math.min(fillRate, 100);

  // 2. CA sécurisé / CA potentiel (30%)
  const caPotentiel = placesTotales * (prix || 0);
  const caComponent = caPotentiel > 0 ? Math.min((caSecurise / caPotentiel) * 100, 100) : 0;

  // 3. Calendar advance (20%)
  const daysUntil = Math.ceil((new Date(dateDebut).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  let calendarComponent = 20;
  if (daysUntil > 30) calendarComponent = 100;
  else if (daysUntil >= 15) calendarComponent = 70;
  else if (daysUntil >= 7) calendarComponent = 40;

  // 4. Payment status (10%)
  const paymentRatio = inscrits > 0 ? nbPayes / inscrits : 0;
  let paymentComponent = 30;
  if (paymentRatio >= 0.8) paymentComponent = 100;
  else if (paymentRatio >= 0.5) paymentComponent = 60;

  const score = Math.round(
    fillComponent * 0.4 +
    caComponent * 0.3 +
    calendarComponent * 0.2 +
    paymentComponent * 0.1
  );

  const level = score >= 80 ? "saine" : score >= 60 ? "surveiller" : "danger";

  return { score, level, fillComponent, caComponent, calendarComponent, paymentComponent };
}
