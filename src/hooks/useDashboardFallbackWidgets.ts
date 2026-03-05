import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export function useTopFactures() {
  return useQuery({
    queryKey: ["dashboard", "top-factures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("factures")
        .select("id, numero_facture, montant_total, date_echeance, statut")
        .in("statut", ["emise"])
        .order("montant_total", { ascending: false })
        .limit(5);

      const today = new Date();
      return (data || []).map(f => ({
        id: f.id,
        numero_facture: f.numero_facture,
        montant_total: f.montant_total,
        ageDays: f.date_echeance
          ? Math.max(0, differenceInDays(today, new Date(f.date_echeance)))
          : 0,
      }));
    },
    staleTime: 60_000,
  });
}
