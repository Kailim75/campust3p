import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns';
import { toast } from 'sonner';

export type TypePeriode = 'mensuel' | 'trimestriel' | 'annuel';
export type TypeObjectif = 'ca' | 'encaissements' | 'nouveaux_contacts' | 'nouveaux_clients' | 'sessions' | 'inscriptions' | 'taux_reussite';

export interface Objectif {
  id: string;
  type_periode: TypePeriode;
  mois: number | null;
  trimestre: number | null;
  annee: number;
  type_objectif: TypeObjectif;
  valeur_cible: number;
  description: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObjectifWithProgress extends Objectif {
  valeur_actuelle: number;
  progression: number; // 0-100
  ecart: number; // difference from target
}

interface ObjectifInput {
  type_periode: TypePeriode;
  mois?: number | null;
  trimestre?: number | null;
  annee: number;
  type_objectif: TypeObjectif;
  valeur_cible: number;
  description?: string | null;
}

// Get date range for a period
function getDateRange(objectif: Objectif): { start: Date; end: Date } {
  const year = objectif.annee;
  
  if (objectif.type_periode === 'mensuel' && objectif.mois) {
    const date = new Date(year, objectif.mois - 1, 1);
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }
  
  if (objectif.type_periode === 'trimestriel' && objectif.trimestre) {
    const monthStart = (objectif.trimestre - 1) * 3;
    const date = new Date(year, monthStart, 1);
    return { start: startOfQuarter(date), end: endOfQuarter(date) };
  }
  
  // Annuel
  const date = new Date(year, 0, 1);
  return { start: startOfYear(date), end: endOfYear(date) };
}

// Format period label
export function formatPeriodLabel(objectif: Objectif): string {
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  if (objectif.type_periode === 'mensuel' && objectif.mois) {
    return `${monthNames[objectif.mois - 1]} ${objectif.annee}`;
  }
  
  if (objectif.type_periode === 'trimestriel' && objectif.trimestre) {
    return `T${objectif.trimestre} ${objectif.annee}`;
  }
  
  return `Année ${objectif.annee}`;
}

// Type labels
export const typeObjectifLabels: Record<TypeObjectif, string> = {
  ca: 'Chiffre d\'affaires',
  encaissements: 'Encaissements',
  nouveaux_contacts: 'Nouveaux contacts',
  nouveaux_clients: 'Nouveaux clients',
  sessions: 'Sessions',
  inscriptions: 'Inscriptions',
  taux_reussite: 'Taux de réussite'
};

export const typeObjectifUnits: Record<TypeObjectif, string> = {
  ca: '€',
  encaissements: '€',
  nouveaux_contacts: '',
  nouveaux_clients: '',
  sessions: '',
  inscriptions: '',
  taux_reussite: '%'
};

// Fetch all objectifs
export function useObjectifs() {
  return useQuery({
    queryKey: ['objectifs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objectifs')
        .select('*')
        .eq('actif', true)
        .order('annee', { ascending: false })
        .order('type_periode')
        .order('mois', { ascending: true, nullsFirst: false })
        .order('trimestre', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as Objectif[];
    }
  });
}

// Fetch current period objectifs with progress
export function useCurrentObjectifsWithProgress() {
  return useQuery({
    queryKey: ['objectifs-with-progress'],
    queryFn: async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentQuarter = Math.ceil(currentMonth / 3);
      const currentYear = now.getFullYear();

      // Fetch active objectifs for current periods
      const { data: objectifsData, error } = await supabase
        .from('objectifs')
        .select('*')
        .eq('actif', true)
        .or(`and(type_periode.eq.mensuel,mois.eq.${currentMonth},annee.eq.${currentYear}),and(type_periode.eq.trimestriel,trimestre.eq.${currentQuarter},annee.eq.${currentYear}),and(type_periode.eq.annuel,annee.eq.${currentYear})`);

      if (error) throw error;

      // Calculate progress for each objectif
      const objectifsWithProgress: ObjectifWithProgress[] = [];

      for (const objData of objectifsData || []) {
        const obj = objData as unknown as Objectif;
        const { start, end } = getDateRange(obj);
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');

        let valeur_actuelle = 0;

        switch (obj.type_objectif) {
          case 'ca': {
            const { data } = await supabase
              .from('factures')
              .select('montant_total')
              .gte('date_emission', startStr)
              .lte('date_emission', endStr)
              .neq('statut', 'annulee');
            valeur_actuelle = data?.reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0;
            break;
          }
          case 'encaissements': {
            const { data } = await supabase
              .from('paiements')
              .select('montant')
              .gte('date_paiement', startStr)
              .lte('date_paiement', endStr);
            valeur_actuelle = data?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;
            break;
          }
          case 'nouveaux_contacts': {
            const { count } = await supabase
              .from('contacts')
              .select('id', { count: 'exact', head: true })
              .gte('created_at', startStr)
              .lte('created_at', endStr);
            valeur_actuelle = count || 0;
            break;
          }
          case 'nouveaux_clients': {
            const { count } = await supabase
              .from('contacts')
              .select('id', { count: 'exact', head: true })
              .eq('statut', 'Client')
              .gte('created_at', startStr)
              .lte('created_at', endStr);
            valeur_actuelle = count || 0;
            break;
          }
          case 'sessions': {
            const { count } = await supabase
              .from('sessions')
              .select('id', { count: 'exact', head: true })
              .gte('date_debut', startStr)
              .lte('date_debut', endStr);
            valeur_actuelle = count || 0;
            break;
          }
          case 'inscriptions': {
            const { count } = await supabase
              .from('session_inscriptions')
              .select('id', { count: 'exact', head: true })
              .gte('date_inscription', startStr)
              .lte('date_inscription', endStr);
            valeur_actuelle = count || 0;
            break;
          }
          case 'taux_reussite': {
            const { data } = await supabase
              .from('examens_t3p')
              .select('resultat')
              .gte('date_examen', startStr)
              .lte('date_examen', endStr)
              .not('resultat', 'is', null);
            const total = data?.length || 0;
            const reussis = data?.filter(e => e.resultat === 'reussi').length || 0;
            valeur_actuelle = total > 0 ? Math.round((reussis / total) * 100) : 0;
            break;
          }
        }

        const progression = obj.valeur_cible > 0 
          ? Math.min(100, Math.round((valeur_actuelle / obj.valeur_cible) * 100))
          : 0;
        
        const ecart = valeur_actuelle - obj.valeur_cible;

        objectifsWithProgress.push({
          ...obj,
          valeur_actuelle,
          progression,
          ecart
        });
      }

      return objectifsWithProgress;
    }
  });
}

// Create objectif
export function useCreateObjectif() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ObjectifInput) => {
      const { data, error } = await supabase
        .from('objectifs')
        .insert({
          ...input,
          mois: input.type_periode === 'mensuel' ? input.mois : null,
          trimestre: input.type_periode === 'trimestriel' ? input.trimestre : null,
          actif: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectifs'] });
      queryClient.invalidateQueries({ queryKey: ['objectifs-with-progress'] });
      toast.success('Objectif créé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de l\'objectif');
      console.error(error);
    }
  });
}

// Update objectif
export function useUpdateObjectif() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ObjectifInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('objectifs')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectifs'] });
      queryClient.invalidateQueries({ queryKey: ['objectifs-with-progress'] });
      toast.success('Objectif mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    }
  });
}

// Delete objectif
export function useDeleteObjectif() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('objectifs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectifs'] });
      queryClient.invalidateQueries({ queryKey: ['objectifs-with-progress'] });
      toast.success('Objectif supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  });
}
