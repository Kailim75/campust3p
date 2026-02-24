import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, isPast, isToday, startOfDay } from "date-fns";

interface RappelWithFinancials {
  id: string;
  contact_id: string;
  date_rappel: string;
  alerte_active: boolean | null;
  rappel_description: string | null;
  titre: string;
  contenu: string | null;
  type: string;
  montantEnAttente: number;
  montantCritique: number;
  priority: "critical" | "important" | "standard";
}

interface RappelsFinancialData {
  rappels: RappelWithFinancials[];
  kpis: {
    montantARelancer: number;
    montantCritique: number;
    retardMoyen: number;
  };
  unifiedScore: number;
  unifiedScoreLevel: "healthy" | "warning" | "danger";
  scoreComponents: {
    discipline: number;
    rapiditeTraitement: number;
    rapiditeEncaissement: number | null; // null = no data
  };
}

const CRITICAL_DAYS = 15;

function computeRapiditeTraitement(retardMoyen: number): number {
  if (retardMoyen <= 2) return 100;
  if (retardMoyen <= 5) return 80;
  if (retardMoyen <= 10) return 60;
  return 30;
}

function computeRapiditeEncaissement(delaiMoyen: number): number {
  if (delaiMoyen <= 5) return 100;
  if (delaiMoyen <= 10) return 80;
  if (delaiMoyen <= 20) return 60;
  return 40;
}

export function useRappelsFinancials(contactId?: string) {
  const alertsQuery = useQuery({
    queryKey: contactId ? ["contact-historique", contactId] : ["historique-alerts"],
    queryFn: async () => {
      if (contactId) {
        const { data, error } = await supabase
          .from("contact_historique")
          .select("*")
          .eq("contact_id", contactId)
          .not("date_rappel", "is", null);
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("contact_historique")
        .select(`*, contacts(id, nom, prenom)`)
        .eq("alerte_active", true)
        .not("date_rappel", "is", null)
        .order("date_rappel", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const contactIds = useMemo(() => {
    if (!alertsQuery.data) return [];
    const ids = new Set<string>();
    alertsQuery.data.forEach((r: any) => ids.add(r.contact_id));
    return Array.from(ids);
  }, [alertsQuery.data]);

  const financialsQuery = useQuery({
    queryKey: ["rappels-financials", contactIds],
    queryFn: async () => {
      if (contactIds.length === 0) return { factures: [], paiements: [], contactsData: [] };

      // First fetch factures and contacts in parallel
      const [facturesRes, contactsRes] = await Promise.all([
        supabase
          .from("factures")
          .select("id, contact_id, montant_total, statut, date_echeance, numero_facture")
          .in("contact_id", contactIds)
          .in("statut", ["emise", "partiel", "impayee"]),
        supabase
          .from("contacts")
          .select("id, nom, prenom, email, telephone, formation")
          .in("id", contactIds),
      ]);

      if (facturesRes.error) throw facturesRes.error;
      if (contactsRes.error) throw contactsRes.error;

      // Only fetch paiements for relevant factures (avoid loading ALL paiements)
      const factureIds = (facturesRes.data || []).map((f: any) => f.id);
      let paiementsData: any[] = [];
      if (factureIds.length > 0) {
        const paiementsRes = await supabase
          .from("paiements")
          .select("id, facture_id, montant")
          .in("facture_id", factureIds);
        if (paiementsRes.error) throw paiementsRes.error;
        paiementsData = paiementsRes.data || [];
      }

      return {
        factures: facturesRes.data || [],
        paiements: paiementsData,
        contactsData: contactsRes.data || [],
      };
    },
    enabled: contactIds.length > 0,
  });

  const result = useMemo((): RappelsFinancialData & { rawFinancials: { factures: any[]; paiements: any[]; contacts: Map<string, any> } } => {
    const alerts = alertsQuery.data || [];
    const factures = financialsQuery.data?.factures || [];
    const paiements = financialsQuery.data?.paiements || [];
    const contactsData = financialsQuery.data?.contactsData || [];

    const contactsMap = new Map<string, any>();
    contactsData.forEach((c: any) => contactsMap.set(c.id, c));

    const paiementsByFacture = new Map<string, number>();
    paiements.forEach((p: any) => {
      paiementsByFacture.set(p.facture_id, (paiementsByFacture.get(p.facture_id) || 0) + Number(p.montant));
    });

    const contactFinancials = new Map<string, { enAttente: number; critique: number }>();
    factures.forEach((f: any) => {
      const paid = paiementsByFacture.get(f.id) || 0;
      const remaining = Math.max(0, Number(f.montant_total) - paid);
      if (remaining <= 0) return;

      const current = contactFinancials.get(f.contact_id) || { enAttente: 0, critique: 0 };
      current.enAttente += remaining;

      if (f.date_echeance && isPast(parseISO(f.date_echeance)) && differenceInDays(new Date(), parseISO(f.date_echeance)) > CRITICAL_DAYS) {
        current.critique += remaining;
      }

      contactFinancials.set(f.contact_id, current);
    });

    const now = startOfDay(new Date());
    let totalRetardDays = 0;
    let overdueCount = 0;

    const rappels: RappelWithFinancials[] = alerts
      .filter((r: any) => r.date_rappel)
      .map((r: any) => {
        const fin = contactFinancials.get(r.contact_id) || { enAttente: 0, critique: 0 };
        const dateRappel = parseISO(r.date_rappel);
        const isOverdue = r.alerte_active && isPast(dateRappel) && !isToday(dateRappel);
        const daysOverdue = isOverdue ? differenceInDays(now, startOfDay(dateRappel)) : 0;

        if (isOverdue) {
          totalRetardDays += daysOverdue;
          overdueCount++;
        }

        // NEW priority logic:
        // 🔴 Critical = financial impact + overdue > 7 days
        // 🟠 Important = administrative blocking (document keywords) or financial but < 7 days
        // 🟢 Standard = everything else
        let priority: "critical" | "important" | "standard" = "standard";
        const hasFinancialImpact = fin.enAttente > 0 || fin.critique > 0;
        const isAdminBlocking = (r.rappel_description || "").toLowerCase().match(/document|dossier|pièce|manquant|attestation|certificat/);

        if (hasFinancialImpact && daysOverdue > 7) {
          priority = "critical";
        } else if (isAdminBlocking || hasFinancialImpact) {
          priority = "important";
        }

        return {
          ...r,
          montantEnAttente: fin.enAttente,
          montantCritique: fin.critique,
          priority,
        };
      });

    // KPIs
    let montantARelancer = 0;
    let montantCritique = 0;
    contactFinancials.forEach((v) => {
      montantARelancer += v.enAttente;
      montantCritique += v.critique;
    });

    const retardMoyen = overdueCount > 0 ? Math.round(totalRetardDays / overdueCount) : 0;

    // === UNIFIED SCORE ===
    const totalActive = rappels.filter((r) => r.alerte_active).length;

    // Discipline = 100 - (% rappels en retard × 100)
    const overduePercent = totalActive > 0 ? (overdueCount / totalActive) : 0;
    const discipline = Math.round(100 - overduePercent * 100);

    // Rapidité traitement
    const rapiditeTraitement = computeRapiditeTraitement(retardMoyen);

    // Rapidité encaissement - will be null if no data (neutralized)
    // We don't have encaissement data in this hook, so we mark it null
    // The page will use treasury hook data to complete this
    const rapiditeEncaissement: number | null = null;

    // Score with potential neutralization
    let unifiedScore: number;
    if (totalActive === 0) {
      unifiedScore = 100;
    } else {
      // Will be recalculated in the page when encaissement data is available
      // For now: 40% discipline + 30% rapidité + 30% neutralized → proportional
      // Without encaissement: 40/70 discipline + 30/70 rapidité
      unifiedScore = Math.round((40 / 70) * discipline + (30 / 70) * rapiditeTraitement);
    }

    const unifiedScoreLevel: "healthy" | "warning" | "danger" =
      unifiedScore >= 85 ? "healthy" : unifiedScore >= 70 ? "warning" : "danger";

    return {
      rappels,
      kpis: { montantARelancer, montantCritique, retardMoyen },
      unifiedScore,
      unifiedScoreLevel,
      scoreComponents: { discipline, rapiditeTraitement, rapiditeEncaissement },
      rawFinancials: { factures, paiements, contacts: contactsMap },
    };
  }, [alertsQuery.data, financialsQuery.data]);

  return {
    ...result,
    isLoading: alertsQuery.isLoading || financialsQuery.isLoading,
  };
}
