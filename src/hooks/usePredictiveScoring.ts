import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, subDays } from "date-fns";

export interface SubScore {
  label: string;
  key: string;
  value: number;
  weight: number;
  detail?: string;
}

export interface SmartAlert {
  id: string;
  severity: "critical" | "important" | "info";
  title: string;
  impact: number;
  action: { label: string; section: string; contactId?: string };
}

export interface SmartRecommendation {
  id: string;
  text: string;
  impact: number;
  action: { label: string; section: string };
}

export interface PredictiveData {
  globalScore: number;
  subScores: SubScore[];
  synthesis: string;
  alerts: SmartAlert[];
  recommendations: SmartRecommendation[];
}

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(v)));

function fillProb(rate: number) {
  if (rate >= 75) return 0.9;
  if (rate >= 60) return 0.7;
  if (rate >= 40) return 0.45;
  return 0.2;
}

function urgencyScore(days: number) {
  if (days <= 7) return 100;
  if (days <= 14) return 70;
  if (days <= 30) return 40;
  return 10;
}

function deficitScore(rate: number) {
  if (rate < 40) return 100;
  if (rate < 60) return 70;
  if (rate < 75) return 40;
  return 10;
}

export function usePredictiveScoring() {
  return useQuery({
    queryKey: ["dashboard", "predictive-scoring"],
    queryFn: async (): Promise<PredictiveData> => {
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 86400000);
      const todayStr = now.toISOString().split("T")[0];
      const in30Str = in30.toISOString().split("T")[0];
      const fiveDaysAgo = subDays(now, 5).toISOString();

      const [sessionsRes, inscriptionsRes, facturesRes, paiementsRes, prospectsRes, budgetRes] = await Promise.all([
        supabase.from("sessions").select("id, nom, places_totales, prix, statut, date_debut, formation_type")
          .eq("archived", false).gte("date_debut", todayStr).lte("date_debut", in30Str),
        supabase.from("session_inscriptions").select("session_id"),
        supabase.from("factures").select("id, montant_total, statut, date_echeance, date_emission, contact_id")
          .not("statut", "eq", "annulee"),
        supabase.from("paiements").select("montant, facture_id"),
        supabase.from("prospects").select("id, statut, created_at, updated_at, nom, prenom")
          .eq("is_active", true),
        supabase.from("budget_previsionnel").select("montant_prevu, type, mois, annee")
          .eq("annee", now.getFullYear()).eq("mois", now.getMonth() + 1).eq("type", "revenu"),
      ]);

      const sessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];
      const factures = facturesRes.data || [];
      const paiements = paiementsRes.data || [];
      const prospects = prospectsRes.data || [];
      const budget = budgetRes.data || [];

      // Inscription counts
      const inscCounts: Record<string, number> = {};
      inscriptions.forEach(i => { inscCounts[i.session_id] = (inscCounts[i.session_id] || 0) + 1; });

      // ═══ S1 — Couverture CA ═══
      const objectifCA = budget.reduce((a, b) => a + Number(b.montant_prevu || 0), 0);
      const hasObjectif = objectifCA > 0;

      // CA confirmé = factures payées/partielles this month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const caConfirme = factures
        .filter(f => (f.statut === "payee" || f.statut === "emise") && f.date_emission && f.date_emission >= monthStart)
        .reduce((a, f) => a + Number(f.montant_total || 0), 0);

      // CA probable from sessions in next 30 days
      let caProbable = 0;
      const sessionRisks: { session: typeof sessions[0]; filled: number; fillRate: number; risk: number; impact: number; daysUntil: number }[] = [];

      sessions.forEach(s => {
        if (s.statut !== "a_venir" && s.statut !== "en_cours") return;
        const places = s.places_totales || 0;
        const filled = inscCounts[s.id] || 0;
        const rate = places > 0 ? (filled / places) * 100 : 0;
        const prix = Number(s.prix || 0);
        const daysUntil = differenceInDays(parseISO(s.date_debut), now);

        const prob = fillProb(rate);
        const remaining = Math.max(0, places - filled);
        caProbable += remaining * prix * prob + filled * prix;

        const risk = 0.55 * deficitScore(rate) + 0.45 * urgencyScore(daysUntil);
        const impact = remaining * prix;
        sessionRisks.push({ session: s, filled, fillRate: rate, risk, impact, daysUntil });
      });

      const caTotal = caConfirme + caProbable;
      const s1 = hasObjectif ? clamp((caTotal / objectifCA) * 100) : 50;

      // ═══ S2 — Risque Sessions ═══
      let s2 = 100;
      if (sessionRisks.length > 0) {
        const totalImpact = sessionRisks.reduce((a, r) => a + r.impact, 0);
        if (totalImpact > 0) {
          const weightedRisk = sessionRisks.reduce((a, r) => a + r.risk * r.impact, 0) / totalImpact;
          s2 = clamp(100 - weightedRisk);
        }
      }

      // ═══ S3 — Dynamique Acquisition ═══
      const activeProspects = prospects.filter(p => p.statut !== "converti" && p.statut !== "perdu");
      const totalProspects = prospects.length;
      const converted = prospects.filter(p => p.statut === "converti").length;
      const tc = totalProspects > 0 ? (converted / totalProspects) * 100 : 50;
      const nonContacted5d = activeProspects.filter(p => {
        const lastUpdate = p.updated_at || p.created_at;
        return lastUpdate < fiveDaysAgo;
      }).length;
      const penalite = Math.min(40, nonContacted5d * 3);
      const s3 = clamp(tc - penalite);

      // ═══ S4 — Risque Encaissement ═══
      const unpaid = factures.filter(f => f.statut === "emise" || f.statut === "impayee" || f.statut === "partiel");
      const fi = unpaid.length;
      const mi = unpaid.reduce((a, f) => a + Number(f.montant_total || 0), 0);
      const avgAge = fi > 0
        ? unpaid.reduce((a, f) => {
            const echeance = f.date_echeance || f.date_emission;
            return a + (echeance ? Math.max(0, differenceInDays(now, parseISO(echeance))) : 0);
          }, 0) / fi
        : 0;
      const penS4 = fi * 4 + (avgAge > 10 ? 15 : 0) + (avgAge > 20 ? 15 : 0);
      const s4 = clamp(100 - penS4);

      // ═══ SCORE GLOBAL ═══
      const globalScore = clamp(s1 * 0.35 + s2 * 0.30 + s3 * 0.20 + s4 * 0.15);

      const subScores: SubScore[] = [
        { label: "Couverture CA", key: "s1", value: s1, weight: 35, detail: hasObjectif ? `${Math.round(caTotal).toLocaleString("fr-FR")} € / ${objectifCA.toLocaleString("fr-FR")} €` : "Objectif non configuré" },
        { label: "Risque sessions", key: "s2", value: s2, weight: 30, detail: `${sessionRisks.filter(r => r.risk > 60).length} session(s) à risque` },
        { label: "Acquisition", key: "s3", value: s3, weight: 20, detail: `${activeProspects.length} actifs, ${nonContacted5d} non relancés` },
        { label: "Encaissement", key: "s4", value: s4, weight: 15, detail: fi > 0 ? `${fi} facture(s) en attente — ${mi.toLocaleString("fr-FR")} €` : "Aucun impayé" },
      ];

      // ═══ ALERTS (max 5) ═══
      const alerts: SmartAlert[] = [];

      // Session alerts
      sessionRisks
        .filter(r => r.fillRate < 60 && r.daysUntil <= 14)
        .sort((a, b) => b.impact - a.impact)
        .slice(0, 2)
        .forEach(r => {
          const severity = r.daysUntil <= 7 && r.fillRate < 60 ? "critical" : r.fillRate < 50 ? "critical" : "important";
          alerts.push({
            id: `session-${r.session.id}`,
            severity,
            title: `${r.session.nom} — ${Math.round(r.fillRate)}% rempli, J-${r.daysUntil}`,
            impact: r.impact,
            action: { label: "Voir session", section: "sessions" },
          });
        });

      // Prospect non relancé
      if (nonContacted5d > 0) {
        alerts.push({
          id: "prospects-stale",
          severity: nonContacted5d >= 5 ? "important" : "info",
          title: `${nonContacted5d} prospect(s) non relancé(s) depuis 5+ jours`,
          impact: nonContacted5d * 800,
          action: { label: "Voir prospects", section: "prospects" },
        });
      }

      // Factures impayées critiques
      unpaid
        .filter(f => {
          const echeance = f.date_echeance || f.date_emission;
          return echeance && differenceInDays(now, parseISO(echeance)) > 10 && Number(f.montant_total) > 500;
        })
        .sort((a, b) => Number(b.montant_total) - Number(a.montant_total))
        .slice(0, 2)
        .forEach(f => {
          alerts.push({
            id: `facture-${f.id}`,
            severity: Number(f.montant_total) > 1500 ? "critical" : "important",
            title: `Facture impayée — ${Number(f.montant_total).toLocaleString("fr-FR")} €`,
            impact: Number(f.montant_total),
            action: { label: "Voir factures", section: "facturation" },
          });
        });

      // Sort by severity then impact, limit to 5
      const severityOrder = { critical: 0, important: 1, info: 2 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.impact - a.impact);
      const finalAlerts = alerts.slice(0, 5);

      // ═══ RECOMMENDATIONS (max 5) ═══
      const recommendations: SmartRecommendation[] = [];

      // Low fill sessions
      const lowFillSessions = sessionRisks.filter(r => r.fillRate < 60).sort((a, b) => b.impact - a.impact);
      if (lowFillSessions.length > 0) {
        const top = lowFillSessions[0];
        recommendations.push({
          id: "promo-session",
          text: `Promouvoir "${top.session.nom}" : manque à gagner ${top.impact.toLocaleString("fr-FR")} €`,
          impact: top.impact,
          action: { label: "Gérer sessions", section: "sessions" },
        });
      }

      // Relance prospects
      if (nonContacted5d >= 3) {
        const estInscrip = Math.max(1, Math.round(nonContacted5d * 0.15));
        recommendations.push({
          id: "relance-prospects",
          text: `Relancer ${nonContacted5d} prospects inactifs (probable +${estInscrip} inscription${estInscrip > 1 ? "s" : ""})`,
          impact: estInscrip * 1200,
          action: { label: "Voir prospects", section: "prospects" },
        });
      }

      // Encaissements
      const bigUnpaid = unpaid.filter(f => Number(f.montant_total) > 1000);
      if (bigUnpaid.length > 0) {
        const totalUnpaid = bigUnpaid.reduce((a, f) => a + Number(f.montant_total), 0);
        recommendations.push({
          id: "encaissements",
          text: `Prioriser encaissements : ${bigUnpaid.length} facture(s) > 1 000 € en retard`,
          impact: totalUnpaid,
          action: { label: "Voir paiements", section: "facturation" },
        });
      }

      // Budget objectif
      if (!hasObjectif) {
        recommendations.push({
          id: "set-objectif",
          text: "Configurer vos objectifs CA pour un scoring fiable",
          impact: 0,
          action: { label: "Cockpit financier", section: "cockpit-financier" },
        });
      }

      // Acquisition boost
      if (activeProspects.length < 5) {
        recommendations.push({
          id: "boost-pipeline",
          text: "Pipeline faible — intensifier l'acquisition de prospects",
          impact: 3000,
          action: { label: "Nouveau prospect", section: "prospects" },
        });
      }

      const finalRecos = recommendations.sort((a, b) => b.impact - a.impact).slice(0, 5);

      // ═══ SYNTHESIS ═══
      const parts: string[] = [];
      const criticalSessions = sessionRisks.filter(r => r.risk > 60);
      if (criticalSessions.length > 0) parts.push(`${criticalSessions.length} session(s) à risque`);
      if (nonContacted5d > 0) parts.push(`${nonContacted5d} prospect(s) non relancé(s)`);
      if (fi > 2) parts.push(`${fi} factures en attente`);
      const synthesis = parts.length > 0
        ? (globalScore < 50 ? "Risque élevé : " : "Attention : ") + parts.join(" + ")
        : "Tous les indicateurs sont au vert ✅";

      return { globalScore, subScores, synthesis, alerts: finalAlerts, recommendations: finalRecos };
    },
    staleTime: 3 * 60 * 1000,
  });
}
