import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SignatureRequest {
  id: string;
  contact_id: string;
  session_inscription_id: string | null;
  type_document: string;
  titre: string;
  description: string | null;
  document_url: string | null;
  statut: string;
  date_envoi: string | null;
  date_signature: string | null;
  date_expiration: string | null;
  signature_data: string | null;
  signature_url: string | null;
  ip_signature: string | null;
  user_agent_signature: string | null;
  commentaires: string | null;
  signing_token: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    nom: string;
    prenom: string;
    email: string | null;
  };
}

export interface SignatureRequestInsert {
  contact_id: string;
  session_inscription_id?: string | null;
  type_document?: string;
  titre: string;
  description?: string | null;
  document_url?: string | null;
  document_storage_path?: string | null;
  document_storage_bucket?: string | null;
  date_expiration?: string | null;
  commentaires?: string | null;
}

export function useSignatureRequests() {
  return useQuery({
    queryKey: ["signature_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_requests")
        .select(`
          *,
          contact:contacts(id, nom, prenom, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SignatureRequest[];
    },
  });
}

export function useSignatureRequestsByContact(contactId: string | null) {
  return useQuery({
    queryKey: ["signature_requests", "contact", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_requests")
        .select("*")
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SignatureRequest[];
    },
  });
}

export function useSignatureRequest(id: string | null) {
  return useQuery({
    queryKey: ["signature_request", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_requests")
        .select(`
          *,
          contact:contacts(id, nom, prenom, email, telephone)
        `)
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as SignatureRequest;
    },
  });
}

export function useCreateSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SignatureRequestInsert) => {
      const { data, error } = await supabase
        .from("signature_requests")
        .insert({
          ...request,
          statut: "en_attente",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature_requests"] });
    },
  });
}

export function useSendSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("signature_requests")
        .update({
          statut: "envoye",
          date_envoi: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature_requests"] });
    },
  });
}

export function useSignDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      signatureData,
      ipAddress,
      userAgent,
    }: {
      id: string;
      signatureData: string;
      ipAddress?: string;
      userAgent?: string;
    }) => {
      // Upload signature image to storage
      const fileName = `${id}_${Date.now()}.png`;
      const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(fileName, binaryData, {
          contentType: "image/png",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("signatures")
        .getPublicUrl(fileName);

      // Update signature request
      const { data, error } = await supabase
        .from("signature_requests")
        .update({
          statut: "signe",
          date_signature: new Date().toISOString(),
          signature_url: urlData.publicUrl,
          ip_signature: ipAddress || null,
          user_agent_signature: userAgent || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature_requests"] });
    },
  });
}

export function useRefuseSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, commentaires }: { id: string; commentaires?: string }) => {
      const { data, error } = await supabase
        .from("signature_requests")
        .update({
          statut: "refuse",
          commentaires,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature_requests"] });
    },
  });
}

export function useDeleteSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("signature_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature_requests"] });
    },
  });
}

// ── Send Signature Email (consolidated from useSendSignatureEmail) ──

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature_requests"] });
      toast.success("Email de signature envoyé avec succès");
    },
    onError: (error: any) => {
      console.error("Error sending signature email:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    },
  });
}
