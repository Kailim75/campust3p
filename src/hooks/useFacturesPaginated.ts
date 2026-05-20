import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FactureStatut, FinancementType, FactureWithDetails } from "./useFactures";

/**
 * Sprint 4.2 — Pagination 100% serveur via la RPC `get_factures_paginated`,
 * qui lit la vue `v_factures_enriched` (total_paye, reste_a_payer, risk_score,
 * is_overdue précalculés). Aucun mapping JS, aucun second appel `paiements`.
 *
 * NB: les joins relationnels (contact, session, partner) ne sont pas exposés
 * par la RPC. Les UIs qui en ont besoin doivent continuer d'utiliser `useFactures`
 * jusqu'à un futur enrichissement de la RPC. Ce hook reste destiné aux vues
 * tabulaires (table densifiée, exports) où la perf prime.
 */
export interface UseFacturesPaginatedParams {
  page: number;
  pageSize?: number;
  statut?: FactureStatut | "all";
  financement?: FinancementType | "all";
  dateFrom?: string | null;
  dateTo?: string | null;
  sortBy?: "created_at" | "date_emission" | "date_echeance" | "montant_total" | "risk_score";
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
      "paginated-v2",
      { page, pageSize, statut, financement, dateFrom, dateTo, sortBy, sortDir, search },
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_factures_paginated" as any, {
        p_page: page,
        p_page_size: pageSize,
        p_statut: statut === "all" ? null : statut,
        p_financement: financement === "all" ? null : financement,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_search: search.trim() || null,
        p_sort_by: sortBy,
        p_sort_dir: sortDir,
      });
      if (error) throw error;
      const res = (data ?? {}) as any;
      return {
        rows: (res.rows ?? []) as FactureWithDetails[],
        total: res.total ?? 0,
        page: res.page ?? page,
        pageSize: res.page_size ?? pageSize,
        totalPages: res.total_pages ?? 1,
      };
    },
  });
}
