import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "./useContacts";

export interface EnrichedContact extends Contact {
  // Session info
  sessionName: string | null;
  sessionDateDebut: string | null;
  sessionId: string | null;
  // Payment info
  totalFacture: number;
  totalPaye: number;
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

function computePaymentStatus(
  totalFacture: number,
  totalPaye: number,
  dateEcheance: string | null
): EnrichedContact["paymentStatus"] {
  if (totalFacture <= 0) return "attente";
  if (totalPaye >= totalFacture) return "paye";
  if (totalPaye > 0) {
    if (dateEcheance && new Date(dateEcheance) < new Date()) return "retard";
    return "partiel";
  }
  if (dateEcheance && new Date(dateEcheance) < new Date()) return "retard";
  return "attente";
}

// Core required document types for a complete dossier
const REQUIRED_DOC_TYPES = [
  "piece_identite",
  "justificatif_domicile",
  "photo_identite",
  "permis_conduire",
];

export function useEnrichedContacts() {
  return useQuery({
    queryKey: ["contacts", "enriched"],
    queryFn: async () => {
      // Parallel fetches — no N+1
      const [
        contactsRes,
        inscriptionsRes,
        facturesRes,
        paiementsRes,
        documentsRes,
        examensRes,
        fichesRes,
      ] = await Promise.all([
        supabase
          .from("contacts")
          .select("*")
          .eq("archived", false)
          .order("created_at", { ascending: false }),
        supabase
          .from("session_inscriptions")
          .select("contact_id, session_id, sessions(id, nom, date_debut)")
          .eq("statut", "inscrit")
          .is("deleted_at", null),
        supabase
          .from("factures")
          .select("contact_id, montant_total, date_echeance, statut")
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

      // Factures per contact
      const factureMap = new Map<string, { total: number; echeance: string | null }>();
      if (facturesRes.data) {
        for (const f of facturesRes.data) {
          if (f.statut === "annulee") continue;
          const existing = factureMap.get(f.contact_id) || { total: 0, echeance: null };
          existing.total += f.montant_total;
          if (f.date_echeance) {
            if (!existing.echeance || f.date_echeance < existing.echeance) {
              existing.echeance = f.date_echeance;
            }
          }
          factureMap.set(f.contact_id, existing);
        }
      }

      // Paiements per contact
      const paiementMap = new Map<string, number>();
      if (paiementsRes.data) {
        for (const p of paiementsRes.data as any[]) {
          const contactId = p.factures?.contact_id;
          if (contactId) {
            paiementMap.set(contactId, (paiementMap.get(contactId) || 0) + p.montant);
          }
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
        const facture = factureMap.get(c.id) || { total: 0, echeance: null };
        const totalPaye = paiementMap.get(c.id) || 0;
        const docs = docMap.get(c.id) || new Set();
        const exam = examMap.get(c.id);
        const progress = progressMap.get(c.id) ?? null;

        const missingDocs = REQUIRED_DOC_TYPES.filter((t) => !docs.has(t)).length;

        return {
          ...c,
          sessionName: session?.name ?? null,
          sessionDateDebut: session?.dateDebut ?? null,
          sessionId: session?.id ?? null,
          totalFacture: facture.total,
          totalPaye,
          dateEcheance: facture.echeance,
          paymentStatus: computePaymentStatus(facture.total, totalPaye, facture.echeance),
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
