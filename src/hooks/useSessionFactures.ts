import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Factures d'une session, résolues par inscription avec le MÊME repli que
 * l'onglet Inscrits (getFacturesForInscription) : d'abord les factures
 * rattachées à l'inscription, sinon les factures historiques du contact
 * jamais rattachées (session_inscription_id NULL). Audit du 21/07/2026 :
 * deux surfaces qui résolvent différemment = « Facturer les non-facturés
 * (7) » proposé sur une session intégralement payée.
 *
 * Requête ciblée sur la session (l'ancienne synthèse chargeait les ~290
 * factures du centre pour en garder une dizaine).
 */
export interface SessionFacture {
  id: string;
  numero_facture: string;
  statut: string;
  montant_total: number;
  total_paye: number;
  date_echeance: string | null;
  session_inscription_id: string | null;
  contact_id: string | null;
}

export interface SessionFacturesData {
  /** Factures résolues pour la session, dédupliquées. */
  factures: SessionFacture[];
  /** Résolution par inscription (rattachées, sinon legacy du contact). */
  parInscription: Record<string, SessionFacture[]>;
}

/** Une facture active compte dans les totaux (ni brouillon, ni annulée). */
export function estFactureActive(f: { statut: string }): boolean {
  return f.statut !== "brouillon" && f.statut !== "annulee";
}

/** Définition canonique du retard — identique à Finances et au Pilotage. */
export function estFactureEnRetard(f: {
  statut: string;
  date_echeance: string | null;
  montant_total: number;
  total_paye: number;
}): boolean {
  return (
    ["emise", "partiel", "impayee"].includes(f.statut) &&
    !!f.date_echeance &&
    f.date_echeance < new Date().toISOString().slice(0, 10) &&
    f.montant_total - f.total_paye > 0
  );
}

const FACTURE_COLS =
  "id, numero_facture, statut, montant_total, date_echeance, session_inscription_id, contact_id";

interface FactureRow {
  id: string;
  numero_facture: string;
  statut: string;
  montant_total: number | null;
  date_echeance: string | null;
  session_inscription_id: string | null;
  contact_id: string | null;
}

export function useSessionFactures(sessionId: string) {
  return useQuery({
    queryKey: ["session-factures", sessionId],
    queryFn: async (): Promise<SessionFacturesData> => {
      const { data: inscriptions, error: insError } = await supabase
        .from("session_inscriptions")
        .select("id, contact_id")
        .eq("session_id", sessionId)
        .is("deleted_at", null);
      if (insError) throw insError;
      const ids = (inscriptions || []).map((i) => i.id);
      if (ids.length === 0) return { factures: [], parInscription: {} };
      const contactIds = [...new Set((inscriptions || []).map((i) => i.contact_id))];

      const [liees, legacy] = await Promise.all([
        supabase
          .from("factures")
          .select(FACTURE_COLS)
          .in("session_inscription_id", ids)
          .is("deleted_at", null),
        supabase
          .from("factures")
          .select(FACTURE_COLS)
          .in("contact_id", contactIds)
          .is("session_inscription_id", null)
          .is("deleted_at", null),
      ]);
      if (liees.error) throw liees.error;
      if (legacy.error) throw legacy.error;

      const toutes = [...(liees.data || []), ...(legacy.data || [])] as FactureRow[];
      const factureIds = toutes.map((f) => f.id);
      let payeParFacture = new Map<string, number>();
      if (factureIds.length > 0) {
        const { data: paiements, error: pError } = await supabase
          .from("paiements")
          .select("facture_id, montant")
          .in("facture_id", factureIds);
        if (pError) throw pError;
        payeParFacture = (paiements || []).reduce((m, p) => {
          m.set(p.facture_id, (m.get(p.facture_id) || 0) + Number(p.montant || 0));
          return m;
        }, new Map<string, number>());
      }

      const enrichir = (f: FactureRow): SessionFacture => ({
        ...f,
        montant_total: Number(f.montant_total || 0),
        total_paye: payeParFacture.get(f.id) || 0,
      });
      const lieesEnrichies = (liees.data || []).map((f) => enrichir(f as FactureRow));
      const legacyParContact = new Map<string, SessionFacture[]>();
      (legacy.data || []).forEach((f) => {
        const enr = enrichir(f as FactureRow);
        const liste = legacyParContact.get(enr.contact_id || "") || [];
        liste.push(enr);
        legacyParContact.set(enr.contact_id || "", liste);
      });

      const parInscription: Record<string, SessionFacture[]> = {};
      const vues = new Set<string>();
      const factures: SessionFacture[] = [];
      (inscriptions || []).forEach((i) => {
        const propres = lieesEnrichies.filter((f) => f.session_inscription_id === i.id);
        const resolues = propres.length > 0 ? propres : legacyParContact.get(i.contact_id) || [];
        parInscription[i.id] = resolues;
        resolues.forEach((f) => {
          if (!vues.has(f.id)) {
            vues.add(f.id);
            factures.push(f);
          }
        });
      });

      return { factures, parInscription };
    },
    enabled: !!sessionId,
  });
}
