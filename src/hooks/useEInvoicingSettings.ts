import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCentreContext } from "@/contexts/CentreContext";
import { toast } from "sonner";

export interface EInvoicingSettings {
  einv_blocking_threshold: number;
  einv_default_vat_regime: string;
  einv_pdp_choice: string;
}

const DEFAULTS: EInvoicingSettings = {
  einv_blocking_threshold: 70,
  einv_default_vat_regime: "exonere_261_4_4_a",
  einv_pdp_choice: "non_choisie",
};

/**
 * Sprint 7 — Center-level e-invoicing parameters (threshold, default VAT regime, chosen PDP).
 * Read everywhere conformity decisions are made; written from the Settings page.
 */
export function useEInvoicingSettings() {
  const { centreId } = useCentreContext();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["einv-settings", centreId],
    enabled: !!centreId,
    queryFn: async (): Promise<EInvoicingSettings> => {
      const { data, error } = await supabase
        .from("centre_formation")
        .select("einv_blocking_threshold, einv_default_vat_regime, einv_pdp_choice")
        .eq("id", centreId!)
        .single();
      if (error) throw error;
      return {
        einv_blocking_threshold: data?.einv_blocking_threshold ?? DEFAULTS.einv_blocking_threshold,
        einv_default_vat_regime: data?.einv_default_vat_regime ?? DEFAULTS.einv_default_vat_regime,
        einv_pdp_choice: data?.einv_pdp_choice ?? DEFAULTS.einv_pdp_choice,
      };
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<EInvoicingSettings>) => {
      if (!centreId) throw new Error("centre manquant");
      const { error } = await supabase
        .from("centre_formation")
        .update(patch)
        .eq("id", centreId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paramètres e-invoicing enregistrés");
      qc.invalidateQueries({ queryKey: ["einv-settings", centreId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Échec de la mise à jour"),
  });

  return { ...query, settings: query.data ?? DEFAULTS, save };
}
