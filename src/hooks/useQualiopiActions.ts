import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QualiopiAction {
  id: string;
  indicateur_id: string | null;
  titre: string;
  description: string;
  priorite: 'haute' | 'moyenne' | 'basse';
  statut: 'a_faire' | 'en_cours' | 'terminee' | 'annulee';
  date_echeance: string | null;
  date_realisation: string | null;
  responsable: string | null;
  created_at: string;
  updated_at: string;
}

export function useQualiopiActions() {
  const queryClient = useQueryClient();

  const { data: actions, isLoading } = useQuery({
    queryKey: ['qualiopi-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qualiopi_actions')
        .select('*')
        .order('date_echeance', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data as QualiopiAction[];
    }
  });

  const createAction = useMutation({
    mutationFn: async (action: Omit<QualiopiAction, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('qualiopi_actions').insert(action);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-actions'] });
      toast.success('Action créée');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    }
  });

  const updateAction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QualiopiAction> & { id: string }) => {
      const { error } = await supabase
        .from('qualiopi_actions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-actions'] });
      toast.success('Action mise à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const deleteAction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('qualiopi_actions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-actions'] });
      toast.success('Action supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  return {
    actions,
    isLoading,
    createAction: createAction.mutate,
    updateAction: updateAction.mutate,
    deleteAction: deleteAction.mutate,
    isCreating: createAction.isPending
  };
}
