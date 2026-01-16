import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useQualiteClient() {
  const queryClient = useQueryClient();

  // Récupérer les réponses satisfaction
  const { data: reponses, isLoading: loadingReponses } = useQuery({
    queryKey: ['satisfaction-reponses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('satisfaction_reponses')
        .select(`
          *,
          contact:contacts(nom, prenom, email),
          session:sessions(nom)
        `)
        .order('date_reponse', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Récupérer les réclamations
  const { data: reclamations, isLoading: loadingReclamations } = useQuery({
    queryKey: ['reclamations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reclamations')
        .select(`
          *,
          contact:contacts(nom, prenom, email, telephone),
          session:sessions(nom)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Calculer les indicateurs
  const stats = {
    // Satisfaction
    noteGlobaleMoyenne: reponses && reponses.length > 0
      ? Math.round(reponses.reduce((acc, r) => acc + (r.note_globale || 0), 0) / reponses.length * 10) / 10
      : 0,
    
    nombreReponses: reponses?.length || 0,
    
    // NPS = (% promoteurs - % détracteurs)
    nps: reponses && reponses.length > 0
      ? (() => {
          const scores = reponses.filter(r => r.nps_score !== null).map(r => r.nps_score as number);
          if (scores.length === 0) return 0;
          const promoteurs = scores.filter(s => s >= 9).length;
          const detracteurs = scores.filter(s => s <= 6).length;
          return Math.round(((promoteurs - detracteurs) / scores.length) * 100);
        })()
      : 0,
    
    repartition: reponses ? {
      positives: reponses.filter(r => (r.note_globale || 0) >= 8).length,
      neutres: reponses.filter(r => (r.note_globale || 0) >= 6 && (r.note_globale || 0) < 8).length,
      negatives: reponses.filter(r => (r.note_globale || 0) < 6).length,
    } : { positives: 0, neutres: 0, negatives: 0 },

    // Réclamations
    reclamationsNouv: reclamations?.filter(r => r.statut === 'nouvelle').length || 0,
    reclamationsEnCours: reclamations?.filter(r => r.statut === 'en_cours').length || 0,
    reclamationsResolues: reclamations?.filter(r => r.statut === 'resolue' || r.statut === 'cloturee').length || 0,
    reclamationsTotal: reclamations?.length || 0,
    
    delaiMoyen: reclamations && reclamations.length > 0
      ? (() => {
          const resolues = reclamations.filter(r => r.delai_traitement_jours);
          if (resolues.length === 0) return 0;
          return Math.round(resolues.reduce((acc, r) => acc + (r.delai_traitement_jours || 0), 0) / resolues.length);
        })()
      : 0
  };

  // Créer une réponse satisfaction
  const creerReponse = useMutation({
    mutationFn: async (data: {
      contact_id?: string;
      session_id?: string;
      type_questionnaire?: string;
      note_globale?: number;
      note_formateur?: number;
      note_supports?: number;
      note_locaux?: number;
      nps_score?: number;
      objectifs_atteints?: string;
      commentaire?: string;
    }) => {
      const { error } = await supabase
        .from('satisfaction_reponses')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satisfaction-reponses'] });
      toast.success('Merci pour votre retour !');
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi');
    }
  });

  // Créer une réclamation
  const creerReclamation = useMutation({
    mutationFn: async (data: {
      contact_id: string;
      session_id?: string;
      titre: string;
      description: string;
      categorie?: string;
      priorite?: string;
    }) => {
      const { error } = await supabase
        .from('reclamations')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reclamations'] });
      toast.success('Réclamation enregistrée');
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  // Mettre à jour statut réclamation
  const updateReclamation = useMutation({
    mutationFn: async ({ id, statut, resolution }: { id: string; statut: string; resolution?: string }) => {
      const updates: Record<string, unknown> = { 
        statut, 
        updated_at: new Date().toISOString() 
      };
      
      if (statut === 'resolue' || statut === 'cloturee') {
        updates.date_resolution = new Date().toISOString();
        if (resolution) updates.resolution = resolution;
        
        // Calculer délai
        const { data: reclamation } = await supabase
          .from('reclamations')
          .select('created_at')
          .eq('id', id)
          .single();
        
        if (reclamation) {
          const delai = Math.ceil(
            (new Date().getTime() - new Date(reclamation.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          updates.delai_traitement_jours = delai;
        }
      }
      
      const { error } = await supabase
        .from('reclamations')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reclamations'] });
      toast.success('Réclamation mise à jour');
    }
  });

  return {
    // Données
    reponses,
    reclamations,
    stats,
    
    // Loading states
    isLoading: loadingReponses || loadingReclamations,
    
    // Mutations
    creerReponse: creerReponse.mutate,
    creerReclamation: creerReclamation.mutate,
    updateReclamation: updateReclamation.mutate,
    
    // Mutation states
    isCreatingReponse: creerReponse.isPending,
    isCreatingReclamation: creerReclamation.isPending,
    isUpdatingReclamation: updateReclamation.isPending
  };
}
