import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format } from "date-fns";

export interface ExamSuccessStats {
  t3p: {
    total: number;
    admis: number;
    refuse: number;
    enAttente: number;
    tauxReussite: number;
  };
  pratique: {
    total: number;
    admis: number;
    refuse: number;
    enAttente: number;
    tauxReussite: number;
  };
  global: {
    tauxReussite: number;
  };
  byMonth: Array<{
    mois: string;
    moisLabel: string;
    t3pAdmis: number;
    t3pRefuse: number;
    pratiqueAdmis: number;
    pratiqueRefuse: number;
    tauxT3P: number;
    tauxPratique: number;
  }>;
  byFormationType: Array<{
    type: string;
    admis: number;
    refuse: number;
    total: number;
    tauxReussite: number;
  }>;
}

export function useExamSuccessStats() {
  return useQuery({
    queryKey: ["exam-success-stats"],
    queryFn: async (): Promise<ExamSuccessStats> => {
      // Fetch T3P exams
      const { data: examensT3P, error: t3pError } = await supabase
        .from("examens_t3p")
        .select("id, date_examen, resultat, type_formation")
        .in("statut", ["passe", "planifie"]);

      if (t3pError) throw t3pError;

      // Fetch practical exams
      const { data: examensPratique, error: pratiqueError } = await supabase
        .from("examens_pratique")
        .select("id, date_examen, resultat, type_examen")
        .in("statut", ["passe", "planifie"]);

      if (pratiqueError) throw pratiqueError;

      // Calculate T3P stats
      const t3pWithResults = examensT3P?.filter(e => e.resultat !== null) || [];
      const t3pAdmis = t3pWithResults.filter(e => e.resultat === "admis").length;
      const t3pRefuse = t3pWithResults.filter(e => e.resultat === "refuse" || e.resultat === "ajourne").length;
      const t3pEnAttente = (examensT3P?.length || 0) - t3pWithResults.length;

      // Calculate practical stats
      const pratiqueWithResults = examensPratique?.filter(e => e.resultat !== null) || [];
      const pratiqueAdmis = pratiqueWithResults.filter(e => e.resultat === "admis" || e.resultat === "favorable").length;
      const pratiqueRefuse = pratiqueWithResults.filter(e => e.resultat === "refuse" || e.resultat === "ajourne" || e.resultat === "defavorable").length;
      const pratiqueEnAttente = (examensPratique?.length || 0) - pratiqueWithResults.length;

      // Calculate rates
      const tauxT3P = t3pWithResults.length > 0 ? Math.round((t3pAdmis / t3pWithResults.length) * 100) : 0;
      const tauxPratique = pratiqueWithResults.length > 0 ? Math.round((pratiqueAdmis / pratiqueWithResults.length) * 100) : 0;
      
      const totalWithResults = t3pWithResults.length + pratiqueWithResults.length;
      const totalAdmis = t3pAdmis + pratiqueAdmis;
      const tauxGlobal = totalWithResults > 0 ? Math.round((totalAdmis / totalWithResults) * 100) : 0;

      // Calculate by month (last 6 months)
      const byMonth = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = startOfMonth(subMonths(new Date(), i - 1));
        const mois = format(monthStart, "yyyy-MM");
        const moisLabel = format(monthStart, "MMM", { locale: undefined });

        const monthT3P = examensT3P?.filter(e => {
          const examDate = new Date(e.date_examen);
          return examDate >= monthStart && examDate < monthEnd && e.resultat;
        }) || [];

        const monthPratique = examensPratique?.filter(e => {
          const examDate = new Date(e.date_examen);
          return examDate >= monthStart && examDate < monthEnd && e.resultat;
        }) || [];

        const monthT3PAdmis = monthT3P.filter(e => e.resultat === "admis").length;
        const monthT3PRefuse = monthT3P.filter(e => e.resultat === "refuse" || e.resultat === "ajourne").length;
        const monthPratiqueAdmis = monthPratique.filter(e => e.resultat === "admis" || e.resultat === "favorable").length;
        const monthPratiqueRefuse = monthPratique.filter(e => e.resultat === "refuse" || e.resultat === "ajourne" || e.resultat === "defavorable").length;

        byMonth.push({
          mois,
          moisLabel,
          t3pAdmis: monthT3PAdmis,
          t3pRefuse: monthT3PRefuse,
          pratiqueAdmis: monthPratiqueAdmis,
          pratiqueRefuse: monthPratiqueRefuse,
          tauxT3P: monthT3P.length > 0 ? Math.round((monthT3PAdmis / monthT3P.length) * 100) : 0,
          tauxPratique: monthPratique.length > 0 ? Math.round((monthPratiqueAdmis / monthPratique.length) * 100) : 0,
        });
      }

      // Calculate by formation type
      const formationTypes = [...new Set(examensT3P?.map(e => e.type_formation) || [])];
      const byFormationType = formationTypes.map(type => {
        const typeExams = t3pWithResults.filter(e => e.type_formation === type);
        const typeAdmis = typeExams.filter(e => e.resultat === "admis").length;
        const typeRefuse = typeExams.filter(e => e.resultat === "refuse" || e.resultat === "ajourne").length;
        
        return {
          type: type || "Non spécifié",
          admis: typeAdmis,
          refuse: typeRefuse,
          total: typeExams.length,
          tauxReussite: typeExams.length > 0 ? Math.round((typeAdmis / typeExams.length) * 100) : 0,
        };
      });

      return {
        t3p: {
          total: examensT3P?.length || 0,
          admis: t3pAdmis,
          refuse: t3pRefuse,
          enAttente: t3pEnAttente,
          tauxReussite: tauxT3P,
        },
        pratique: {
          total: examensPratique?.length || 0,
          admis: pratiqueAdmis,
          refuse: pratiqueRefuse,
          enAttente: pratiqueEnAttente,
          tauxReussite: tauxPratique,
        },
        global: {
          tauxReussite: tauxGlobal,
        },
        byMonth,
        byFormationType,
      };
    },
  });
}

export interface MonthlyProjection {
  mois: string;
  moisLabel: string;
  caConfirme: number;
  caPotentiel: number;
  sessionsCount: number;
  inscriptionsCount: number;
  placesDisponibles: number;
}

export function useMonthlyProjections() {
  return useQuery({
    queryKey: ["monthly-projections"],
    queryFn: async (): Promise<MonthlyProjection[]> => {
      const projections: MonthlyProjection[] = [];
      const now = new Date();

      // Get next 6 months projections
      for (let i = 0; i < 6; i++) {
        const monthStart = startOfMonth(subMonths(now, -i));
        const monthEnd = startOfMonth(subMonths(now, -(i + 1)));
        
        // Fetch sessions for this month
        const { data: sessions } = await supabase
          .from("sessions")
          .select(`
            id,
            prix,
            places_totales,
            session_inscriptions(id)
          `)
          .gte("date_debut", monthStart.toISOString())
          .lt("date_debut", monthEnd.toISOString())
          .in("statut", ["a_venir", "en_cours", "complet"]);

        const sessionsCount = sessions?.length || 0;
        let inscriptionsCount = 0;
        let caConfirme = 0;
        let caPotentiel = 0;
        let placesDisponibles = 0;

        sessions?.forEach(session => {
          const inscriptions = (session.session_inscriptions as any[])?.length || 0;
          const prix = Number(session.prix || 0);
          const places = session.places_totales || 0;

          inscriptionsCount += inscriptions;
          caConfirme += inscriptions * prix;
          caPotentiel += places * prix;
          placesDisponibles += places - inscriptions;
        });

        projections.push({
          mois: format(monthStart, "yyyy-MM"),
          moisLabel: format(monthStart, "MMMM yyyy", { locale: undefined }),
          caConfirme,
          caPotentiel,
          sessionsCount,
          inscriptionsCount,
          placesDisponibles,
        });
      }

      return projections;
    },
  });
}

export interface CAByFormationType {
  type: string;
  ca: number;
  count: number;
  percentage: number;
}

export function useCAByFormationType() {
  return useQuery({
    queryKey: ["ca-by-formation-type"],
    queryFn: async (): Promise<CAByFormationType[]> => {
      // Get invoices
      const { data: factures } = await supabase
        .from("factures")
        .select("id, montant_total, contact_id")
        .in("statut", ["emise", "payee", "partiel"]);

      if (!factures || factures.length === 0) return [];

      // Get contacts with their formation types from inscriptions
      const contactIds = factures.map(f => f.contact_id).filter(Boolean);
      
      const { data: inscriptions } = await supabase
        .from("session_inscriptions")
        .select(`
          contact_id,
          session:sessions(formation_type)
        `)
        .in("contact_id", contactIds as string[]);

      // Map contacts to their formation types
      const contactFormationMap = new Map<string, string>();
      inscriptions?.forEach((insc: any) => {
        if (insc.contact_id && insc.session?.formation_type) {
          contactFormationMap.set(insc.contact_id, insc.session.formation_type);
        }
      });

      // Group by formation type
      const byType: Record<string, { ca: number; count: number }> = {};
      let totalCA = 0;

      factures.forEach(f => {
        const formationType = f.contact_id ? (contactFormationMap.get(f.contact_id) || "Autre") : "Autre";
        const montant = Number(f.montant_total || 0);
        
        if (!byType[formationType]) {
          byType[formationType] = { ca: 0, count: 0 };
        }
        byType[formationType].ca += montant;
        byType[formationType].count += 1;
        totalCA += montant;
      });

      return Object.entries(byType).map(([type, data]) => ({
        type,
        ca: data.ca,
        count: data.count,
        percentage: totalCA > 0 ? Math.round((data.ca / totalCA) * 100) : 0,
      })).sort((a, b) => b.ca - a.ca);
    },
  });
}
