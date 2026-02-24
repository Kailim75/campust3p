import { useMemo } from "react";
import { CreneauConduite } from "@/hooks/usePlanningConduite";
import { differenceInMinutes, parseISO, differenceInHours, startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

const DEFAULT_TARIF_HORAIRE = 80; // € configurable

export interface WeeklyKPIs {
  heuresProgrammees: number;
  heuresReservees: number;
  tauxOccupation: number;
  caGenere: number;
  potentielRecuperable: number;
  creneauxARisque: CreneauConduite[];
  scoreRentabilite: number;
  scoreLabel: string;
  scoreColor: "success" | "warning" | "destructive";
  variationVsSemainePrecedente: number | null;
}

function getCreneauDurationHours(c: CreneauConduite): number {
  if (!c.heure_debut || !c.heure_fin) return 0;
  const [hd, md] = c.heure_debut.split(":").map(Number);
  const [hf, mf] = c.heure_fin.split(":").map(Number);
  return Math.max(0, (hf * 60 + mf - hd * 60 - md) / 60);
}

function isCreneauVide(c: CreneauConduite): boolean {
  return c.statut === "disponible" && !c.contact_id;
}

function isCreneauReserve(c: CreneauConduite): boolean {
  return (c.statut === "reserve" || c.statut === "confirme" || c.statut === "realise") && !isCreneauVide(c);
}

export function useWeeklyPlanningKPIs(
  creneaux: CreneauConduite[] | undefined,
  previousWeekCreneaux?: CreneauConduite[] | undefined,
  tarifHoraire: number = DEFAULT_TARIF_HORAIRE
): WeeklyKPIs {
  return useMemo(() => {
    const slots = (creneaux || []).filter(c => c.statut !== "annule");
    
    const heuresProgrammees = slots.reduce((sum, c) => sum + getCreneauDurationHours(c), 0);
    const reserved = slots.filter(isCreneauReserve);
    const heuresReservees = reserved.reduce((sum, c) => sum + getCreneauDurationHours(c), 0);
    const tauxOccupation = heuresProgrammees > 0 ? (heuresReservees / heuresProgrammees) * 100 : 0;
    const caGenere = heuresReservees * tarifHoraire;
    
    const vides = slots.filter(isCreneauVide);
    const heuresVides = vides.reduce((sum, c) => sum + getCreneauDurationHours(c), 0);
    const potentielRecuperable = heuresVides * tarifHoraire;

    // Créneaux à risque: vides et < 48h
    const now = new Date();
    const creneauxARisque = vides.filter(c => {
      const creneauDate = parseISO(c.date_creneau);
      const hoursUntil = differenceInHours(creneauDate, now);
      return hoursUntil >= 0 && hoursUntil < 48;
    });

    // Score rentabilité
    const occupationScore = Math.min(100, tauxOccupation) * 0.6;
    let risqueScore: number;
    const nbRisque = creneauxARisque.length;
    if (nbRisque === 0) risqueScore = 100;
    else if (nbRisque <= 2) risqueScore = 70;
    else if (nbRisque <= 4) risqueScore = 40;
    else risqueScore = 20;
    const scoreRentabilite = Math.round(occupationScore + risqueScore * 0.4);

    const scoreLabel = scoreRentabilite >= 85 ? "Optimisée" : scoreRentabilite >= 70 ? "Correct" : "Sous-exploitée";
    const scoreColor = scoreRentabilite >= 85 ? "success" as const : scoreRentabilite >= 70 ? "warning" as const : "destructive" as const;

    // Variation vs semaine précédente
    let variationVsSemainePrecedente: number | null = null;
    if (previousWeekCreneaux) {
      const prevSlots = previousWeekCreneaux.filter(c => c.statut !== "annule");
      const prevProgrammees = prevSlots.reduce((sum, c) => sum + getCreneauDurationHours(c), 0);
      const prevReserved = prevSlots.filter(isCreneauReserve);
      const prevReservees = prevReserved.reduce((sum, c) => sum + getCreneauDurationHours(c), 0);
      const prevTaux = prevProgrammees > 0 ? (prevReservees / prevProgrammees) * 100 : 0;
      if (prevTaux > 0) {
        variationVsSemainePrecedente = tauxOccupation - prevTaux;
      }
    }

    return {
      heuresProgrammees: Math.round(heuresProgrammees * 10) / 10,
      heuresReservees: Math.round(heuresReservees * 10) / 10,
      tauxOccupation: Math.round(tauxOccupation),
      caGenere: Math.round(caGenere),
      potentielRecuperable: Math.round(potentielRecuperable),
      creneauxARisque,
      scoreRentabilite,
      scoreLabel,
      scoreColor,
      variationVsSemainePrecedente: variationVsSemainePrecedente !== null ? Math.round(variationVsSemainePrecedente) : null,
    };
  }, [creneaux, previousWeekCreneaux, tarifHoraire]);
}
