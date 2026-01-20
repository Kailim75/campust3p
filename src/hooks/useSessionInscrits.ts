import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AjouterMultiplesParams {
  contactIds: string[];
  sessionPrix?: number;
  sessionNom?: string;
  autoCreateFacture?: boolean;
}

export function useSessionInscrits(sessionId: string) {
  const queryClient = useQueryClient();

  // Récupérer les inscrits avec infos complètes
  const { data: inscrits, isLoading } = useQuery({
    queryKey: ['session-inscrits-detail', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_inscriptions')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId
  });

  // Stats calculées
  const stats = {
    total: inscrits?.length || 0,
    inscrits: inscrits?.filter(i => i.statut === 'inscrit').length || 0,
    confirmes: inscrits?.filter(i => i.statut === 'confirme').length || 0,
    presents: inscrits?.filter(i => i.statut === 'present').length || 0,
  };

  // Ajouter plusieurs stagiaires avec génération auto de factures
  const ajouterMultiples = useMutation({
    mutationFn: async ({ contactIds, sessionPrix = 0, sessionNom = '', autoCreateFacture = true }: AjouterMultiplesParams) => {
      // Vérifier doublons
      const existants = inscrits?.map(i => i.contact_id) || [];
      const nouveaux = contactIds.filter(id => !existants.includes(id));

      if (nouveaux.length === 0) {
        throw new Error('Ces stagiaires sont déjà inscrits');
      }

      const inscriptions = nouveaux.map(contact_id => ({
        session_id: sessionId,
        contact_id,
        statut: 'inscrit'
      }));

      const { data: insertedInscriptions, error } = await supabase
        .from('session_inscriptions')
        .insert(inscriptions)
        .select();
      
      if (error) throw error;

      let facturesCreated = 0;

      // Auto-créer les factures si demandé
      if (autoCreateFacture && insertedInscriptions && insertedInscriptions.length > 0) {
        const facturesToCreate = [];
        
        for (const inscription of insertedInscriptions) {
          // Générer un numéro de facture unique
          const { data: numeroFacture, error: numeroError } = await supabase.rpc("generate_numero_facture");
          
          if (numeroError) {
            console.error("Erreur génération numéro facture:", numeroError);
            continue;
          }

          facturesToCreate.push({
            contact_id: inscription.contact_id,
            session_inscription_id: inscription.id,
            numero_facture: numeroFacture,
            montant_total: sessionPrix,
            type_financement: "personnel" as const,
            statut: "brouillon" as const,
            date_emission: new Date().toISOString().split("T")[0],
            commentaires: `Facture auto-générée pour la session: ${sessionNom}`,
          });
        }

        if (facturesToCreate.length > 0) {
          const { error: factureError } = await supabase
            .from("factures")
            .insert(facturesToCreate);

          if (factureError) {
            console.error("Erreur création factures:", factureError);
          } else {
            facturesCreated = facturesToCreate.length;
          }
        }
      }

      return { inscriptionsCount: nouveaux.length, facturesCreated };
    },
    onSuccess: ({ inscriptionsCount, facturesCreated }) => {
      queryClient.invalidateQueries({ queryKey: ['session-inscrits-detail', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      
      if (facturesCreated > 0) {
        toast.success(`${inscriptionsCount} stagiaire(s) ajouté(s) avec ${facturesCreated} facture(s) générée(s)`);
      } else {
        toast.success(`${inscriptionsCount} stagiaire(s) ajouté(s)`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'ajout');
    }
  });

  // Émarger plusieurs stagiaires
  const emargerMultiples = useMutation({
    mutationFn: async (contactIds: string[]) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Insert emargements pour chaque contact
      for (const contact_id of contactIds) {
        const { error } = await supabase
          .from('emargements')
          .upsert({
            session_id: sessionId,
            contact_id,
            date_emargement: today,
            periode: 'journee',
            present: true
          }, { 
            onConflict: 'session_id,contact_id,date_emargement,periode'
          });
        
        if (error) throw error;
      }
    },
    onSuccess: (_, contactIds) => {
      queryClient.invalidateQueries({ queryKey: ['session-inscrits-detail', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['emargements'] });
      toast.success(`${contactIds.length} stagiaire(s) émargé(s)`);
    },
    onError: () => {
      toast.error('Erreur lors de l\'émargement');
    }
  });

  // Tracer envoi groupé
  const tracerEnvoiGroupe = useMutation({
    mutationFn: async ({ contactIds, typeDocument }: { contactIds: string[]; typeDocument: string }) => {
      const { error } = await supabase
        .from('envois_groupes')
        .insert({
          session_id: sessionId,
          type_document: typeDocument,
          nombre_destinataires: contactIds.length,
          destinataires_ids: contactIds
        });
      
      if (error) throw error;
    },
    onSuccess: (_, { contactIds, typeDocument }) => {
      queryClient.invalidateQueries({ queryKey: ['session-inscrits-detail', sessionId] });
      toast.success(`${typeDocument} tracé pour ${contactIds.length} stagiaire(s)`);
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi');
    }
  });

  return {
    inscrits,
    isLoading,
    stats,
    ajouterMultiples: ajouterMultiples.mutate,
    emargerMultiples: emargerMultiples.mutate,
    tracerEnvoiGroupe: tracerEnvoiGroupe.mutate,
    isAjoutant: ajouterMultiples.isPending,
    isEmargement: emargerMultiples.isPending,
    isEnvoi: tracerEnvoiGroupe.isPending
  };
}
