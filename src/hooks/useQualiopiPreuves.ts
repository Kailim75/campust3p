import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QualiopiPreuve {
  id: string;
  indicateur_id: string;
  type_preuve: string;
  titre: string;
  description: string | null;
  fichier_url: string | null;
  date_creation: string;
  date_validite: string | null;
  valide: boolean;
  created_at: string;
}

export function useQualiopiPreuves(indicateurId?: string) {
  const queryClient = useQueryClient();

  const { data: preuves, isLoading } = useQuery({
    queryKey: ['qualiopi-preuves', indicateurId],
    queryFn: async () => {
      let query = supabase.from('qualiopi_preuves').select('*');
      
      if (indicateurId) {
        query = query.eq('indicateur_id', indicateurId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as QualiopiPreuve[];
    }
  });

  const createPreuve = useMutation({
    mutationFn: async (preuve: Omit<QualiopiPreuve, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('qualiopi_preuves').insert(preuve);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-preuves'] });
      toast.success('Preuve ajoutée');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout');
    }
  });

  const deletePreuve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('qualiopi_preuves').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-preuves'] });
      toast.success('Preuve supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  return {
    preuves,
    isLoading,
    createPreuve: createPreuve.mutate,
    deletePreuve: deletePreuve.mutate,
    isCreating: createPreuve.isPending
  };
}
