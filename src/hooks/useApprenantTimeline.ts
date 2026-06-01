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
  at: string; // ISO
  kind: TimelineKind;
  title: string;
  summary?: string | null;
  actor?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Agrège en lecture seule tout le parcours d'un apprenant :
 * création, inscriptions, documents, paiements, examens, rappels,
 * notes manuelles et automatiques, marqueurs SmartOF.
 *
 * Aucune écriture, aucun effet de bord.
 */
export function useApprenantTimeline(contactId: string | null | undefined) {
  return useQuery({
    queryKey: ["apprenant-timeline", contactId],
    enabled: !!contactId,
    staleTime: 30_000,
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!contactId) return [];

      const [
        contactRes,
        inscRes,
        docsRes,
        envoiRes,
        facturesRes,
        paiementsViaFactRes,
        examT3pRes,
        examPratRes,
        historiqueRes,
      ] = await Promise.all([
        supabase
          .from("contacts")
          .select("created_at, is_historical_import, import_source")
          .eq("id", contactId)
          .maybeSingle(),
        supabase
          .from("session_inscriptions")
          .select("id, created_at, deleted_at, sessions(nom, date_debut, formation_type)")
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("contact_documents")
          .select("id, created_at, type_document, nom_fichier")
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("document_envoi_history")
          .select("id, envoye_le, type_document, canal, statut, destinataire")
          .eq("contact_id", contactId)
          .order("envoye_le", { ascending: false })
          .limit(50),
        supabase
          .from("factures")
          .select("id, created_at, numero, montant_total, statut")
          .eq("contact_id", contactId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("factures")
          .select("id")
          .eq("contact_id", contactId)
          .is("deleted_at", null),
        supabase
          .from("examens_t3p")
          .select("id, date_examen, statut, resultat, departement, created_at")
          .eq("contact_id", contactId)
          .order("date_examen", { ascending: false })
          .limit(50),
        supabase
          .from("examens_pratique")
          .select("id, date_examen, statut, resultat, created_at")
          .eq("contact_id", contactId)
          .order("date_examen", { ascending: false })
          .limit(50),
        supabase
          .from("contact_historique")
          .select("id, date_echange, titre, contenu, type, date_rappel, alerte_active")
          .eq("contact_id", contactId)
          .order("date_echange", { ascending: false })
          .limit(100),
      ]);

      // Fetch paiements via factures
      let paiementsRes: { data: Array<{ id: string; date_paiement: string; montant: number; mode_paiement: string; facture_id: string }> | null } = { data: [] };
      const factureIds = (paiementsViaFactRes.data || []).map((f) => f.id);
      if (factureIds.length > 0) {
        const r = await supabase
          .from("paiements")
          .select("id, date_paiement, montant, mode_paiement, facture_id")
          .in("facture_id", factureIds)
          .is("deleted_at", null)
          .order("date_paiement", { ascending: false })
          .limit(50);
        paiementsRes = { data: r.data ?? [] };
      }

      const events: TimelineEvent[] = [];

      // Création + import historique
      const contact = contactRes.data;
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

      // Inscriptions
      for (const insc of inscRes.data || []) {
        const session = (insc as any).sessions as { nom?: string; date_debut?: string } | null;
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

      // Documents générés
      for (const doc of docsRes.data || []) {
        events.push({
          id: `doc-${doc.id}`,
          at: doc.created_at,
          kind: "document",
          title: "Document ajouté",
          summary: doc.type_document || doc.nom_fichier || null,
        });
      }

      // Envois de documents
      for (const env of envoiRes.data || []) {
        events.push({
          id: `envoi-${env.id}`,
          at: env.envoye_le,
          kind: "document_envoi",
          title: `Document envoyé (${env.canal || "email"})`,
          summary: [env.type_document, env.destinataire, env.statut].filter(Boolean).join(" · "),
        });
      }

      // Factures
      for (const f of facturesRes.data || []) {
        events.push({
          id: `fact-${f.id}`,
          at: f.created_at,
          kind: "facture",
          title: `Facture ${f.numero || ""}`.trim(),
          summary: `${Number(f.montant_total || 0).toLocaleString("fr-FR")} € · ${f.statut}`,
        });
      }

      // Paiements
      for (const p of paiementsRes.data || []) {
        events.push({
          id: `pay-${p.id}`,
          at: p.date_paiement,
          kind: "paiement",
          title: "Paiement reçu",
          summary: `${Number(p.montant || 0).toLocaleString("fr-FR")} € · ${p.mode_paiement}`,
        });
      }

      // Examens T3P
      for (const e of examT3pRes.data || []) {
        events.push({
          id: `t3p-${e.id}`,
          at: e.date_examen || e.created_at,
          kind: "examen_t3p",
          title: `Examen T3P ${e.statut || ""}`.trim(),
          summary: [e.resultat, e.departement].filter(Boolean).join(" · ") || null,
        });
      }

      // Examens pratique
      for (const e of examPratRes.data || []) {
        events.push({
          id: `prat-${e.id}`,
          at: e.date_examen || e.created_at,
          kind: "examen_pratique",
          title: `Examen pratique ${e.statut || ""}`.trim(),
          summary: e.resultat || null,
        });
      }

      // Historique (notes auto, manuelles, rappels)
      for (const h of historiqueRes.data || []) {
        const isAuto = h.titre?.startsWith("[AUTO]");
        const isRappel = !!h.date_rappel && h.alerte_active;
        events.push({
          id: `hist-${h.id}`,
          at: h.date_echange,
          kind: isRappel ? "rappel" : isAuto ? "auto_note" : "note",
          title: isRappel
            ? "Rappel créé"
            : (h.titre || "").replace("[AUTO] ", "") || "Note",
          summary: h.contenu || (isRappel && h.date_rappel ? `Échéance : ${new Date(h.date_rappel).toLocaleDateString("fr-FR")}` : null),
        });
      }

      // Trie desc par date
      events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      return events.slice(0, 150);
    },
  });
}
