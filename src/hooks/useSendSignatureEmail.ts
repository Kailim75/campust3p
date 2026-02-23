import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendSignatureEmailParams {
  signatureRequestId?: string;
  type: "signature_request";
}

export function useSendSignatureEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendSignatureEmailParams) => {
      const baseUrl = window.location.origin;
      
      const { data, error } = await supabase.functions.invoke("send-signature-email", {
        body: {
          ...params,
          baseUrl,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["signature_requests"] });
      toast.success("Email de signature envoyé avec succès");
    },
    onError: (error: any) => {
      console.error("Error sending signature email:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    },
  });
}
