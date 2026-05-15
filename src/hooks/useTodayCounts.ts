import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMissingCmaDocs } from "@/lib/cma-constants";
import { resolveFormationTrack, type FormationTrack } from "@/lib/formation-track";

/**
 * Lightweight counts for the global Today badge in the header.
 * Two signals matter for the dirigeant:
 *  - rappels actifs dont la date est passée ou aujourd'hui
 *  - apprenants dont le dossier CMA est incomplet
 * Refreshed every 5 min — never blocks the header render.
 */
export function useTodayCounts() {
  return useQuery({
    queryKey: ["today-counts"],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];

      const [rappelsRes, contactsRes, docsRes, inscriptionsRes, workflowRes] = await Promise.all([
        supabase
          .from("contact_historique")
          .select("contact_id, date_rappel", { count: "exact", head: false })
          .eq("alerte_active", true)
          .not("date_rappel", "is", null)
          .lte("date_rappel", todayStr),
        supabase
          .from("contacts")
          .select("id, statut_cma, formation")
          .eq("archived", false)
          .is("deleted_at", null)
          .in("statut_cma", ["docs_manquants", "en_cours", "rejete"]),
        supabase
          .from("contact_documents")
          .select("contact_id, type_document")
          .is("deleted_at", null),
        supabase
          .from("session_inscriptions")
          .select("contact_id, track")
          .is("deleted_at", null),
        (supabase as any)
          .from("v_inscription_workflow")
          .select("inscription_id, alert_convocation_missing, alert_convocation_unsent, alert_contract_unsigned, alert_emargement_missing, alert_attestation_late")
          .or(
            "alert_convocation_missing.eq.true," +
            "alert_convocation_unsent.eq.true," +
            "alert_contract_unsigned.eq.true," +
            "alert_emargement_missing.eq.true," +
            "alert_attestation_late.eq.true"
          ),
      ]);

      const rappels = rappelsRes.data?.length ?? 0;

      // Build docs map per contact for CMA completeness
      const docsMap = new Map<string, Set<string>>();
      (docsRes.data ?? []).forEach((d: any) => {
        if (!docsMap.has(d.contact_id)) docsMap.set(d.contact_id, new Set());
        docsMap.get(d.contact_id)!.add(d.type_document);
      });

      const contactsById = new Map((contactsRes.data ?? []).map((c: any) => [c.id, c]));
      const trackByContactId = new Map<string, FormationTrack>();
      (inscriptionsRes.data ?? []).forEach((inscription: any) => {
        const contact = contactsById.get(inscription.contact_id) as any;
        const track = resolveFormationTrack(inscription.track, contact?.formation);
        const currentTrack = trackByContactId.get(inscription.contact_id);
        if (!currentTrack || currentTrack !== "initial") {
          trackByContactId.set(inscription.contact_id, track);
        }
      });

      const cma = (contactsRes.data ?? []).filter((c: any) => {
        const owned = docsMap.get(c.id) ?? new Set<string>();
        const track = trackByContactId.get(c.id) || resolveFormationTrack(null, c.formation);
        return getMissingCmaDocs(owned, track).length > 0;
      }).length;

      return { rappels, cma, total: rappels + cma };
    },
  });
}
