import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, subDays } from "date-fns";
import {
  calculerResteAEncaisser,
  filtreFacturesComptees,
  sommeFactures,
} from "@/lib/montants";

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

/** Lignes minimales attendues des requêtes ci-dessous (le reste est ignoré). */
export interface FactureLigne {
  id?: string | null;
  montant_total?: number | string | null;
  statut?: string | null;
  date_emission?: string | null;
  date_echeance?: string | null;
}

export interface PaiementLigne {
  montant?: number | string | null;
  facture_id?: string | null;
}

/**
 * CA réalisé du mois, mis en regard de l'objectif de budget (sous-score S1).
 *
 * Comptait auparavant les seules factures `payee` ou `emise` — une facture
 * réglée en partie passe au statut `partiel` et DISPARAISSAIT donc du réalisé :
 * encaisser un acompte faisait BAISSER le CA du mois. L'assiette partagée
 * retient toutes les factures comptées (émise, partielle, impayée, payée) et
 * continue d'écarter le brouillon, qui n'est pas encore dû.
 */
export function calculerCaConfirme(
  factures: ReadonlyArray<FactureLigne>,
  depuis: string,
): number {
  return sommeFactures(factures.filter((f) => f.date_emission && f.date_emission >= depuis));
}

export interface FactureEnAttente {
  facture: FactureLigne;
  /** Ce qu'il RESTE à encaisser sur cette facture, jamais négatif. */
  reste: number;
  joursDeRetard: number;
}

export interface AnalyseEncaissement {
  enAttente: FactureEnAttente[];
  nombre: number;
  resteTotal: number;
  ageMoyen: number;
}

/**
 * Liste blanche VOLONTAIRE : ces trois statuts désignent un ÉTAT (« paiement à
 * relancer »), pas un total d'argent dû. L'aligner sur le prédicat partagé
 * ferait entrer les factures PAYÉES dans le risque d'impayé. Le brouillon et
 * l'annulée en sont absents, donc une facture jamais émise ne peut pas y entrer.
 */
const STATUTS_EN_ATTENTE = ["emise", "impayee", "partiel"];

/**
 * Encours réel : ce qu'il reste à encaisser FACTURE PAR FACTURE (sous-score S4,
 * alertes et recommandations d'encaissement).
 *
 * Les versements étaient chargés puis jamais utilisés : une facture de 1 200 €
 * réglée à 1 150 € était annoncée « impayée — 1 200 € ». Le reste dû se juge
 * facture par facture, granularité que `resteAEncaisserParFacture` ne rend pas
 * (il n'en renvoie que le total) ; la règle du reste jamais négatif reste celle
 * de `calculerResteAEncaisser`. Fonction pure, donc testable seule.
 */
export function analyserEncaissement(
  factures: ReadonlyArray<FactureLigne>,
  paiements: ReadonlyArray<PaiementLigne>,
  now: Date,
): AnalyseEncaissement {
  const payeParFacture = new Map<string, number>();
  for (const p of paiements) {
    if (!p.facture_id) continue;
    payeParFacture.set(
      p.facture_id,
      (payeParFacture.get(p.facture_id) ?? 0) + Number(p.montant || 0),
    );
  }

  const enAttente = factures
    .filter((f) => f.statut && STATUTS_EN_ATTENTE.includes(f.statut))
    .map((f) => {
      const echeance = f.date_echeance || f.date_emission;
      return {
        facture: f,
        reste: calculerResteAEncaisser(
          f.montant_total,
          f.id ? payeParFacture.get(f.id) ?? 0 : 0,
        ),
        joursDeRetard: echeance
          ? Math.max(0, differenceInDays(now, parseISO(echeance)))
          : 0,
      };
    });

  const nombre = enAttente.length;
  return {
    enAttente,
    nombre,
    resteTotal: enAttente.reduce((a, f) => a + f.reste, 0),
    ageMoyen: nombre > 0 ? enAttente.reduce((a, f) => a + f.joursDeRetard, 0) / nombre : 0,
  };
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
        supabase.from("session_inscriptions").select("session_id").is("deleted_at", null),
        filtreFacturesComptees(
          supabase.from("factures").select("id, montant_total, statut, date_echeance, date_emission, contact_id")
            .is("deleted_at", null),
        ),
        supabase.from("paiements").select("montant, facture_id").is("deleted_at", null),
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

      // CA réalisé du mois, sur l'assiette partagée des factures comptées.
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const caConfirme = calculerCaConfirme(factures, monthStart);

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
      const encaissement = analyserEncaissement(factures, paiements, now);
      const fi = encaissement.nombre;
      const mi = encaissement.resteTotal;
      const avgAge = encaissement.ageMoyen;
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
      // Seuils jugés sur le RESTE dû : une facture de 1 200 € réglée à 1 150 €
      // n'est pas une alerte de 1 200 €, et soldée elle n'en est plus une.
      encaissement.enAttente
        .filter(f => f.joursDeRetard > 10 && f.reste > 500)
        .sort((a, b) => b.reste - a.reste)
        .slice(0, 2)
        .forEach(f => {
          alerts.push({
            id: `facture-${f.facture.id}`,
            severity: f.reste > 1500 ? "critical" : "important",
            title: `Facture impayée — ${f.reste.toLocaleString("fr-FR")} €`,
            impact: f.reste,
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
      const bigUnpaid = encaissement.enAttente.filter(f => f.reste > 1000);
      if (bigUnpaid.length > 0) {
        const totalUnpaid = bigUnpaid.reduce((a, f) => a + f.reste, 0);
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
