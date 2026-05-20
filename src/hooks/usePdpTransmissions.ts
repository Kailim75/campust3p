import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PdpTransmission {
  id: string;
  facture_id: string;
  centre_id: string;
  pdp_target: string;
  statut: "en_attente" | "envoye" | "accepte" | "rejete" | "erreur";
  pdp_reference: string | null;
  payload: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  created_by: string | null;
}

/**
 * Sprint 8 — Historique des transmissions PDP d'une facture + actions
 * (génération Factur-X, soumission PDP).
 */
export function usePdpTransmissions(factureId: string | null | undefined) {
  const qc = useQueryClient();

  const list = useQuery<PdpTransmission[]>({
    queryKey: ["pdp-transmissions", factureId],
    enabled: !!factureId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facture_pdp_transmissions" as any)
        .select("*")
        .eq("facture_id", factureId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PdpTransmission[];
    },
  });

  const generateFacturX = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("generate-facturx", {
        body: { facture_id: id },
      });
      if (error) throw error;
      return data as { xml: string; generated_at: string };
    },
    onSuccess: () => {
      toast.success("XML Factur-X généré");
      qc.invalidateQueries({ queryKey: ["factures"] });
      qc.invalidateQueries({ queryKey: ["pdp-transmissions", factureId] });
    },
    onError: (e: any) => toast.error(`Échec génération Factur-X : ${e.message ?? e}`),
  });

  const submitPdp = useMutation({
    mutationFn: async ({ id, pdp_target }: { id: string; pdp_target: string }) => {
      const { data, error } = await supabase.functions.invoke("submit-pdp", {
        body: { facture_id: id, pdp_target },
      });
      if (error) throw error;
      return data as { ok: boolean; transmission_id: string; pdp_reference: string; simulated: boolean };
    },
    onSuccess: (res) => {
      if (res?.simulated) {
        toast.success("Transmission simulée (PDP réelle non encore branchée)");
      } else {
        toast.success("Facture transmise à la PDP");
      }
      qc.invalidateQueries({ queryKey: ["pdp-transmissions", factureId] });
      qc.invalidateQueries({ queryKey: ["factures"] });
    },
    onError: (e: any) => toast.error(`Échec transmission PDP : ${e.message ?? e}`),
  });

  return { ...list, generateFacturX, submitPdp };
}
