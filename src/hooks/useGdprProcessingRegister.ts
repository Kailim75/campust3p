import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GdprProcessing {
  id: string;
  code: string;
  nom_traitement: string;
  description: string | null;
  finalites: string;
  base_legale: string;
  categories_personnes: string[];
  categories_donnees: string[];
  destinataires: string[] | null;
  transferts_hors_ue: any[];
  delais_conservation: string | null;
  mesures_securite: string[] | null;
  responsable_traitement: string | null;
  sous_traitants: any[];
  source_donnees: string | null;
  decisions_automatisees: boolean;
  analyse_impact_requise: boolean;
  date_mise_en_oeuvre: string | null;
  statut: 'actif' | 'archive' | 'en_revision';
  created_at: string;
  updated_at: string;
}

export interface GdprProcessingHistory {
  id: string;
  processing_id: string;
  action: string;
  changed_fields: string[] | null;
  old_values: any;
  new_values: any;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export function useGdprProcessingRegister() {
  const queryClient = useQueryClient();

  // Get all processing activities
  const { data: processings, isLoading } = useQuery({
    queryKey: ["gdpr-processing-register"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gdpr_processing_register")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return data as GdprProcessing[];
    },
  });

  // Get history for a specific processing
  const getProcessingHistory = async (processingId: string) => {
    const { data, error } = await supabase
      .from("gdpr_processing_history")
      .select("*")
      .eq("processing_id", processingId)
      .order("changed_at", { ascending: false });
    if (error) throw error;
    return data as GdprProcessingHistory[];
  };

  // Create new processing
  const createProcessingMutation = useMutation({
    mutationFn: async (processing: Omit<GdprProcessing, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from("gdpr_processing_register")
        .insert(processing)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdpr-processing-register"] });
    },
  });

  // Update processing
  const updateProcessingMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GdprProcessing> & { id: string }) => {
      const { data, error } = await supabase
        .from("gdpr_processing_register")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdpr-processing-register"] });
    },
  });

  // Archive processing
  const archiveProcessingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("gdpr_processing_register")
        .update({ statut: 'archive' as const })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdpr-processing-register"] });
    },
  });

  // Stats
  const activeCount = processings?.filter(p => p.statut === 'actif').length || 0;
  const archivedCount = processings?.filter(p => p.statut === 'archive').length || 0;

  return {
    processings,
    activeProcessings: processings?.filter(p => p.statut === 'actif') || [],
    archivedProcessings: processings?.filter(p => p.statut === 'archive') || [],
    isLoading,
    activeCount,
    archivedCount,
    getProcessingHistory,
    createProcessing: createProcessingMutation.mutateAsync,
    updateProcessing: updateProcessingMutation.mutateAsync,
    archiveProcessing: archiveProcessingMutation.mutateAsync,
    isCreating: createProcessingMutation.isPending,
    isUpdating: updateProcessingMutation.isPending,
    isArchiving: archiveProcessingMutation.isPending,
  };
}
