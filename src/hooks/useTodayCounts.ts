import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMissingCmaDocs } from "@/lib/cma-constants";
import { resolveFormationTrack, type FormationTrack } from "@/lib/formation-track";
import {
  fetchSharedContactDocs,
  fetchSharedInscriptions,
  fetchSharedRappelsActifs,
} from "@/lib/shared-queries";

/**
 * Lightweight counts for the global Today badge in the header.
 * Two signals matter for the dirigeant:
 *  - rappels actifs dont la date est passée ou aujourd'hui
 *  - apprenants dont le dossier CMA est incomplet
 * Refreshed every 5 min — never blocks the header render.
 *
 * Perf (18/07/2026) : docs / inscriptions / rappels passent par les requêtes
 * partagées (également consommées par le hub « Aujourd'hui »), et le badge
 * est monté en différé (`enabled`) pour sortir du chemin critique du premier
 * chargement de chaque page.
 */
export function useTodayCounts(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["today-counts"],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];

      const [rappelsActifs, contactsRes, docs, inscriptions, workflowRes] = await Promise.all([
        fetchSharedRappelsActifs(queryClient),
        supabase
          .from("contacts")
          .select("id, statut_cma, formation")
          .eq("archived", false)
          .is("deleted_at", null)
          .in("statut_cma", ["docs_manquants", "en_cours", "rejete"]),
        fetchSharedContactDocs(queryClient),
        fetchSharedInscriptions(queryClient),
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

      // La requête partagée renvoie TOUS les rappels actifs datés ;
      // le badge ne compte que ceux dus aujourd'hui ou avant.
      const rappels = rappelsActifs.filter((r) => r.date_rappel <= todayStr).length;

      // Build docs map per contact for CMA completeness
      const docsMap = new Map<string, Set<string>>();
      docs.forEach((d) => {
        if (!docsMap.has(d.contact_id)) docsMap.set(d.contact_id, new Set());
        docsMap.get(d.contact_id)!.add(d.type_document);
      });

      const contactsById = new Map((contactsRes.data ?? []).map((c: any) => [c.id, c]));
      const trackByContactId = new Map<string, FormationTrack>();
      inscriptions.forEach((inscription) => {
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

      const workflowAlerts = workflowRes.data?.length ?? 0;

      return { rappels, cma, workflowAlerts, total: rappels + cma + workflowAlerts };
    },
  });
}
