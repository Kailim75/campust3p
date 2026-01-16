import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QualiopiAudit {
  id: string;
  type_audit: 'initial' | 'surveillance' | 'renouvellement' | 'interne';
  organisme_certificateur: string | null;
  date_audit: string;
  date_prochaine_echeance: string | null;
  statut: 'planifie' | 'en_cours' | 'termine' | 'certifie';
  score_global: number | null;
  observations: string | null;
  non_conformites_majeures: number;
  non_conformites_mineures: number;
  created_at: string;
  updated_at: string;
}

export function useQualiopiAudits() {
  const queryClient = useQueryClient();

  const { data: audits, isLoading } = useQuery({
    queryKey: ['qualiopi-audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qualiopi_audits')
        .select('*')
        .order('date_audit', { ascending: false });
      
      if (error) throw error;
      return data as QualiopiAudit[];
    }
  });

  const createAudit = useMutation({
    mutationFn: async (audit: Omit<QualiopiAudit, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('qualiopi_audits').insert(audit);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-audits'] });
      toast.success('Audit créé');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    }
  });

  const updateAudit = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QualiopiAudit> & { id: string }) => {
      const { error } = await supabase
        .from('qualiopi_audits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-audits'] });
      toast.success('Audit mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const deleteAudit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('qualiopi_audits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-audits'] });
      toast.success('Audit supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  return {
    audits,
    isLoading,
    createAudit: createAudit.mutate,
    updateAudit: updateAudit.mutate,
    deleteAudit: deleteAudit.mutate,
    isCreating: createAudit.isPending
  };
}
