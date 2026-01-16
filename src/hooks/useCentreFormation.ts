import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CentreFormation {
  id: string;
  nom_legal: string;
  nom_commercial: string;
  forme_juridique: string;
  adresse_complete: string;
  telephone: string;
  email: string;
  siret: string;
  nda: string;
  region_declaration: string;
  responsable_legal_nom: string;
  responsable_legal_fonction: string;
  logo_url: string | null;
  signature_cachet_url: string | null;
  iban: string;
  bic: string;
  created_at: string;
  updated_at: string;
}

export type CentreFormationInput = Omit<CentreFormation, 'id' | 'created_at' | 'updated_at'>;

export function useCentreFormation() {
  const queryClient = useQueryClient();

  const { data: centreFormation, isLoading, error } = useQuery({
    queryKey: ['centre-formation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('centre_formation')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      return data as CentreFormation | null;
    },
    staleTime: 1000 * 60 * 60, // cache 1h
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CentreFormationInput) => {
      // Si aucune config existe, INSERT, sinon UPDATE
      if (!centreFormation) {
        const { data, error } = await supabase
          .from('centre_formation')
          .insert(values)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('centre_formation')
          .update(values)
          .eq('id', centreFormation.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centre-formation'] });
      toast.success('Configuration enregistrée avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.message}`);
    }
  });

  return { 
    centreFormation, 
    isLoading, 
    error,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending
  };
}
