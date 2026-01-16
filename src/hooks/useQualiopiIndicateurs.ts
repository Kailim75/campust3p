import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QualiopiIndicateur {
  id: string;
  numero: string;
  critere: number;
  titre: string;
  description: string;
  statut: 'conforme' | 'partiellement_conforme' | 'non_conforme';
  preuves_attendues: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useQualiopiIndicateurs() {
  const queryClient = useQueryClient();

  const { data: indicateurs, isLoading, error } = useQuery({
    queryKey: ['qualiopi-indicateurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qualiopi_indicateurs')
        .select('*')
        .order('numero');
      
      if (error) throw error;
      return data as QualiopiIndicateur[];
    }
  });

  const updateStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase
        .from('qualiopi_indicateurs')
        .update({ statut, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-indicateurs'] });
      toast.success('Statut mis à jour');
    },
    onError: () => {
      toast.error('Erreur de mise à jour');
    }
  });

  return {
    indicateurs,
    isLoading,
    error,
    updateStatut: updateStatut.mutate,
    isUpdating: updateStatut.isPending
  };
}
