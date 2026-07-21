import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function useAlmaReturnHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const processed = useRef(false);

  useEffect(() => {
    const almaSuccess = searchParams.get("alma_success");
    const factureId = searchParams.get("facture");

    if (almaSuccess === "true" && factureId && !processed.current) {
      processed.current = true;

      const verifyPayment = async () => {
        toast.info("Vérification du paiement Alma en cours…");

        // Poll DB up to ~15s waiting for the webhook to record the ALMA-* reference
        let recorded: { id: string; montant: number } | null = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          await new Promise((r) => setTimeout(r, attempt === 0 ? 1500 : 2500));
          const { data } = await supabase
            .from("paiements")
            .select("id, montant, reference")
            .eq("facture_id", factureId)
            .is("deleted_at", null)
            .ilike("reference", "ALMA-%")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) {
            recorded = { id: data.id, montant: Number(data.montant) };
            break;
          }
        }

        queryClient.invalidateQueries({ queryKey: ["apprenant-paiements"] });
        queryClient.invalidateQueries({ queryKey: ["apprenant-factures"] });
        queryClient.invalidateQueries({ queryKey: ["factures"] });
        queryClient.invalidateQueries({ queryKey: ["paiements"] });

        if (recorded) {
          toast.success(
            `Paiement Alma confirmé (${recorded.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €)`,
          );
        } else {
          toast.warning(
            "Paiement Alma initié — la confirmation tarde. Utilisez « Réconciliation Alma » si elle n'apparaît pas dans 1 min.",
            { duration: 8000 },
          );
        }
      };

      verifyPayment();

      const newParams = new URLSearchParams(searchParams);
      newParams.delete("alma_success");
      newParams.delete("alma_cancel");
      newParams.delete("facture");
      setSearchParams(newParams, { replace: true });
    }

    const almaCancel = searchParams.get("alma_cancel");
    if (almaCancel === "true" && !processed.current) {
      processed.current = true;
      toast.warning("Paiement Alma annulé par le client");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("alma_cancel");
      newParams.delete("facture");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);
}
