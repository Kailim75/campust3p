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
    montantTotalEnAttente: number;
    montantCritique: number;
    retardMoyen: number;
  };
  disciplineScore: number;
  disciplineLevel: "healthy" | "warning" | "danger";
}

const CRITICAL_DAYS = 15;

export function useRappelsFinancials(contactId?: string) {
  // Fetch rappels (active alerts)
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

  // Fetch all factures with unpaid amounts for contacts that have rappels
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

      const [facturesRes, paiementsRes, contactsRes] = await Promise.all([
        supabase
          .from("factures")
          .select("id, contact_id, montant_total, statut, date_echeance, numero_facture")
          .in("contact_id", contactIds)
          .in("statut", ["envoyee", "partiel", "en_retard"] as any),
        supabase
          .from("paiements")
          .select("id, facture_id, montant"),
        supabase
          .from("contacts")
          .select("id, nom, prenom, email, telephone, formation")
          .in("id", contactIds),
      ]);

      if (facturesRes.error) throw facturesRes.error;
      if (paiementsRes.error) throw paiementsRes.error;
      if (contactsRes.error) throw contactsRes.error;

      return {
        factures: facturesRes.data || [],
        paiements: paiementsRes.data || [],
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

    // Build contacts map
    const contactsMap = new Map<string, any>();
    contactsData.forEach((c: any) => contactsMap.set(c.id, c));
    // Build paiement totals per facture
    const paiementsByFacture = new Map<string, number>();
    paiements.forEach((p: any) => {
      paiementsByFacture.set(p.facture_id, (paiementsByFacture.get(p.facture_id) || 0) + Number(p.montant));
    });

    // Build financial summary per contact
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

    // Enrich rappels with priority
    const now = startOfDay(new Date());
    let totalRetardDays = 0;
    let overdueCount = 0;
    let criticalUntreatedCount = 0;

    const rappels: RappelWithFinancials[] = alerts
      .filter((r: any) => r.date_rappel)
      .map((r: any) => {
        const fin = contactFinancials.get(r.contact_id) || { enAttente: 0, critique: 0 };
        const dateRappel = parseISO(r.date_rappel);
        const isOverdue = r.alerte_active && isPast(dateRappel) && !isToday(dateRappel);

        if (isOverdue) {
          const days = differenceInDays(now, startOfDay(dateRappel));
          totalRetardDays += days;
          overdueCount++;
        }

        // Priority logic
        let priority: "critical" | "important" | "standard" = "standard";
        if (fin.critique > 0 || fin.enAttente > 500) {
          priority = "critical";
          if (isOverdue && r.alerte_active) criticalUntreatedCount++;
        } else if (
          (r.rappel_description || "").toLowerCase().match(/document|dossier|pièce|manquant/) ||
          fin.enAttente > 0
        ) {
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
    let montantTotalEnAttente = 0;
    let montantCritique = 0;
    contactFinancials.forEach((v) => {
      montantTotalEnAttente += v.enAttente;
      montantCritique += v.critique;
    });

    const retardMoyen = overdueCount > 0 ? Math.round(totalRetardDays / overdueCount) : 0;

    // Discipline score
    const totalActive = rappels.filter((r) => r.alerte_active).length;
    const overduePercent = totalActive > 0 ? (overdueCount / totalActive) * 100 : 0;
    const criticalPercent = totalActive > 0 ? (criticalUntreatedCount / totalActive) * 100 : 0;

    // Score = 100 - (40% × overduePercent) - (30% × min(retardMoyen/30,1)*100) - (30% × criticalPercent)
    const ageFactor = Math.min(retardMoyen / 30, 1) * 100;
    const rawScore = 100 - 0.4 * overduePercent - 0.3 * ageFactor - 0.3 * criticalPercent;
    const disciplineScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    const disciplineLevel: "healthy" | "warning" | "danger" =
      disciplineScore >= 85 ? "healthy" : disciplineScore >= 70 ? "warning" : "danger";

    return {
      rappels,
      kpis: { montantTotalEnAttente, montantCritique, retardMoyen },
      disciplineScore,
      disciplineLevel,
      rawFinancials: { factures, paiements, contacts: contactsMap },
    };
  }, [alertsQuery.data, financialsQuery.data]);

  return {
    ...result,
    isLoading: alertsQuery.isLoading || financialsQuery.isLoading,
  };
}
