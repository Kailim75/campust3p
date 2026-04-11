import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { runBlockageEngine, countBySeverity, type Blockage } from "@/services/blockageEngine";

async function fetchBlockageData() {
  const [contacts, sessions, inscriptions, factures, documents, templates, satisfaction] = await Promise.all([
    supabase.from("contacts").select("id, nom, prenom, statut, email, telephone, formation, archived").eq("archived", false),
    supabase.from("sessions").select("id, nom, statut, date_debut, date_fin, formation_type, places_totales, archived").eq("archived", false),
    supabase.from("session_inscriptions").select("id, contact_id, session_id, date_inscription").is("deleted_at", null),
    supabase.from("factures").select("id, contact_id, numero_facture, statut, date_emission, montant_total, session_inscription_id").is("deleted_at", null),
    supabase.from("contact_documents").select("id, contact_id, type_document").is("deleted_at", null),
    supabase.from("template_studio_templates").select("id, type, status").eq("status", "published"),
    supabase.from("satisfaction_reponses").select("id, session_id, contact_id"),
  ]);

  const allContacts = contacts.data || [];
  const prospects = allContacts.filter((c) => c.statut === "En attente de validation");

  return runBlockageEngine({
    contacts: allContacts,
    prospects,
    sessions: sessions.data || [],
    inscriptions: inscriptions.data || [],
    factures: factures.data || [],
    documents: documents.data || [],
    templates: templates.data || [],
    satisfaction: satisfaction.data || [],
  });
}

export function useBlockageDiagnostic() {
  return useQuery({
    queryKey: ["blockage-diagnostic"],
    queryFn: async () => {
      const blockages = await fetchBlockageData();
      return { blockages, counts: countBySeverity(blockages) };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export type { Blockage };
