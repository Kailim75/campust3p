import type { ProspectScoring } from "@/hooks/useProspectScoring";
import type { ScoreHistory } from "@/hooks/useScoreHistory";

export interface Recommendation {
  id: string;
  type: "prospect" | "commercial" | "administratif" | "financier" | "risque" | "sante";
  impact_estime_euros: number;
  priorite: "critique" | "haute" | "moyenne" | "basse";
  action_recommandee: string;
  justification: string;
  score_confiance: number; // 0–100
}

function prioriteFromScore(score: number): Recommendation["priorite"] {
  if (score >= 80) return "critique";
  if (score >= 60) return "haute";
  if (score >= 30) return "moyenne";
  return "basse";
}

export function generateRecommendations(
  scorings: ProspectScoring[],
  latestScore: ScoreHistory | null,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // ── 1. Prospects brûlants non traités ──
  const brulants = scorings.filter(
    (s) => s.niveau_chaleur === "brulant" && s.delai_optimal_relance !== null && s.delai_optimal_relance <= 2,
  );
  if (brulants.length > 0) {
    const impact = brulants.reduce((sum, s) => sum + Number(s.valeur_potentielle_euros), 0);
    recs.push({
      id: "prospect-brulants-urgents",
      type: "prospect",
      impact_estime_euros: impact,
      priorite: "critique",
      action_recommandee: `Relancer immédiatement ${brulants.length} prospect(s) brûlant(s) à échéance ≤2j`,
      justification: `${brulants.length} prospects brûlants risquent de refroidir. Valeur totale menacée : ${impact.toLocaleString("fr-FR")}€.`,
      score_confiance: 92,
    });
  }

  // ── 2. Prospects chauds à valeur élevée ──
  const chaudsHighValue = scorings
    .filter((s) => s.niveau_chaleur === "chaud" && Number(s.valeur_potentielle_euros) >= 1000)
    .sort((a, b) => Number(b.valeur_potentielle_euros) - Number(a.valeur_potentielle_euros));
  if (chaudsHighValue.length > 0) {
    const impact = chaudsHighValue.reduce((sum, s) => sum + Number(s.valeur_potentielle_euros), 0);
    recs.push({
      id: "prospect-chauds-high-value",
      type: "commercial",
      impact_estime_euros: impact,
      priorite: "haute",
      action_recommandee: `Prioriser ${chaudsHighValue.length} prospect(s) chaud(s) à forte valeur (≥1 000€)`,
      justification: `Pipeline commercial de ${impact.toLocaleString("fr-FR")}€ en prospects chauds. Un suivi rapide maximise la conversion.`,
      score_confiance: 85,
    });
  }

  // ── 3. Prospects froids nombreux → nettoyage CRM ──
  const froids = scorings.filter((s) => s.niveau_chaleur === "froid");
  if (froids.length > 5) {
    const ratio = Math.round((froids.length / Math.max(scorings.length, 1)) * 100);
    recs.push({
      id: "sante-crm-froids",
      type: "sante",
      impact_estime_euros: 0,
      priorite: ratio > 50 ? "haute" : "moyenne",
      action_recommandee: `Nettoyer ou relancer ${froids.length} prospects froids (${ratio}% du pipeline)`,
      justification: `Un taux élevé de prospects froids dégrade la qualité CRM et fausse les projections commerciales.`,
      score_confiance: 78,
    });
  }

  // ── 4. Recommandations basées sur le scoring centre ──
  if (latestScore) {
    // Santé CRM faible
    if (latestScore.score_sante < 50) {
      recs.push({
        id: "centre-sante-faible",
        type: "sante",
        impact_estime_euros: 0,
        priorite: prioriteFromScore(100 - latestScore.score_sante),
        action_recommandee: "Compléter les données manquantes des contacts (emails, téléphones)",
        justification: `Score Santé CRM à ${latestScore.score_sante}/100. Des données incomplètes réduisent l'efficacité des relances et campagnes.`,
        score_confiance: 88,
      });
    }

    // Score commercial faible
    if (latestScore.score_commercial < 50) {
      const hotCount = scorings.filter((s) => s.niveau_chaleur === "brulant" || s.niveau_chaleur === "chaud").length;
      recs.push({
        id: "centre-commercial-faible",
        type: "commercial",
        impact_estime_euros: scorings
          .filter((s) => s.niveau_chaleur === "chaud" || s.niveau_chaleur === "brulant")
          .reduce((sum, s) => sum + Number(s.valeur_potentielle_euros), 0),
        priorite: prioriteFromScore(100 - latestScore.score_commercial),
        action_recommandee: `Intensifier la prospection — seulement ${hotCount} prospect(s) chaud(s)/brûlant(s)`,
        justification: `Score Commercial à ${latestScore.score_commercial}/100. Le pipeline actif est insuffisant pour sécuriser les objectifs.`,
        score_confiance: 82,
      });
    }

    // Score administratif faible
    if (latestScore.score_admin < 50) {
      recs.push({
        id: "centre-admin-faible",
        type: "administratif",
        impact_estime_euros: 0,
        priorite: prioriteFromScore(100 - latestScore.score_admin),
        action_recommandee: "Vérifier le remplissage des sessions et finaliser les inscriptions en attente",
        justification: `Score Administratif à ${latestScore.score_admin}/100. Des sessions sous-remplies ou des dossiers incomplets impactent la conformité.`,
        score_confiance: 80,
      });
    }

    // Score financier faible
    if (latestScore.score_financier < 50) {
      recs.push({
        id: "centre-financier-faible",
        type: "financier",
        impact_estime_euros: latestScore.details?.financier?.impaye_30j || 0,
        priorite: prioriteFromScore(100 - latestScore.score_financier),
        action_recommandee: "Relancer les factures impayées et régulariser les paiements en retard",
        justification: `Score Financier à ${latestScore.score_financier}/100. Des impayés non traités dégradent la trésorerie.`,
        score_confiance: 90,
      });
    }

    // Risque CA élevé
    if (latestScore.score_risque_ca < 50) {
      recs.push({
        id: "centre-risque-ca",
        type: "risque",
        impact_estime_euros: scorings
          .filter((s) => s.niveau_chaleur === "froid" || s.niveau_chaleur === "tiede")
          .reduce((sum, s) => sum + Number(s.valeur_potentielle_euros), 0),
        priorite: prioriteFromScore(100 - latestScore.score_risque_ca),
        action_recommandee: "Sécuriser le CA en réactivant les prospects tièdes et en remplissant les sessions",
        justification: `Score Risque CA à ${latestScore.score_risque_ca}/100. Le chiffre d'affaires futur n'est pas suffisamment protégé.`,
        score_confiance: 75,
      });
    }
  }

  // ── 5. Impact global : prospects chauds non traités ──
  const nonTraites = scorings.filter(
    (s) => (s.niveau_chaleur === "brulant" || s.niveau_chaleur === "chaud") && s.facteurs_negatifs && s.facteurs_negatifs.length > 0,
  );
  if (nonTraites.length > 0) {
    const impact = nonTraites.reduce((sum, s) => sum + Number(s.valeur_potentielle_euros), 0);
    recs.push({
      id: "prospect-blockers",
      type: "commercial",
      impact_estime_euros: impact,
      priorite: "haute",
      action_recommandee: `Lever les freins sur ${nonTraites.length} prospect(s) chaud(s)/brûlant(s) avec facteurs négatifs`,
      justification: `${nonTraites.length} prospects à fort potentiel ont des facteurs bloquants identifiés. Résoudre ces freins peut débloquer ${impact.toLocaleString("fr-FR")}€.`,
      score_confiance: 80,
    });
  }

  // Sort by impact (descending), then by priorite
  const prioriteOrder = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
  recs.sort((a, b) => {
    if (a.impact_estime_euros !== b.impact_estime_euros) return b.impact_estime_euros - a.impact_estime_euros;
    return prioriteOrder[a.priorite] - prioriteOrder[b.priorite];
  });

  return recs;
}
