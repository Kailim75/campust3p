import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  estFactureComptee,
  resteAEncaisserParFacture,
  sommeFactures,
  sommePaiementsFactures,
  tropPercu,
} from "@/lib/montants";
import type { Contact } from "./useContacts";

export interface EnrichedContact extends Contact {
  // Session info
  sessionName: string | null;
  sessionDateDebut: string | null;
  sessionId: string | null;
  // Payment info
  totalFacture: number;
  totalPaye: number;
  /** Reste dû calculé facture par facture, comme sur la fiche apprenant. */
  resteDu: number;
  /** Excédent encaissé, facture par facture. */
  tropPercu: number;
  dateEcheance: string | null;
  paymentStatus: "paye" | "partiel" | "retard" | "attente";
  // Documents info (expert)
  documentsManquants: number;
  // Exam info (expert)
  examDate: string | null;
  examResultat: string | null;
  // Progression (expert)
  progressionPercent: number | null;
}

/**
 * Le solde vient de `resteDu` (calculé facture par facture) et non d'une
 * comparaison de totaux : un apprenant en trop-perçu sur une facture et
 * impayé sur une autre s'affichait « à jour » dans la liste et « en
 * retard » dans sa fiche.
 */
export function computePaymentStatus(
  totalFacture: number,
  totalPaye: number,
  resteDu: number,
  dateEcheance: string | null
): EnrichedContact["paymentStatus"] {
  if (totalFacture <= 0) return "attente";
  if (resteDu <= 0) return "paye";
  const enRetard = !!dateEcheance && new Date(dateEcheance) < new Date();
  if (totalPaye > 0) return enRetard ? "retard" : "partiel";
  return enRetard ? "retard" : "attente";
}

interface FactureContact {
  id: string;
  montant_total: number | null;
  statut: string | null;
  date_echeance: string | null;
}

interface PaiementContact {
  facture_id: string | null;
  montant: number | null;
}

// Core required document types for a complete dossier
const REQUIRED_DOC_TYPES = [
  "piece_identite",
  "justificatif_domicile",
  "photo_identite",
  "permis_conduire",
];

export function useEnrichedContacts(options: { inclureHistorique?: boolean } = {}) {
  const { inclureHistorique = false } = options;
  return useQuery({
    queryKey: ["contacts", "enriched", { inclureHistorique }],
    queryFn: async () => {
      // Parallel fetches — no N+1
      const contactsQuery = supabase
        .from("contacts")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (!inclureHistorique) contactsQuery.eq("is_historical_import", false);

      const [
        contactsRes,
        inscriptionsRes,
        facturesRes,
        paiementsRes,
        documentsRes,
        examensRes,
        fichesRes,
      ] = await Promise.all([
        contactsQuery,
        supabase
          .from("session_inscriptions")
          .select("contact_id, session_id, sessions(id, nom, date_debut)")
          .eq("statut", "inscrit")
          .is("deleted_at", null),
        supabase
          .from("factures")
          .select("id, contact_id, montant_total, date_echeance, statut")
          .is("deleted_at", null),
        supabase
          .from("paiements")
          .select("facture_id, montant, factures!inner(contact_id)")
          .is("deleted_at", null),
        supabase
          .from("contact_documents")
          .select("contact_id, type_document")
          .is("deleted_at", null),
        supabase
          .from("examens_t3p")
          .select("contact_id, date_examen, resultat, statut")
          .order("date_examen", { ascending: false }),
        supabase
          .from("fiches_pratique")
          .select("contact_id, heures_prevues, heures_realisees"),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      const contacts = contactsRes.data as Contact[];

      // Build lookup maps
      // Session per contact (latest inscription)
      const sessionMap = new Map<string, { name: string; dateDebut: string; id: string }>();
      if (inscriptionsRes.data) {
        for (const insc of inscriptionsRes.data as any[]) {
          const s = insc.sessions;
          if (s && !sessionMap.has(insc.contact_id)) {
            sessionMap.set(insc.contact_id, {
              name: s.nom,
              dateDebut: s.date_debut,
              id: s.id,
            });
          }
        }
      }

      // Factures per contact — la liste, pas la somme : le reste dû se calcule
      // facture par facture. Brouillons et annulées écartés (lib/montants).
      const factureMap = new Map<string, FactureContact[]>();
      const echeanceMap = new Map<string, string>();
      if (facturesRes.data) {
        for (const f of facturesRes.data) {
          if (!f.contact_id || !estFactureComptee(f)) continue;
          const liste = factureMap.get(f.contact_id);
          if (liste) liste.push(f);
          else factureMap.set(f.contact_id, [f]);
          if (f.date_echeance) {
            const actuelle = echeanceMap.get(f.contact_id);
            if (!actuelle || f.date_echeance < actuelle) {
              echeanceMap.set(f.contact_id, f.date_echeance);
            }
          }
        }
      }

      // Paiements per contact — `facture_id` déjà chargé, aucune requête de plus
      const paiementMap = new Map<string, PaiementContact[]>();
      if (paiementsRes.data) {
        for (const p of paiementsRes.data as any[]) {
          const contactId = p.factures?.contact_id;
          if (!contactId) continue;
          const ligne = { facture_id: p.facture_id, montant: p.montant };
          const liste = paiementMap.get(contactId);
          if (liste) liste.push(ligne);
          else paiementMap.set(contactId, [ligne]);
        }
      }

      // Documents per contact
      const docMap = new Map<string, Set<string>>();
      if (documentsRes.data) {
        for (const d of documentsRes.data) {
          if (!docMap.has(d.contact_id)) docMap.set(d.contact_id, new Set());
          docMap.get(d.contact_id)!.add(d.type_document);
        }
      }

      // Exams per contact (latest)
      const examMap = new Map<string, { date: string; resultat: string | null }>();
      if (examensRes.data) {
        for (const e of examensRes.data) {
          if (!examMap.has(e.contact_id)) {
            examMap.set(e.contact_id, { date: e.date_examen, resultat: e.resultat });
          }
        }
      }

      // Fiches pratique per contact
      const progressMap = new Map<string, number>();
      if (fichesRes.data) {
        for (const f of fichesRes.data) {
          if (f.heures_prevues > 0) {
            const pct = Math.min(100, Math.round((f.heures_realisees / f.heures_prevues) * 100));
            progressMap.set(f.contact_id, pct);
          }
        }
      }

      // Enrich contacts
      return contacts.map((c): EnrichedContact => {
        const session = sessionMap.get(c.id);
        const factures = factureMap.get(c.id) ?? [];
        const paiements = paiementMap.get(c.id) ?? [];
        const docs = docMap.get(c.id) || new Set();
        const exam = examMap.get(c.id);
        const progress = progressMap.get(c.id) ?? null;

        const totalFacture = sommeFactures(factures);
        const totalPaye = sommePaiementsFactures(factures, paiements);
        const resteDu = resteAEncaisserParFacture(factures, paiements);
        const dateEcheance = echeanceMap.get(c.id) ?? null;

        const missingDocs = REQUIRED_DOC_TYPES.filter((t) => !docs.has(t)).length;

        return {
          ...c,
          sessionName: session?.name ?? null,
          sessionDateDebut: session?.dateDebut ?? null,
          sessionId: session?.id ?? null,
          totalFacture,
          totalPaye,
          resteDu,
          tropPercu: tropPercu(factures, paiements),
          dateEcheance,
          paymentStatus: computePaymentStatus(totalFacture, totalPaye, resteDu, dateEcheance),
          documentsManquants: missingDocs,
          examDate: exam?.date ?? null,
          examResultat: exam?.resultat ?? null,
          progressionPercent: progress,
        };
      });
    },
    staleTime: 30_000,
  });
}
