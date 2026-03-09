// ═══════════════════════════════════════════════════════════════
// IA Director — Impact Estimation Engine
// ═══════════════════════════════════════════════════════════════

import type { AuditContext } from "./types";

const DEFAULT_PRIX_FORMATION = 1500;
const DEFAULT_TAUX_REMPLISSAGE = 0.6;

export function computeImpact(
  ruleId: string,
  affectedRecords: any[],
  ctx: AuditContext
): number {
  const prixMoyen = ctx.centreConfig?.prix_formation_moyen ?? DEFAULT_PRIX_FORMATION;
  const tauxRemplissage = ctx.centreConfig?.taux_remplissage_historique ?? DEFAULT_TAUX_REMPLISSAGE;

  switch (ruleId) {
    // ── Prospects ──
    case "prospect_sans_relance":
    case "prospect_chaud_inactif":
    case "triple_relance": {
      const scoringsMap = new Map(ctx.scorings.map((s: any) => [s.prospect_id, s]));
      return affectedRecords.reduce((sum, p) => {
        const scoring = scoringsMap.get(p.id);
        if (scoring) {
          return sum + Number(scoring.valeur_potentielle_euros) * (scoring.probabilite_conversion / 100);
        }
        return sum + prixMoyen * 0.2; // fallback: 20% conversion
      }, 0);
    }

    case "pipeline_faible": {
      // Impact = what the centre should have in pipeline
      return prixMoyen * 5; // 5 × prix moyen as minimum pipeline
    }

    // ── Sessions ──
    case "session_sous_remplie": {
      return affectedRecords.reduce((sum, s) => {
        const places = s.places_totales ?? 10;
        const inscrits = ctx.inscriptions.filter((i: any) => i.session_id === s.id).length;
        const placesRestantes = places - inscrits;
        return sum + placesRestantes * prixMoyen * tauxRemplissage;
      }, 0);
    }

    case "session_sans_inscription": {
      return affectedRecords.reduce((sum, s) => {
        const places = s.places_totales ?? 10;
        return sum + places * prixMoyen * tauxRemplissage * 0.5; // 50% chance of filling
      }, 0);
    }

    default:
      return 0;
  }
}
