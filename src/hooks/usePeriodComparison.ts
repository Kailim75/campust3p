import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  subQuarters,
  subYears,
  format
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  filtreFacturesComptees,
  sommeFactures,
  sommePaiementsFacturesPeriode,
} from "@/lib/montants";

export type ComparisonPeriod = "month" | "quarter" | "year";

export interface PeriodComparisonData {
  periodType: ComparisonPeriod;
  currentPeriod: {
    label: string;
    start: Date;
    end: Date;
  };
  previousPeriod: {
    label: string;
    start: Date;
    end: Date;
  };
  metrics: {
    ca: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      trend: "up" | "down" | "stable";
    };
    encaisse: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      trend: "up" | "down" | "stable";
    };
    nouveauxContacts: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      trend: "up" | "down" | "stable";
    };
    nouveauxClients: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      trend: "up" | "down" | "stable";
    };
    sessions: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      trend: "up" | "down" | "stable";
    };
    inscriptions: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      trend: "up" | "down" | "stable";
    };
    tauxReussite: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      trend: "up" | "down" | "stable";
    };
    tauxConversion: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      trend: "up" | "down" | "stable";
    };
  };
}

function getPeriodDates(periodType: ComparisonPeriod) {
  const now = new Date();
  
  switch (periodType) {
    case "month":
      return {
        currentStart: startOfMonth(now),
        currentEnd: endOfMonth(now),
        previousStart: startOfMonth(subMonths(now, 1)),
        previousEnd: endOfMonth(subMonths(now, 1)),
        currentLabel: format(now, "MMMM yyyy", { locale: fr }),
        previousLabel: format(subMonths(now, 1), "MMMM yyyy", { locale: fr }),
      };
    case "quarter":
      return {
        currentStart: startOfQuarter(now),
        currentEnd: endOfQuarter(now),
        previousStart: startOfQuarter(subQuarters(now, 1)),
        previousEnd: endOfQuarter(subQuarters(now, 1)),
        currentLabel: `T${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`,
        previousLabel: `T${Math.ceil((subQuarters(now, 1).getMonth() + 1) / 3)} ${subQuarters(now, 1).getFullYear()}`,
      };
    case "year":
      return {
        currentStart: startOfYear(now),
        currentEnd: endOfYear(now),
        previousStart: startOfYear(subYears(now, 1)),
        previousEnd: endOfYear(subYears(now, 1)),
        currentLabel: format(now, "yyyy"),
        previousLabel: format(subYears(now, 1), "yyyy"),
      };
  }
}

function calculateTrend(current: number, previous: number): "up" | "down" | "stable" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}

function calculateChange(current: number, previous: number) {
  const change = current - previous;
  const changePercent = previous > 0 ? Math.round(((current - previous) / previous) * 100) : (current > 0 ? 100 : 0);
  return {
    change,
    changePercent,
    trend: calculateTrend(current, previous),
  };
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

export interface BornesPeriodes {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
}

export interface FinancesComparees {
  caCurrent: number;
  caPrevious: number;
  encaisseCurrent: number;
  encaissePrevious: number;
}

/**
 * CA émis et argent encaissé sur les DEUX bornes comparées.
 *
 * Les quatre montants sortent d'une seule fonction à dessein : cet écran met
 * deux périodes en regard, et ne corriger qu'une des deux bornes fausserait la
 * comparaison plus sûrement que le défaut d'origine — une période nettoyée de
 * ses brouillons comparée à une période qui les compte encore afficherait une
 * chute du CA qui n'a jamais eu lieu.
 *
 * Un BROUILLON ne compte plus dans le CA (il n'est pas encore dû), et
 * l'encaissé ne retient que les versements RATTACHÉS à une facture comptée :
 * sommer tous les versements de la période y faisait entrer l'argent reçu sur
 * un brouillon ou sur une annulée. Fonction pure, donc testable seule.
 */
export function comparerFinancesPeriodes(
  factures: ReadonlyArray<FactureLigne>,
  paiements: ReadonlyArray<PaiementLigne>,
  bornes: BornesPeriodes,
): FinancesComparees {
  const emisesEntre = (debut: string, fin: string) =>
    factures.filter((f) => f.date_emission && f.date_emission >= debut && f.date_emission <= fin);

  // Rattachement sur TOUTES les factures comptées : un versement de la période
  // peut solder une facture émise avant elle.
  const encaisseEntre = (debut: string, fin: string) =>
    sommePaiementsFacturesPeriode(
      factures,
      paiements,
      (p) => p.date_paiement >= debut && p.date_paiement <= fin,
    );

  return {
    caCurrent: sommeFactures(emisesEntre(bornes.currentStart, bornes.currentEnd)),
    caPrevious: sommeFactures(emisesEntre(bornes.previousStart, bornes.previousEnd)),
    encaisseCurrent: encaisseEntre(bornes.currentStart, bornes.currentEnd),
    encaissePrevious: encaisseEntre(bornes.previousStart, bornes.previousEnd),
  };
}

export function usePeriodComparison(periodType: ComparisonPeriod) {
  return useQuery({
    queryKey: ["period-comparison", periodType],
    queryFn: async (): Promise<PeriodComparisonData> => {
      const dates = getPeriodDates(periodType);
      
      const currentStartStr = dates.currentStart.toISOString().split("T")[0];
      const currentEndStr = dates.currentEnd.toISOString().split("T")[0];
      const previousStartStr = dates.previousStart.toISOString().split("T")[0];
      const previousEndStr = dates.previousEnd.toISOString().split("T")[0];

      // Fetch all invoices
      // `deleted_at` : sans ce filtre, une facture mise à la corbeille reste
      // comptée dans le CA comparé — la suppression est douce dans tout le CRM.
      const { data: factures } = await filtreFacturesComptees(
        supabase
          .from("factures")
          .select("id, montant_total, date_emission, statut")
          .is("deleted_at", null),
      );

      // Fetch all payments
      // `facture_id` est INDISPENSABLE : c'est la clé de rattachement des
      // versements aux factures comptées. Sans elle, l'encaissé retomberait à 0.
      const { data: paiements } = await supabase
        .from("paiements")
        .select("montant, date_paiement, facture_id")
        .is("deleted_at", null);

      // Fetch all contacts
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, statut, created_at")
        .eq("archived", false)
        .eq("is_historical_import", false);

      // Fetch all sessions
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, date_debut")
        .not("statut", "eq", "annulee");

      // Fetch all inscriptions
      const { data: inscriptions } = await supabase
        .from("session_inscriptions")
        .select("id, created_at");

      // Fetch exam results
      const { data: examensT3P } = await supabase
        .from("examens_t3p")
        .select("id, date_examen, resultat")
        .eq("statut", "passe");

      // CA émis et encaissé des deux périodes, sur la même assiette de factures.
      const { caCurrent, caPrevious, encaisseCurrent, encaissePrevious } =
        comparerFinancesPeriodes(factures || [], paiements || [], {
          currentStart: currentStartStr,
          currentEnd: currentEndStr,
          previousStart: previousStartStr,
          previousEnd: previousEndStr,
        });

      // Calculate new contacts
      const nouveauxContactsCurrent = (contacts || [])
        .filter(c => c.created_at && c.created_at >= currentStartStr && c.created_at <= currentEndStr + "T23:59:59")
        .length;

      const nouveauxContactsPrevious = (contacts || [])
        .filter(c => c.created_at && c.created_at >= previousStartStr && c.created_at <= previousEndStr + "T23:59:59")
        .length;

      // Calculate new clients
      const nouveauxClientsCurrent = (contacts || [])
        .filter(c => c.statut === "Client" && c.created_at && c.created_at >= currentStartStr && c.created_at <= currentEndStr + "T23:59:59")
        .length;

      const nouveauxClientsPrevious = (contacts || [])
        .filter(c => c.statut === "Client" && c.created_at && c.created_at >= previousStartStr && c.created_at <= previousEndStr + "T23:59:59")
        .length;

      // Calculate sessions
      const sessionsCurrent = (sessions || [])
        .filter(s => s.date_debut >= currentStartStr && s.date_debut <= currentEndStr)
        .length;

      const sessionsPrevious = (sessions || [])
        .filter(s => s.date_debut >= previousStartStr && s.date_debut <= previousEndStr)
        .length;

      // Calculate inscriptions
      const inscriptionsCurrent = (inscriptions || [])
        .filter(i => i.created_at && i.created_at >= currentStartStr && i.created_at <= currentEndStr + "T23:59:59")
        .length;

      const inscriptionsPrevious = (inscriptions || [])
        .filter(i => i.created_at && i.created_at >= previousStartStr && i.created_at <= previousEndStr + "T23:59:59")
        .length;

      // Calculate exam success rate
      const examsCurrent = (examensT3P || [])
        .filter(e => e.date_examen >= currentStartStr && e.date_examen <= currentEndStr && e.resultat);
      const examsAdmisCurrent = examsCurrent.filter(e => e.resultat === "admis").length;
      const tauxReussiteCurrent = examsCurrent.length > 0 ? Math.round((examsAdmisCurrent / examsCurrent.length) * 100) : 0;

      const examsPrevious = (examensT3P || [])
        .filter(e => e.date_examen >= previousStartStr && e.date_examen <= previousEndStr && e.resultat);
      const examsAdmisPrevious = examsPrevious.filter(e => e.resultat === "admis").length;
      const tauxReussitePrevious = examsPrevious.length > 0 ? Math.round((examsAdmisPrevious / examsPrevious.length) * 100) : 0;

      // Calculate conversion rate
      const tauxConversionCurrent = nouveauxContactsCurrent > 0 
        ? Math.round((nouveauxClientsCurrent / nouveauxContactsCurrent) * 100) 
        : 0;

      const tauxConversionPrevious = nouveauxContactsPrevious > 0 
        ? Math.round((nouveauxClientsPrevious / nouveauxContactsPrevious) * 100) 
        : 0;

      return {
        periodType,
        currentPeriod: {
          label: dates.currentLabel,
          start: dates.currentStart,
          end: dates.currentEnd,
        },
        previousPeriod: {
          label: dates.previousLabel,
          start: dates.previousStart,
          end: dates.previousEnd,
        },
        metrics: {
          ca: {
            current: caCurrent,
            previous: caPrevious,
            ...calculateChange(caCurrent, caPrevious),
          },
          encaisse: {
            current: encaisseCurrent,
            previous: encaissePrevious,
            ...calculateChange(encaisseCurrent, encaissePrevious),
          },
          nouveauxContacts: {
            current: nouveauxContactsCurrent,
            previous: nouveauxContactsPrevious,
            ...calculateChange(nouveauxContactsCurrent, nouveauxContactsPrevious),
          },
          nouveauxClients: {
            current: nouveauxClientsCurrent,
            previous: nouveauxClientsPrevious,
            ...calculateChange(nouveauxClientsCurrent, nouveauxClientsPrevious),
          },
          sessions: {
            current: sessionsCurrent,
            previous: sessionsPrevious,
            ...calculateChange(sessionsCurrent, sessionsPrevious),
          },
          inscriptions: {
            current: inscriptionsCurrent,
            previous: inscriptionsPrevious,
            ...calculateChange(inscriptionsCurrent, inscriptionsPrevious),
          },
          tauxReussite: {
            current: tauxReussiteCurrent,
            previous: tauxReussitePrevious,
            ...calculateChange(tauxReussiteCurrent, tauxReussitePrevious),
          },
          tauxConversion: {
            current: tauxConversionCurrent,
            previous: tauxConversionPrevious,
            ...calculateChange(tauxConversionCurrent, tauxConversionPrevious),
          },
        },
      };
    },
  });
}
