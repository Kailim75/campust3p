import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Session } from './useSessions';
import { parseISO, isAfter, isBefore, isToday, startOfDay, endOfDay } from 'date-fns';

type SessionStatus = 'a_venir' | 'en_cours' | 'terminee' | 'annulee' | 'complet';

export function useAutoUpdateSessionStatus() {
  const queryClient = useQueryClient();

  const computeExpectedStatus = (session: Session): SessionStatus | null => {
    // Don't auto-update cancelled sessions
    if (session.statut === 'annulee') return null;
    
    const today = new Date();
    const startDate = parseISO(session.date_debut);
    const endDate = parseISO(session.date_fin);

    // Session hasn't started yet
    if (isAfter(startDate, endOfDay(today))) {
      return session.statut === 'complet' ? 'complet' : 'a_venir';
    }

    // Session has ended
    if (isBefore(endDate, startOfDay(today))) {
      return 'terminee';
    }

    // Session is currently running
    return 'en_cours';
  };

  const updateSessionStatuses = useMutation({
    mutationFn: async (sessions: Session[]) => {
      const updates: { id: string; newStatus: SessionStatus }[] = [];

      for (const session of sessions) {
        const expectedStatus = computeExpectedStatus(session);
        if (expectedStatus && expectedStatus !== session.statut) {
          updates.push({ id: session.id, newStatus: expectedStatus });
        }
      }

      if (updates.length === 0) return { updated: 0 };

      // Update all sessions that need status change
      for (const update of updates) {
        const { error } = await supabase
          .from('sessions')
          .update({ statut: update.newStatus })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      return { updated: updates.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return {
    computeExpectedStatus,
    updateSessionStatuses,
  };
}
