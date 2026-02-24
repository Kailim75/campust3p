import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  differenceInDays,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
} from "date-fns";

export interface TreasuryKPIs {
  // Temps moyen d'encaissement (jours)
  delaiEncaissementMoyen: number;
  delaiEncaissementMoisPrecedent: number;
  // Taux de relances efficaces (%)
  tauxRelancesEfficaces: number;
  tauxRelancesEfficacesMoisPrecedent: number;
  // Score Trésorerie (0-100)
  scoreTresorerie: number;
  scoreTresorerieLevel: "healthy" | "warning" | "danger";
  // Vue mensuelle
  caMoisActuel: number;
  caMoisPrecedent: number;
  encaissementsMoisActuel: number;
  encaissementsMoisPrecedent: number;
}

export function useTreasuryKPIs() {
  const now = new Date();
  const debutMoisActuel = startOfMonth(now);
  const finMoisActuel = endOfMonth(now);
  const debutMoisPrecedent = startOfMonth(subMonths(now, 1));
  const finMoisPrecedent = endOfMonth(subMonths(now, 1));

  // Fetch paid invoices with emission dates (last 3 months for avg calculation)
  const threeMonthsAgo = startOfMonth(subMonths(now, 2));

  const query = useQuery({
    queryKey: ["treasury-kpis"],
    queryFn: async () => {
      const [facturesRes, paiementsRes, rappelsRes] = await Promise.all([
        supabase
          .from("factures")
          .select("id, contact_id, montant_total, statut, date_emission, date_echeance")
          .gte("date_emission", threeMonthsAgo.toISOString()),
        supabase
          .from("paiements")
          .select("id, facture_id, montant, date_paiement, created_at")
          .gte("created_at", threeMonthsAgo.toISOString()),
        supabase
          .from("contact_historique")
          .select("id, contact_id, date_rappel, alerte_active, rappel_description, created_at")
          .not("date_rappel", "is", null)
          .gte("created_at", threeMonthsAgo.toISOString()),
      ]);

      if (facturesRes.error) throw facturesRes.error;
      if (paiementsRes.error) throw paiementsRes.error;
      if (rappelsRes.error) throw rappelsRes.error;

      return {
        factures: facturesRes.data || [],
        paiements: paiementsRes.data || [],
        rappels: rappelsRes.data || [],
      };
    },
  });

  const kpis = useMemo((): TreasuryKPIs => {
    const factures = query.data?.factures || [];
    const paiements = query.data?.paiements || [];
    const rappels = query.data?.rappels || [];
    const today = startOfDay(now);

    // === 1. Temps moyen d'encaissement ===
    // Map facture -> first payment date
    const firstPaymentByFacture = new Map<string, string>();
    paiements.forEach((p: any) => {
      const d = p.date_paiement || p.created_at;
      const existing = firstPaymentByFacture.get(p.facture_id);
      if (!existing || d < existing) {
        firstPaymentByFacture.set(p.facture_id, d);
      }
    });

    // Calculate delays
    const delaysCurrent: number[] = [];
    const delaysPrevious: number[] = [];

    factures.forEach((f: any) => {
      if (!f.date_emission) return;
      const firstPay = firstPaymentByFacture.get(f.id);
      if (!firstPay) return;

      const emission = parseISO(f.date_emission);
      const payment = parseISO(firstPay);
      const days = Math.max(0, differenceInDays(payment, emission));

      if (emission >= debutMoisActuel && emission <= finMoisActuel) {
        delaysCurrent.push(days);
      } else if (emission >= debutMoisPrecedent && emission <= finMoisPrecedent) {
        delaysPrevious.push(days);
      }
    });

    const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0);
    const delaiEncaissementMoyen = avg(delaysCurrent);
    const delaiEncaissementMoisPrecedent = avg(delaysPrevious);

    // === 2. Taux de relances efficaces ===
    // A rappel is "financial" if linked contact has invoices
    // A rappel is "effective" if alerte_active = false (treated) AND contact received payment after rappel
    const contactsWithPayments = new Set<string>();
    paiements.forEach((p: any) => {
      const f = factures.find((fac: any) => fac.id === p.facture_id);
      if (f) contactsWithPayments.add(f.contact_id);
    });

    let financialRappelsCurrent = 0;
    let efficientRappelsCurrent = 0;
    let financialRappelsPrevious = 0;
    let efficientRappelsPrevious = 0;

    rappels.forEach((r: any) => {
      if (!r.date_rappel) return;
      const rappelDate = parseISO(r.date_rappel);
      const isCurrent = rappelDate >= debutMoisActuel && rappelDate <= finMoisActuel;
      const isPrev = rappelDate >= debutMoisPrecedent && rappelDate <= finMoisPrecedent;

      // Consider it financial if contact has any invoice
      const hasInvoice = factures.some((f: any) => f.contact_id === r.contact_id);
      if (!hasInvoice) return;

      if (isCurrent) {
        financialRappelsCurrent++;
        if (!r.alerte_active && contactsWithPayments.has(r.contact_id)) {
          efficientRappelsCurrent++;
        }
      } else if (isPrev) {
        financialRappelsPrevious++;
        if (!r.alerte_active && contactsWithPayments.has(r.contact_id)) {
          efficientRappelsPrevious++;
        }
      }
    });

    const tauxRelancesEfficaces = financialRappelsCurrent > 0
      ? Math.round((efficientRappelsCurrent / financialRappelsCurrent) * 100)
      : 0;
    const tauxRelancesEfficacesMoisPrecedent = financialRappelsPrevious > 0
      ? Math.round((efficientRappelsPrevious / financialRappelsPrevious) * 100)
      : 0;

    // === 3. Score Trésorerie ===
    // 40% délai encaissement (0j=100, 30j+=0)
    const delaiScore = Math.max(0, 100 - (delaiEncaissementMoyen / 30) * 100);

    // 30% relances traitées < 48h
    let treatedUnder48h = 0;
    let totalTreated = 0;
    rappels.forEach((r: any) => {
      if (r.alerte_active || !r.date_rappel) return;
      totalTreated++;
      // Approximate: if rappel created_at vs date_rappel shows quick treatment
      const rappelDate = parseISO(r.date_rappel);
      const diff = differenceInDays(today, rappelDate);
      // If treated (alerte_active=false) and delay is reasonable, count as fast
      if (diff <= 2) treatedUnder48h++;
    });
    const rapidityScore = totalTreated > 0 ? (treatedUnder48h / totalTreated) * 100 : 100;

    // 30% montant critique non relancé (inverse)
    const montantCritiqueNonRelance = factures
      .filter((f: any) => {
        if (!f.date_echeance) return false;
        const days = differenceInDays(today, startOfDay(parseISO(f.date_echeance)));
        return days > 15 && f.statut !== "payee";
      })
      .reduce((s: number, f: any) => s + Number(f.montant_total), 0);
    const critiqueScore = montantCritiqueNonRelance > 0
      ? Math.max(0, 100 - Math.min(montantCritiqueNonRelance / 5000, 1) * 100)
      : 100;

    const rawScore = 0.4 * delaiScore + 0.3 * rapidityScore + 0.3 * critiqueScore;
    const scoreTresorerie = Math.max(0, Math.min(100, Math.round(rawScore)));
    const scoreTresorerieLevel: "healthy" | "warning" | "danger" =
      scoreTresorerie >= 85 ? "healthy" : scoreTresorerie >= 70 ? "warning" : "danger";

    // === 4. Vue mensuelle ===
    const encaissementsMoisActuel = paiements
      .filter((p: any) => {
        const d = parseISO(p.date_paiement || p.created_at);
        return d >= debutMoisActuel && d <= finMoisActuel;
      })
      .reduce((s: number, p: any) => s + Number(p.montant), 0);

    const encaissementsMoisPrecedent = paiements
      .filter((p: any) => {
        const d = parseISO(p.date_paiement || p.created_at);
        return d >= debutMoisPrecedent && d <= finMoisPrecedent;
      })
      .reduce((s: number, p: any) => s + Number(p.montant), 0);

    const caMoisActuel = factures
      .filter((f: any) => {
        if (!f.date_emission) return false;
        const d = parseISO(f.date_emission);
        return d >= debutMoisActuel && d <= finMoisActuel;
      })
      .reduce((s: number, f: any) => s + Number(f.montant_total), 0);

    const caMoisPrecedent = factures
      .filter((f: any) => {
        if (!f.date_emission) return false;
        const d = parseISO(f.date_emission);
        return d >= debutMoisPrecedent && d <= finMoisPrecedent;
      })
      .reduce((s: number, f: any) => s + Number(f.montant_total), 0);

    return {
      delaiEncaissementMoyen,
      delaiEncaissementMoisPrecedent,
      tauxRelancesEfficaces,
      tauxRelancesEfficacesMoisPrecedent,
      scoreTresorerie,
      scoreTresorerieLevel,
      caMoisActuel,
      caMoisPrecedent,
      encaissementsMoisActuel,
      encaissementsMoisPrecedent,
    };
  }, [query.data]);

  return { ...kpis, isLoading: query.isLoading };
}
