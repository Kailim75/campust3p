import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TimelineKind =
  | "created"
  | "inscription"
  | "document"
  | "document_envoi"
  | "facture"
  | "paiement"
  | "examen_t3p"
  | "examen_pratique"
  | "rappel"
  | "auto_note"
  | "note"
  | "historical_import";

export interface TimelineEvent {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  summary?: string | null;
  actor?: string | null;
}

/**
 * Agrège en lecture seule tout le parcours d'un apprenant.
 * Aucune écriture, aucun effet de bord.
 */
export function useApprenantTimeline(contactId: string | null | undefined) {
  return useQuery({
    queryKey: ["apprenant-timeline", contactId],
    enabled: !!contactId,
    staleTime: 30_000,
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!contactId) return [];
      const events: TimelineEvent[] = [];

      // 1. Contact + flag historique
      const contactQ = await supabase
        .from("contacts")
        .select("created_at, is_historical_import, import_source")
        .eq("id", contactId)
        .maybeSingle();
      const contact = contactQ.data;
      if (contact?.created_at) {
        events.push({
          id: `created-${contactId}`,
          at: contact.created_at,
          kind: "created",
          title: "Fiche créée",
          summary: contact.import_source ? `Source : ${contact.import_source}` : null,
        });
        if (contact.is_historical_import) {
          events.push({
            id: `historical-${contactId}`,
            at: contact.created_at,
            kind: "historical_import",
            title: "Marquée comme import historique",
            summary: contact.import_source || "SmartOF",
          });
        }
      }

      // 2. Inscriptions
      const inscQ = await supabase
        .from("session_inscriptions")
        .select("id, created_at, deleted_at, sessions(nom, date_debut)")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(50);
      for (const insc of inscQ.data || []) {
        const session = (insc as { sessions: { nom?: string; date_debut?: string } | null }).sessions;
        events.push({
          id: `insc-${insc.id}`,
          at: insc.created_at,
          kind: "inscription",
          title: insc.deleted_at ? "Désinscription session" : "Inscrit à une session",
          summary: session?.nom
            ? `${session.nom}${session.date_debut ? ` — ${new Date(session.date_debut).toLocaleDateString("fr-FR")}` : ""}`
            : null,
        });
      }

      // 3. Documents
      const docsQ = await supabase
        .from("contact_documents")
        .select("id, created_at, type_document, nom")
        .eq("contact_id", contactId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      for (const doc of docsQ.data || []) {
        events.push({
          id: `doc-${doc.id}`,
          at: doc.created_at,
          kind: "document",
          title: "Document ajouté",
          summary: doc.type_document || doc.nom || null,
        });
      }

      // 4. Envois documents
      const envoiQ = await supabase
        .from("document_envois")
        .select("id, date_envoi, document_type, envoi_type, statut, document_name")
        .eq("contact_id", contactId)
        .order("date_envoi", { ascending: false })
        .limit(50);
      for (const env of envoiQ.data || []) {
        events.push({
          id: `envoi-${env.id}`,
          at: env.date_envoi,
          kind: "document_envoi",
          title: `Document envoyé (${env.envoi_type || "email"})`,
          summary: [env.document_type, env.document_name, env.statut].filter(Boolean).join(" · "),
        });
      }

      // 5. Factures
      const factQ = await supabase
        .from("factures")
        .select("id, created_at, numero_facture, montant_total, statut")
        .eq("contact_id", contactId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      const factureIds: string[] = [];
      for (const f of factQ.data || []) {
        factureIds.push(f.id);
        events.push({
          id: `fact-${f.id}`,
          at: f.created_at,
          kind: "facture",
          title: `Facture ${f.numero_facture || ""}`.trim(),
          summary: `${Number(f.montant_total || 0).toLocaleString("fr-FR")} € · ${f.statut}`,
        });
      }

      // 6. Paiements
      if (factureIds.length > 0) {
        const payQ = await supabase
          .from("paiements")
          .select("id, date_paiement, montant, mode_paiement")
          .in("facture_id", factureIds)
          .is("deleted_at", null)
          .order("date_paiement", { ascending: false })
          .limit(50);
        for (const p of payQ.data || []) {
          events.push({
            id: `pay-${p.id}`,
            at: p.date_paiement,
            kind: "paiement",
            title: "Paiement reçu",
            summary: `${Number(p.montant || 0).toLocaleString("fr-FR")} € · ${p.mode_paiement}`,
          });
        }
      }

      // 7. Examens T3P
      const t3pQ = await supabase
        .from("examens_t3p")
        .select("id, date_examen, statut, resultat, departement, created_at")
        .eq("contact_id", contactId)
        .order("date_examen", { ascending: false })
        .limit(50);
      for (const e of t3pQ.data || []) {
        events.push({
          id: `t3p-${e.id}`,
          at: e.date_examen || e.created_at,
          kind: "examen_t3p",
          title: `Examen T3P ${e.statut || ""}`.trim(),
          summary: [e.resultat, e.departement].filter(Boolean).join(" · ") || null,
        });
      }

      // 8. Examens pratique
      const pratQ = await supabase
        .from("examens_pratique")
        .select("id, date_examen, statut, resultat, created_at")
        .eq("contact_id", contactId)
        .order("date_examen", { ascending: false })
        .limit(50);
      for (const e of pratQ.data || []) {
        events.push({
          id: `prat-${e.id}`,
          at: e.date_examen || e.created_at,
          kind: "examen_pratique",
          title: `Examen pratique ${e.statut || ""}`.trim(),
          summary: e.resultat || null,
        });
      }

      // 9. Historique (notes, rappels, auto)
      const histQ = await supabase
        .from("contact_historique")
        .select("id, date_echange, titre, contenu, date_rappel, alerte_active")
        .eq("contact_id", contactId)
        .order("date_echange", { ascending: false })
        .limit(100);
      for (const h of histQ.data || []) {
        const isAuto = h.titre?.startsWith("[AUTO]");
        const isRappel = !!h.date_rappel && !!h.alerte_active;
        events.push({
          id: `hist-${h.id}`,
          at: h.date_echange,
          kind: isRappel ? "rappel" : isAuto ? "auto_note" : "note",
          title: isRappel
            ? "Rappel créé"
            : (h.titre || "").replace("[AUTO] ", "") || "Note",
          summary: h.contenu || (isRappel && h.date_rappel
            ? `Échéance : ${new Date(h.date_rappel).toLocaleDateString("fr-FR")}`
            : null),
        });
      }

      events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      return events.slice(0, 150);
    },
  });
}
