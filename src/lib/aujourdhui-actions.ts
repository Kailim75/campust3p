import { supabase } from "@/integrations/supabase/client";

// ─── Auto-note format (compact) ───
// Titre:   [AUTO] CMA: relance docs
// Contenu: Canal: Email · Modèle: "CMA docs manquants"

export type ActionCategory =
  | "cma_relance_docs"
  | "cma_relance"
  | "cma_rejete_email"
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
  | "apprenant_reactive"
  | "marquer_fait"
  | "session_convocation"
  | "session_relance_cma"
  | "examen_theorie_reussi"
  | "examen_theorie_echoue"
  | "examen_pratique_reussi"
  | "examen_pratique_echoue"
  | "theorie_reprogrammee"
  | "pratique_programmee"
  | "pratique_reprogrammee"
  | "carte_pro_envoyee"
  | "carte_pro_relance"
  | "carte_pro_demarches_envoyees"
  | "session_email"
  | "session_envoi_convocation"
  | "session_envoi_programme"
  | "session_envoi_attestation"
  | "session_envoi_pack";

interface ActionMeta {
  label: string;
  canal: "Email" | "WhatsApp" | "Téléphone" | "—";
  modele?: string;
}

const ACTION_META: Record<ActionCategory, ActionMeta> = {
  cma_relance_docs:            { label: "CMA: relance docs",            canal: "Email",     modele: "CMA docs manquants" },
  cma_relance:                 { label: "CMA: relance",                 canal: "Email" },
  cma_rejete_email:            { label: "CMA: dossier rejeté",          canal: "Email",     modele: "CMA rejeté" },
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
  apprenant_reactive:          { label: "Apprenant: réactivé",          canal: "—" },
  marquer_fait:                { label: "Marqué comme traité",           canal: "—" },
  session_convocation:         { label: "Session: convocation",          canal: "Email",     modele: "Convocation session" },
  session_relance_cma:         { label: "Session: relance CMA",          canal: "Email",     modele: "Relance CMA session" },
  examen_theorie_reussi:       { label: "Examen: théorie réussie",       canal: "Email",     modele: "Théorie réussie" },
  examen_theorie_echoue:       { label: "Examen: théorie échouée",       canal: "Email",     modele: "Théorie échouée" },
  examen_pratique_reussi:      { label: "Examen: pratique réussie",      canal: "Email",     modele: "Pratique réussie" },
  examen_pratique_echoue:      { label: "Examen: pratique échouée",      canal: "Email",     modele: "Pratique échouée" },
  theorie_reprogrammee:        { label: "Théorie: reprogrammée",         canal: "Email",     modele: "Reprogrammation théorie" },
  pratique_programmee:         { label: "Pratique: programmée",           canal: "Email",     modele: "Programmation pratique" },
  pratique_reprogrammee:       { label: "Pratique: reprogrammée",        canal: "Email",     modele: "Reprogrammation pratique" },
  carte_pro_envoyee:           { label: "Carte Pro: démarches envoyées", canal: "Email",     modele: "Démarches carte pro" },
  carte_pro_relance:           { label: "Carte Pro: relance",            canal: "Email",     modele: "Relance carte pro" },
  carte_pro_demarches_envoyees:{ label: "Carte Pro: démarches envoyées", canal: "Email",     modele: "Démarches carte pro" },
  session_email:               { label: "Session: email",                canal: "Email" },
  session_envoi_convocation:   { label: "Convocation envoyée",          canal: "Email",     modele: "Convocation session" },
  session_envoi_programme:     { label: "Programme envoyé",              canal: "Email",     modele: "Programme session" },
  session_envoi_attestation:   { label: "Attestation envoyée",           canal: "Email",     modele: "Attestation session" },
  session_envoi_pack:          { label: "Pack envoyé",                   canal: "Email",     modele: "Pack session" },
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

/**
 * Fetch the most recent [AUTO] note for a set of contact IDs (any date).
 * Used when no action was taken today to show the last known action.
 */
export async function fetchRecentAutoNotes(contactIds: string[]): Promise<
  Array<{ id: string; contact_id: string; titre: string; created_at: string }>
> {
  if (contactIds.length === 0) return [];
  // Fetch latest note per contact — we get a reasonable batch and deduplicate client-side
  const { data, error } = await supabase
    .from("contact_historique")
    .select("id, contact_id, titre, created_at")
    .in("contact_id", contactIds)
    .like("titre", "[AUTO]%")
    .order("date_echange", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to fetch recent auto notes:", error);
    return [];
  }
  // Deduplicate: keep only the most recent per contact_id
  const seen = new Set<string>();
  const deduped: Array<{ id: string; contact_id: string; titre: string; created_at: string }> = [];
  for (const note of (data || [])) {
    if (!seen.has(note.contact_id)) {
      seen.add(note.contact_id);
      deduped.push(note as any);
    }
  }
  return deduped;
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
