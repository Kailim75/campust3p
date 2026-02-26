import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExamResult {
  theorie: 'admis' | 'ajourne' | null;
  pratique: 'admis' | 'ajourne' | null;
}

export function useInscritsExamResults(contactIds: string[]) {
  return useQuery({
    queryKey: ['inscrits-exam-results', contactIds],
    queryFn: async () => {
      if (contactIds.length === 0) return {} as Record<string, ExamResult>;

      const [{ data: theorie }, { data: pratique }] = await Promise.all([
        supabase
          .from('examens_t3p')
          .select('contact_id, resultat')
          .in('contact_id', contactIds)
          .order('date_examen', { ascending: false }),
        supabase
          .from('examens_pratique')
          .select('contact_id, resultat')
          .in('contact_id', contactIds)
          .order('date_examen', { ascending: false }),
      ]);

      const results: Record<string, ExamResult> = {};

      // Init all contacts
      for (const id of contactIds) {
        results[id] = { theorie: null, pratique: null };
      }

      // Take latest theorie result per contact
      for (const row of theorie || []) {
        if (!results[row.contact_id].theorie) {
          results[row.contact_id].theorie = row.resultat as 'admis' | 'ajourne';
        }
      }

      // Take latest pratique result per contact
      for (const row of pratique || []) {
        if (!results[row.contact_id].pratique) {
          results[row.contact_id].pratique = row.resultat as 'admis' | 'ajourne';
        }
      }

      return results;
    },
    enabled: contactIds.length > 0,
  });
}
