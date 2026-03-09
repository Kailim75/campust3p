import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { runBlockageEngine, countBySeverity, type Blockage } from "@/services/blockageEngine";

// Cast to avoid deep type instantiation with complex Supabase schemas
const db = supabase as any;

async function fetchBlockageData() {
  const [contacts, sessions, inscriptions, factures, documents, templates, satisfaction] = await Promise.all([
    db.from("contacts").select("id, nom, prenom, statut, email, telephone, formation, archived").eq("archived", false),
    db.from("sessions").select("id, nom, statut, date_debut, date_fin, formation_type, places_totales, archived").eq("archived", false),
    db.from("session_inscriptions").select("id, contact_id, session_id, date_inscription").is("deleted_at", null),
    db.from("factures").select("id, contact_id, numero_facture, statut, date_emission, montant_total, session_inscription_id").is("deleted_at", null),
    db.from("contact_documents").select("id, contact_id, type_document").is("deleted_at", null),
    db.from("template_studio_templates").select("id, type, status").eq("status", "published"),
    db.from("satisfaction_reponses").select("id, session_id, contact_id"),
  ]);

  const allContacts = (contacts.data || []) as any[];
  const prospects = allContacts.filter((c: any) => c.statut === "En attente de validation");

  return runBlockageEngine({
    contacts: allContacts,
    prospects,
    sessions: (sessions.data || []) as any[],
    inscriptions: (inscriptions.data || []) as any[],
    factures: (factures.data || []) as any[],
    documents: (documents.data || []) as any[],
    templates: (templates.data || []) as any[],
    satisfaction: (satisfaction.data || []) as any[],
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
