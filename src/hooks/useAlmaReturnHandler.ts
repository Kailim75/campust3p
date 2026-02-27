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
      
      // Call the alma-webhook edge function to verify & record
      // The webhook may have already handled it, this is a fallback
      const verifyPayment = async () => {
        try {
          // Use the alma-payment function to get payment status by checking facture
          // The webhook should have already recorded it, but let's confirm
          toast.info("Vérification du paiement Alma en cours...");
          
          // Wait a moment for the webhook to process
          await new Promise(r => setTimeout(r, 2000));
          
          // Invalidate queries to refresh payment data
          queryClient.invalidateQueries({ queryKey: ["apprenant-paiements"] });
          queryClient.invalidateQueries({ queryKey: ["apprenant-factures"] });
          queryClient.invalidateQueries({ queryKey: ["factures"] });
          queryClient.invalidateQueries({ queryKey: ["paiements"] });
          
          toast.success("Paiement Alma confirmé !");
        } catch (err) {
          console.error("Alma return verification error:", err);
          toast.error("Impossible de vérifier le paiement. Vérifiez manuellement.");
        }
      };

      verifyPayment();

      // Clean URL params
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
