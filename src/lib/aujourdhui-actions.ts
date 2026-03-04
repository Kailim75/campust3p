import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Auto-note format ───
// [AUTO] 04/03/2026 21:18 — CMA: relance docs envoyée (Email) — modèle: "CMA docs manquants"

export type ActionCategory =
  | "cma_relance_docs"
  | "cma_relance"
  | "prospect_confirmation_rdv"
  | "prospect_relance"
  | "prospect_relance_whatsapp"
  | "prospect_appel"
  | "apprenant_demander_docs"
  | "apprenant_relance_paiement"
  | "apprenant_whatsapp"
  | "apprenant_appel"
  | "marquer_fait";

const ACTION_LABELS: Record<ActionCategory, string> = {
  cma_relance_docs: "CMA: relance docs envoyée (Email) — modèle: \"CMA docs manquants\"",
  cma_relance: "CMA: relance envoyée",
  prospect_confirmation_rdv: "Prospect: confirmation RDV (Email)",
  prospect_relance: "Relance prospect (Email)",
  prospect_relance_whatsapp: "Relance prospect (WhatsApp)",
  prospect_appel: "Prospect: appel effectué",
  apprenant_demander_docs: "Apprenant: demande docs envoyée (Email)",
  apprenant_relance_paiement: "Apprenant: relance paiement envoyée (Email)",
  apprenant_whatsapp: "Apprenant: contact WhatsApp",
  apprenant_appel: "Apprenant: appel effectué",
  marquer_fait: "Marqué comme traité",
};

function buildAutoNoteTitle(category: ActionCategory): string {
  const now = format(new Date(), "dd/MM/yyyy HH:mm");
  return `[AUTO] ${now} — ${ACTION_LABELS[category]}`;
}

export interface AutoNoteResult {
  id: string;
  contact_id: string;
}

/**
 * Create an [AUTO] note on a contact's historique.
 * Returns the created note id for undo.
 */
export async function createAutoNote(
  contactId: string,
  category: ActionCategory,
  extra?: string
): Promise<AutoNoteResult | null> {
  const titre = buildAutoNoteTitle(category);
  const contenu = extra || null;

  const { data, error } = await supabase
    .from("contact_historique")
    .insert({
      contact_id: contactId,
      type: "note" as const,
      titre,
      contenu,
      date_echange: new Date().toISOString(),
    })
    .select("id, contact_id")
    .single();

  if (error) {
    console.error("Failed to create auto note:", error);
    return null;
  }

  return data as AutoNoteResult;
}

/**
 * Delete an auto note (for undo).
 */
export async function deleteAutoNote(noteId: string): Promise<boolean> {
  const { error } = await supabase
    .from("contact_historique")
    .delete()
    .eq("id", noteId);

  if (error) {
    console.error("Failed to delete auto note:", error);
    return false;
  }
  return true;
}

/**
 * Fetch today's [AUTO] notes to detect already-handled items.
 */
export async function fetchTodayAutoNotes(): Promise<
  Array<{ id: string; contact_id: string; titre: string; created_at: string }>
> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("contact_historique")
    .select("id, contact_id, titre, created_at")
    .gte("date_echange", todayStart.toISOString())
    .like("titre", "[AUTO]%")
    .order("date_echange", { ascending: false });

  if (error) {
    console.error("Failed to fetch today's auto notes:", error);
    return [];
  }
  return (data || []) as Array<{ id: string; contact_id: string; titre: string; created_at: string }>;
}

/**
 * Check if a contact has been handled today for a given category keyword.
 */
export function isHandledToday(
  contactId: string,
  todayNotes: Array<{ contact_id: string; titre: string }>,
  categoryKeywords: string[]
): boolean {
  return todayNotes.some(
    (n) =>
      n.contact_id === contactId &&
      categoryKeywords.some((kw) => n.titre.includes(kw))
  );
}
