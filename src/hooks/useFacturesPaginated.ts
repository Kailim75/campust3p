import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FactureStatut, FinancementType, FactureWithDetails } from "./useFactures";

/**
 * Sprint 4 — Paginated server-side hook for factures (P1).
 *
 * NOT YET wired into PaiementsPage because the current UI relies on:
 *   - client-side risk sorting (`sortByRiskPriority`)
 *   - `total_paye` aggregated from paiements
 *   - global exports / bulk emit on the whole filtered dataset
 *
 * This hook is shipped now so it is available for the table view migration
 * planned in Sprint 4.2, once the risk-scoring + total_paye logic is moved
 * to a database view or RPC.
 *
 * Usage (future):
 *   const { data, isLoading } = useFacturesPaginated({
 *     page: 1, pageSize: 50,
 *     statut: "emise", financement: "cpf",
 *     dateFrom: "2025-01-01", dateTo: "2025-12-31",
 *     sortBy: "created_at", sortDir: "desc",
 *   });
 *   data?.rows  // FactureWithDetails[] (without total_paye yet)
 *   data?.total // count exact
 */
export interface UseFacturesPaginatedParams {
  page: number;
  pageSize?: number;
  statut?: FactureStatut | "all";
  financement?: FinancementType | "all";
  dateFrom?: string | null;
  dateTo?: string | null;
  sortBy?: "created_at" | "date_emission" | "date_echeance" | "montant_total";
  sortDir?: "asc" | "desc";
  search?: string;
}

export interface PaginatedFactures {
  rows: FactureWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const FACTURE_SELECT_LIGHT = `
  *,
  contact:contacts(id, nom, prenom, email, telephone, civilite, rue, code_postal, ville),
  session_inscription:session_inscriptions(
    id,
    type_payeur,
    payeur_partner_id,
    montant_formation,
    montant_pris_en_charge,
    reste_a_charge,
    session:sessions(id, nom, formation_type, date_debut, date_fin, duree_heures, catalogue_formation:catalogue_formations(id, intitule, code)),
    payeur_partner:partners!session_inscriptions_payeur_partner_id_fkey(id, company_name, email, address)
  )
`;

export function useFacturesPaginated(params: UseFacturesPaginatedParams) {
  const {
    page,
    pageSize = 50,
    statut = "all",
    financement = "all",
    dateFrom = null,
    dateTo = null,
    sortBy = "created_at",
    sortDir = "desc",
    search = "",
  } = params;

  return useQuery<PaginatedFactures>({
    queryKey: [
      "factures",
      "paginated",
      { page, pageSize, statut, financement, dateFrom, dateTo, sortBy, sortDir, search },
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("factures")
        .select(FACTURE_SELECT_LIGHT, { count: "exact" })
        .is("deleted_at", null);

      if (statut !== "all") query = query.eq("statut", statut);
      if (financement !== "all") query = query.eq("type_financement", financement);
      if (dateFrom) query = query.gte("date_emission", dateFrom);
      if (dateTo) query = query.lte("date_emission", dateTo);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        query = query.or(`numero_facture.ilike.${s},commentaires.ilike.${s}`);
      }

      query = query.order(sortBy, { ascending: sortDir === "asc" });
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      // total_paye not computed here yet (requires aggregate join).
      // Sprint 4.2: move to RPC or DB view.
      const rows = (data || []).map((f) => ({ ...f, total_paye: 0 })) as FactureWithDetails[];

      const total = count ?? 0;
      return {
        rows,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    },
  });
}
