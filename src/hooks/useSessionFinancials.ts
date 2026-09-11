/**
 * Totaux financiers par session.
 *
 * Règle unique, déléguée à `src/lib/montants.ts` (source de vérité) : une
 * facture en BROUILLON ou ANNULÉE ne compte dans aucun total, et les versements
 * qui y sont rattachés non plus. Avant le 11/09/2026, seul `nb_non_factures`
 * appliquait cette règle ; la boucle des totaux itérait sur TOUTES les
 * factures, si bien qu'un devis resté en brouillon gonflait le chiffre
 * d'affaires affiché sur la page Sessions.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  calculerResteAEncaisser,
  facturesEncaissables,
  sommeFactures,
  sommePaiementsFactures,
} from "@/lib/montants";

interface PaiementRow {
  montant: number | string | null;
}

interface FactureRow {
  id: string;
  montant_total: number | string | null;
  statut: string | null;
  date_echeance: string | null;
  paiements: PaiementRow[] | null;
}

interface InscriptionRow {
  session_id: string;
  factures: FactureRow[] | null;
}

export interface SessionFinancialData {
  session_id: string;
  /** Encaissé sur les factures comptées (identique à `total_paye`). */
  ca_securise: number;
  /** Facturé sur les factures comptées (identique à `total_facture`). */
  ca_potentiel: number;
  /**
   * ⚠️ Compte des FACTURES au statut « payee », pas des inscriptions : un
   * inscrit portant deux factures soldées en vaut deux ici. Écart de sens
   * connu, laissé tel quel — le corriger changerait la valeur affichée sur la
   * page Sessions, ce n'est pas un correctif de statut.
   */
  nb_payes: number;
  /** ⚠️ Compte des FACTURES au statut « partiel » — même écart que `nb_payes`. */
  nb_partiel: number;
  nb_en_retard: number;      // factures comptées, échues, avec un restant dû
  total_facture: number;     // total invoiced
  total_paye: number;        // total paid
  nb_inscriptions: number;   // inscriptions de la session
  nb_non_factures: number;   // inscriptions sans aucune facture comptée
}

export function useSessionFinancials() {
  return useQuery({
    queryKey: ["session_financials"],
    queryFn: async () => {
      // Single aggregated query: session_inscriptions -> factures -> paiements
      const { data: rawData, error } = await supabase
        .from("session_inscriptions")
        .select(`
          session_id,
          factures:factures!factures_session_inscription_id_fkey (
            id,
            montant_total,
            statut,
            date_echeance,
            paiements:paiements!paiements_facture_id_fkey (
              montant
            )
          )
        `)
        // Corbeille : le filtre doit porter sur la relation IMBRIQUÉE, sinon
        // une facture supprimée continue de peser dans le CA de la session.
        // Sur PostgREST, un `.is("deleted_at", null)` nu filtrerait les
        // INSCRIPTIONS, pas les factures — d'où le préfixe de relation.
        .is("factures.deleted_at", null)
        .is("deleted_at", null);

      if (error) throw error;

      const map: Record<string, SessionFinancialData> = {};
      const today = new Date().toISOString().split("T")[0];

      for (const inscription of (rawData || []) as unknown as InscriptionRow[]) {
        const sid = inscription.session_id;
        if (!map[sid]) {
          map[sid] = {
            session_id: sid,
            ca_securise: 0,
            ca_potentiel: 0,
            nb_payes: 0,
            nb_partiel: 0,
            nb_en_retard: 0,
            total_facture: 0,
            total_paye: 0,
            nb_inscriptions: 0,
            nb_non_factures: 0,
          };
        }

        const entry = map[sid];
        const factures = inscription.factures || [];

        // Une seule règle pour tout le hook : ni les brouillons ni les annulées
        // (STATUTS_FACTURE_EXCLUS). Un brouillon n'est pas encore dû, une
        // annulée ne l'est plus.
        const facturesComptees = facturesEncaissables(factures);
        // Versements rattachés à LEUR facture : un versement porté sur un
        // brouillon ou une annulée est écarté comme la facture elle-même,
        // sinon le payé peut dépasser le facturé.
        const paiementsLies = facturesComptees.flatMap((f) =>
          (f.paiements || []).map((p) => ({ facture_id: f.id, montant: p.montant })),
        );

        // Alertes de la liste (refonte du 23/07/2026) : un inscrit sans
        // facture active doit se voir depuis la page Sessions.
        entry.nb_inscriptions += 1;
        if (facturesComptees.length === 0) entry.nb_non_factures += 1;

        const facture = sommeFactures(facturesComptees);
        const paye = sommePaiementsFactures(facturesComptees, paiementsLies);
        entry.total_facture += facture;
        entry.ca_potentiel += facture;
        entry.total_paye += paye;
        entry.ca_securise += paye;

        for (const f of facturesComptees) {
          if (f.statut === "payee") entry.nb_payes += 1;
          else if (f.statut === "partiel") entry.nb_partiel += 1;

          // En retard : échéance dépassée et restant dû > 0.
          const restant = calculerResteAEncaisser(
            f.montant_total,
            sommePaiementsFactures([f], paiementsLies),
          );
          if (f.date_echeance && f.date_echeance < today && restant > 0) {
            entry.nb_en_retard += 1;
          }
        }
      }

      return map;
    },
    staleTime: 30_000,
  });
}

// Health score calculation
export interface SessionHealthScore {
  score: number;
  level: "saine" | "surveiller" | "danger";
  fillComponent: number;
  caComponent: number;
  calendarComponent: number;
  paymentComponent: number;
}

export function calculateHealthScore(
  inscrits: number,
  placesTotales: number,
  caSecurise: number,
  prix: number,
  dateDebut: string,
  nbPayes: number,
): SessionHealthScore {
  // 1. Fill rate (40%)
  const fillRate = placesTotales > 0 ? (inscrits / placesTotales) * 100 : 0;
  const fillComponent = Math.min(fillRate, 100);

  // 2. CA sécurisé / CA potentiel (30%)
  const caPotentiel = placesTotales * (prix || 0);
  const caComponent = caPotentiel > 0 ? Math.min((caSecurise / caPotentiel) * 100, 100) : 0;

  // 3. Calendar advance (20%)
  const daysUntil = Math.ceil((new Date(dateDebut).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  let calendarComponent = 20;
  if (daysUntil > 30) calendarComponent = 100;
  else if (daysUntil >= 15) calendarComponent = 70;
  else if (daysUntil >= 7) calendarComponent = 40;

  // 4. Payment status (10%)
  const paymentRatio = inscrits > 0 ? nbPayes / inscrits : 0;
  let paymentComponent = 30;
  if (paymentRatio >= 0.8) paymentComponent = 100;
  else if (paymentRatio >= 0.5) paymentComponent = 60;

  const score = Math.round(
    fillComponent * 0.4 +
    caComponent * 0.3 +
    calendarComponent * 0.2 +
    paymentComponent * 0.1
  );

  const level = score >= 80 ? "saine" : score >= 60 ? "surveiller" : "danger";

  return { score, level, fillComponent, caComponent, calendarComponent, paymentComponent };
}
