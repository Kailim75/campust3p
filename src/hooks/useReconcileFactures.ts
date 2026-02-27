import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useReconcileFactures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("reconcile_factures_inscriptions");
      if (error) throw error;
      return data as { facture_id: string; numero_facture: string; contact_id: string; session_inscription_id: string; session_nom: string }[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["session_financials"] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions"] });

      if (data && data.length > 0) {
        toast.success(`${data.length} facture(s) réconciliée(s)`, {
          description: data.map(d => `${d.numero_facture} → ${d.session_nom}`).slice(0, 3).join(", "),
        });
      } else {
        toast.info("Aucune facture orpheline à réconcilier");
      }
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la réconciliation", {
        description: error.message,
      });
    },
  });
}
