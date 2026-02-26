import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExamResult {
  theorie: 'admis' | 'ajourne' | null;
  pratique: 'admis' | 'ajourne' | null;
}

export function useInscritsExamResults(contactIds: string[]) {
  const queryClient = useQueryClient();
  const queryKey = ['inscrits-exam-results', contactIds];

  const query = useQuery({
    queryKey,
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
      for (const id of contactIds) {
        results[id] = { theorie: null, pratique: null };
      }
      for (const row of theorie || []) {
        if (!results[row.contact_id].theorie) {
          results[row.contact_id].theorie = row.resultat as 'admis' | 'ajourne';
        }
      }
      for (const row of pratique || []) {
        if (!results[row.contact_id].pratique) {
          results[row.contact_id].pratique = row.resultat as 'admis' | 'ajourne';
        }
      }
      return results;
    },
    enabled: contactIds.length > 0,
  });

  const setResult = useMutation({
    mutationFn: async ({
      contactId,
      type,
      value,
    }: {
      contactId: string;
      type: 'theorie' | 'pratique';
      value: 'admis' | 'ajourne' | null;
    }) => {
      const table = type === 'theorie' ? 'examens_t3p' : 'examens_pratique';

      if (value === null) {
        // Delete the latest exam entry for this contact
        const { data: existing } = await supabase
          .from(table)
          .select('id')
          .eq('contact_id', contactId)
          .order('date_examen', { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          const { error } = await supabase.from(table).delete().eq('id', existing[0].id);
          if (error) throw error;
        }
      } else {
        // Check if there's already an entry - update it, otherwise insert
        const { data: existing } = await supabase
          .from(table)
          .select('id')
          .eq('contact_id', contactId)
          .order('date_examen', { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          const { error } = await supabase
            .from(table)
            .update({ resultat: value })
            .eq('id', existing[0].id);
          if (error) throw error;
        } else {
          const insertData: any = {
            contact_id: contactId,
            resultat: value,
            date_examen: new Date().toISOString().split('T')[0],
          };
          const { error } = await supabase.from(table).insert(insertData);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du résultat");
    },
  });

  return {
    ...query,
    setResult: setResult.mutate,
    isUpdating: setResult.isPending,
  };
}
