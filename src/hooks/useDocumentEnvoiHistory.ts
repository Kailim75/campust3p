// ═══════════════════════════════════════════════════════════════
// useDocumentEnvoiHistory — Unified send tracking for documents
// Single source of truth for both session and learner views
// ═══════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EnvoiEvent {
  id: string;
  contact_id: string | null;
  session_id: string | null;
  document_type: string;
  document_name: string;
  document_path: string | null;
  statut: string;
  date_envoi: string;
  date_reception: string | null;
  envoi_type: string;
  envoyé_par: string | null;
  metadata: Record<string, unknown> | null;
  commentaires: string | null;
  created_at: string;
  /** Tracking columns (added by tracking system) */
  tracking_token: string | null;
  sent_at: string | null;
  clicked_at: string | null;
  click_count: number;
  opened_at: string | null;
  open_count: number;
}

export interface EnvoiSummary {
  /** True if at least one envoi event exists for this doc type */
  alreadySent: boolean;
  /** Number of times this doc type was sent */
  sendCount: number;
  /** Last envoi event (most recent) */
  lastEnvoi: EnvoiEvent | null;
  /** Last technical status */
  lastStatus: string | null;
  /** Date of last envoi */
  lastSentAt: string | null;
  /** Last successful envoi (statut !== 'echec') */
  lastSuccessfulEnvoi: EnvoiEvent | null;
}

/**
 * Fetch all envoi events for a contact+session combination.
 * This is the single source of truth — both session and learner views use this.
 */
export function useDocumentEnvoiHistory(
  contactId?: string | null,
  sessionId?: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: ["document-envoi-history", contactId, sessionId],
    enabled: enabled && !!(contactId || sessionId),
    staleTime: 30_000,
    queryFn: async (): Promise<EnvoiEvent[]> => {
      let query = supabase
        .from("document_envois")
        .select("*")
        .order("date_envoi", { ascending: false });

      if (contactId) query = query.eq("contact_id", contactId);
      if (sessionId) query = query.eq("session_id", sessionId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as EnvoiEvent[];
    },
  });
}


// ── Derived business indicators (pure functions, no DB calls) ──

/**
 * Get a summary for a specific document type for a contact in a session.
 * Dedup key: contact_id + session_id + document_type
 */
export function getEnvoiSummary(
  events: EnvoiEvent[],
  contactId: string,
  sessionId: string,
  documentType: string
): EnvoiSummary {
  const matching = events.filter(
    (e) =>
      e.contact_id === contactId &&
      e.session_id === sessionId &&
      e.document_type === documentType
  );

  const lastEnvoi = matching[0] ?? null;
  const lastSuccessful = matching.find((e) => e.statut !== "echec") ?? null;

  return {
    alreadySent: matching.length > 0,
    sendCount: matching.length,
    lastEnvoi,
    lastStatus: lastEnvoi?.statut ?? null,
    lastSentAt: lastEnvoi?.date_envoi ?? null,
    lastSuccessfulEnvoi: lastSuccessful,
  };
}

/**
 * Get summaries for all document types for a contact in a session.
 */
export function getContactEnvoiSummaries(
  events: EnvoiEvent[],
  contactId: string,
  sessionId: string
): Record<string, EnvoiSummary> {
  const contactEvents = events.filter(
    (e) => e.contact_id === contactId && e.session_id === sessionId
  );

  const types = new Set(contactEvents.map((e) => e.document_type));
  const result: Record<string, EnvoiSummary> = {};

  for (const type of types) {
    result[type] = getEnvoiSummary(events, contactId, sessionId, type);
  }

  return result;
}

/**
 * Check if a document was already sent (for anti-doublon warnings).
 * Returns the summary if already sent, null otherwise.
 */
export function checkAlreadySent(
  events: EnvoiEvent[],
  contactId: string,
  sessionId: string,
  documentType: string
): EnvoiSummary | null {
  const summary = getEnvoiSummary(events, contactId, sessionId, documentType);
  return summary.alreadySent ? summary : null;
}

// ── Sprint 2: Session-level aggregates (pure functions, no DB calls) ──

export interface SessionEnvoiAggregates {
  /** Total number of envoi events for the session */
  totalEnvois: number;
  /** Number of failed envois (statut === 'echec') */
  totalEchecs: number;
  /** Coverage: % of inscrit contactIds that have at least 1 envoi */
  couverturePct: number;
  /** Number of unique contacts with at least 1 envoi */
  contactsCouverts: number;
  /** Total number of inscrit contacts considered */
  totalInscrits: number;
}

/**
 * Compute session-level envoi aggregates from cached events.
 * Coverage = % of inscritContactIds that have ≥1 envoi in the events list.
 */
export function getSessionEnvoiAggregates(
  events: EnvoiEvent[],
  inscritContactIds: string[]
): SessionEnvoiAggregates {
  const totalEnvois = events.length;
  const totalEchecs = events.filter((e) => e.statut === "echec").length;

  const contactsWithEnvoi = new Set(
    events.map((e) => e.contact_id).filter(Boolean)
  );
  const contactsCouverts = inscritContactIds.filter((id) =>
    contactsWithEnvoi.has(id)
  ).length;
  const totalInscrits = inscritContactIds.length;
  const couverturePct =
    totalInscrits > 0 ? Math.round((contactsCouverts / totalInscrits) * 100) : 0;

  return {
    totalEnvois,
    totalEchecs,
    couverturePct,
    contactsCouverts,
    totalInscrits,
  };
}

/**
 * Get the latest envoi event for a specific contact within the session events.
 * Events are assumed to be sorted by date_envoi DESC (as returned by the hook).
 */
export function getLatestEnvoiForContact(
  events: EnvoiEvent[],
  contactId: string
): EnvoiEvent | null {
  return events.find((e) => e.contact_id === contactId) ?? null;
}
