import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CMA_REQUIRED_DOCS } from "@/lib/cma-constants";

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

      const [rappelsRes, contactsRes, docsRes] = await Promise.all([
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
          .neq("statut_cma", "complet"),
        supabase
          .from("contact_documents")
          .select("contact_id, type_document")
          .is("deleted_at", null),
      ]);

      const rappels = rappelsRes.data?.length ?? 0;

      // Build docs map per contact for CMA completeness
      const docsMap = new Map<string, Set<string>>();
      (docsRes.data ?? []).forEach((d: any) => {
        if (!docsMap.has(d.contact_id)) docsMap.set(d.contact_id, new Set());
        docsMap.get(d.contact_id)!.add(d.type_document);
      });

      const cma = (contactsRes.data ?? []).filter((c: any) => {
        const required = CMA_REQUIRED_DOCS[c.formation as keyof typeof CMA_REQUIRED_DOCS] ?? [];
        if (required.length === 0) return false;
        const owned = docsMap.get(c.id) ?? new Set<string>();
        return required.some((doc: string) => !owned.has(doc));
      }).length;

      return { rappels, cma, total: rappels + cma };
    },
  });
}
