import { supabase } from "@/integrations/supabase/client";

// ─── Auto-note format (compact) ───
// Titre:   [AUTO] CMA: relance docs
// Contenu: Canal: Email · Modèle: "CMA docs manquants"

export type ActionCategory =
  | "cma_relance_docs"
  | "cma_relance"
  | "prospect_confirmation_rdv"
  | "prospect_relance_j1"
  | "prospect_rdv_manque"
  | "prospect_relance"
  | "prospect_relance_whatsapp"
  | "prospect_appel"
  | "apprenant_demander_docs"
  | "apprenant_relance_paiement"
  | "apprenant_whatsapp"
  | "apprenant_appel"
  | "marquer_fait";

interface ActionMeta {
  label: string;
  canal: "Email" | "WhatsApp" | "Téléphone" | "—";
  modele?: string;
}

const ACTION_META: Record<ActionCategory, ActionMeta> = {
  cma_relance_docs:            { label: "CMA: relance docs",            canal: "Email",     modele: "CMA docs manquants" },
  cma_relance:                 { label: "CMA: relance",                 canal: "Email" },
  prospect_confirmation_rdv:   { label: "RDV — Confirmation",           canal: "Email",     modele: "Confirmation RDV" },
  prospect_relance_j1:         { label: "RDV — Relance J-1",            canal: "Email",     modele: "Relance J-1" },
  prospect_rdv_manque:         { label: "RDV — RDV manqué",             canal: "Email",     modele: "RDV manqué" },
  prospect_relance:            { label: "Relance prospect",             canal: "Email",     modele: "Relance prospect" },
  prospect_relance_whatsapp:   { label: "Relance prospect",             canal: "WhatsApp" },
  prospect_appel:              { label: "Prospect: appel",              canal: "Téléphone" },
  apprenant_demander_docs:     { label: "Apprenant: demande docs",      canal: "Email",     modele: "Demande docs apprenant" },
  apprenant_relance_paiement:  { label: "Apprenant: relance paiement",  canal: "Email",     modele: "Relance paiement" },
  apprenant_whatsapp:          { label: "Apprenant: contact",           canal: "WhatsApp" },
  apprenant_appel:             { label: "Apprenant: appel",             canal: "Téléphone" },
  marquer_fait:                { label: "Marqué comme traité",           canal: "—" },
};

function buildAutoNoteTitle(category: ActionCategory): string {
  return `[AUTO] ${ACTION_META[category].label}`;
}

function buildAutoNoteContenu(category: ActionCategory, extra?: string): string {
  const meta = ACTION_META[category];
  const parts: string[] = [];
  if (meta.canal !== "—") parts.push(`Canal: ${meta.canal}`);
  if (meta.modele) parts.push(`Modèle: "${meta.modele}"`);
  if (extra) parts.push(extra);
  return parts.join(" · ") || "";
}

export interface AutoNoteResult {
  id: string;
  contact_id: string;
}

export async function createAutoNote(
  contactId: string,
  category: ActionCategory,
  extra?: string
): Promise<AutoNoteResult | null> {
  const titre = buildAutoNoteTitle(category);
  const contenu = buildAutoNoteContenu(category, extra) || null;

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

/**
 * Classify a prospect as RDV or Relance based on notes/description content.
 */
export function isProspectRdv(prospect: { notes: string | null; date_prochaine_relance: string | null }): boolean {
  const text = (prospect.notes || "").toLowerCase();
  return text.includes("rdv") || text.includes("rendez-vous") || text.includes("rendez vous");
}
