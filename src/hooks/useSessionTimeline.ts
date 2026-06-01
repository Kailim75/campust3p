import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SessionTimelineEventType =
  | "session_created"
  | "inscription"
  | "document_sent"
  | "payment"
  | "emargement"
  | "exam"
  | "satisfaction"
  | "attestation"
  | "session_closed";

export interface SessionTimelineEvent {
  id: string;
  type: SessionTimelineEventType;
  date: string; // ISO
  title: string;
  detail?: string;
}

/**
 * Read-only aggregator for the session timeline.
 * No writes, no mutations. Caches 60s.
 */
export function useSessionTimeline(sessionId: string | null) {
  return useQuery({
    queryKey: ["session-timeline", sessionId],
    enabled: !!sessionId,
    staleTime: 60_000,
    queryFn: async (): Promise<SessionTimelineEvent[]> => {
      if (!sessionId) return [];

      const [
        sessionRes,
        inscriptionsRes,
        docsRes,
        emargRes,
        certifsRes,
        satisfRes,
      ] = await Promise.all([
        supabase.from("sessions").select("id, nom, created_at, archived, archived_at, statut").eq("id", sessionId).maybeSingle(),
        supabase
          .from("session_inscriptions")
          .select("id, contact_id, created_at, contacts(prenom, nom)")
          .eq("session_id", sessionId)
          .is("deleted_at", null),
        supabase
          .from("document_envois")
          .select("id, document_type, statut, created_at, contact_id, contacts(prenom, nom)")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("emargements")
          .select("id, date_seance, created_at")
          .eq("session_id", sessionId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("attestation_certificates")
          .select("id, status, created_at, contact_id, contacts(prenom, nom)")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("satisfaction_reponses")
          .select("id, created_at, contact_id, contacts(prenom, nom)")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const events: SessionTimelineEvent[] = [];
      const session = sessionRes.data as any;

      // Fetch payments via inscription_ids (defensive; some tables vary by schema)
      const inscriptions = (inscriptionsRes.data ?? []) as any[];
      const inscriptionIds = inscriptions.map(i => i.id);
      let paiements: any[] = [];
      if (inscriptionIds.length > 0) {
        try {
          const payRes: any = await (supabase as any)
            .from("paiements")
            .select("id, montant, date_paiement, created_at, session_inscription_id")
            .in("session_inscription_id", inscriptionIds)
            .order("date_paiement", { ascending: false })
            .limit(50);
          paiements = (payRes?.data ?? []) as any[];
        } catch {
          paiements = [];
        }
      }

      if (session?.created_at) {
        events.push({
          id: `s-${session.id}`,
          type: "session_created",
          date: session.created_at,
          title: "Création de la session",
          detail: session.nom,
        });
      }

      inscriptions.forEach(i => {
        const c = i.contacts as { prenom?: string; nom?: string } | null;
        events.push({
          id: `i-${i.id}`,
          type: "inscription",
          date: i.created_at,
          title: "Inscription",
          detail: c ? `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() : undefined,
        });
      });

      (docsRes.data ?? []).forEach((d: any) => {
        const c = d.contacts as { prenom?: string; nom?: string } | null;
        events.push({
          id: `d-${d.id}`,
          type: "document_sent",
          date: d.created_at,
          title: `Document ${d.document_type} ${d.statut === "envoye" ? "envoyé" : d.statut}`,
          detail: c ? `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() : undefined,
        });
      });

      paiements.forEach((p: any) => {
        events.push({
          id: `p-${p.id}`,
          type: "payment",
          date: p.date_paiement || p.created_at,
          title: "Paiement reçu",
          detail: p.montant ? `${Number(p.montant).toLocaleString("fr-FR")} €` : undefined,
        });
      });

      (emargRes.data ?? []).forEach((e: any) => {
        events.push({
          id: `e-${e.id}`,
          type: "emargement",
          date: e.date_seance || e.created_at,
          title: "Émargement",
        });
      });

      (certifsRes.data ?? []).forEach((a: any) => {
        const c = a.contacts as { prenom?: string; nom?: string } | null;
        events.push({
          id: `a-${a.id}`,
          type: "attestation",
          date: a.created_at,
          title: `Attestation ${a.status ?? ""}`.trim(),
          detail: c ? `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() : undefined,
        });
      });

      (satisfRes.data ?? []).forEach((s: any) => {
        const c = s.contacts as { prenom?: string; nom?: string } | null;
        events.push({
          id: `sa-${s.id}`,
          type: "satisfaction",
          date: s.created_at,
          title: "Réponse satisfaction",
          detail: c ? `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() : undefined,
        });
      });

      if (session?.statut === "terminee" && session?.archived_at) {
        events.push({
          id: `c-${session.id}`,
          type: "session_closed",
          date: session.archived_at,
          title: "Session clôturée",
        });
      }

      return events
        .filter(e => !!e.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 100);
    },
  });
}
