import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DocumentType = 'security_charter' | 'privacy_policy';

interface LegalDocument {
  id: string;
  titre: string;
  contenu: string;
  version: number;
  document_type: string;
}

export function useLegalDocuments() {
  const queryClient = useQueryClient();

  // Get all pending documents (not yet accepted by user)
  const { data: pendingDocuments, isLoading } = useQuery({
    queryKey: ["pending-legal-documents"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pending_documents");
      if (error) throw error;
      return (data as LegalDocument[]) || [];
    },
  });

  // Accept document mutation
  const acceptDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.rpc("accept_charter", {
        p_charter_id: documentId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-legal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["charter-acceptance"] });
    },
  });

  const currentDocument = pendingDocuments?.[0] || null;
  const hasPendingDocuments = (pendingDocuments?.length || 0) > 0;

  return {
    pendingDocuments,
    currentDocument,
    hasPendingDocuments,
    isLoading,
    acceptDocument: acceptDocumentMutation.mutateAsync,
    isAccepting: acceptDocumentMutation.isPending,
  };
}

// Hook for Super Admin document management
export function useLegalDocumentsManagement() {
  const queryClient = useQueryClient();

  // Get all documents (for super admin)
  const { data: allDocuments, isLoading } = useQuery({
    queryKey: ["all-legal-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_charters")
        .select("*")
        .order("document_type", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get acceptance history
  const { data: acceptances } = useQuery({
    queryKey: ["document-acceptances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charter_acceptances")
        .select(`
          *,
          security_charters (titre, version, document_type)
        `)
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create new document
  const createDocumentMutation = useMutation({
    mutationFn: async (doc: { 
      titre: string; 
      contenu: string; 
      roles_requis: string[];
      document_type: DocumentType;
    }) => {
      // Get next version number for this document type
      const { data: existing } = await supabase
        .from("security_charters")
        .select("version")
        .eq("document_type", doc.document_type)
        .order("version", { ascending: false })
        .limit(1);
      
      const nextVersion = (existing?.[0]?.version || 0) + 1;

      const { data, error } = await supabase
        .from("security_charters")
        .insert({
          ...doc,
          version: nextVersion,
          status: "draft" as const,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-legal-documents"] });
    },
  });

  // Update document
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string; 
      titre?: string; 
      contenu?: string; 
      roles_requis?: string[] 
    }) => {
      const { data, error } = await supabase
        .from("security_charters")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-legal-documents"] });
    },
  });

  // Activate document (archives others of same type)
  const activateDocumentMutation = useMutation({
    mutationFn: async ({ documentId, documentType }: { documentId: string; documentType: string }) => {
      // Archive all active documents of the same type
      await supabase
        .from("security_charters")
        .update({ status: "archived" as const, archived_at: new Date().toISOString() })
        .eq("status", "active")
        .eq("document_type", documentType);

      // Activate the selected one
      const { data, error } = await supabase
        .from("security_charters")
        .update({ status: "active" as const, activated_at: new Date().toISOString() })
        .eq("id", documentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-legal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["pending-legal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["charter-acceptance"] });
    },
  });

  // Filter documents by type
  const securityCharters = allDocuments?.filter(d => d.document_type === 'security_charter') || [];
  const privacyPolicies = allDocuments?.filter(d => d.document_type === 'privacy_policy') || [];

  return {
    allDocuments,
    securityCharters,
    privacyPolicies,
    acceptances,
    isLoading,
    createDocument: createDocumentMutation.mutateAsync,
    updateDocument: updateDocumentMutation.mutateAsync,
    activateDocument: activateDocumentMutation.mutateAsync,
    isCreating: createDocumentMutation.isPending,
    isUpdating: updateDocumentMutation.isPending,
    isActivating: activateDocumentMutation.isPending,
  };
}
