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
        .is('deleted_at', null)
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

      // Track is now auto-set by DB trigger (snapshot_inscription_track)
      const inscriptions = nouveaux.map(contact_id => ({
        session_id: sessionId,
        contact_id,
        statut: 'inscrit',
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
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      
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

  // Tracer envoi groupé ET envoyer les emails avec PDF en pièce jointe
  const tracerEnvoiGroupe = useMutation({
    mutationFn: async ({ contactIds, typeDocument }: { contactIds: string[]; typeDocument: string }) => {
      // 1. Récupérer les infos complètes de la session (pour génération PDF côté serveur)
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('nom, formation_type, date_debut, date_fin, lieu, heure_debut, heure_fin, heure_debut_matin, heure_fin_matin, heure_debut_aprem, heure_fin_aprem, duree_heures, formateur_id')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      // Récupérer le nom du formateur si ID fourni
      let formateurNom: string | undefined;
      if (session.formateur_id) {
        const { data: formateur } = await supabase
          .from('formateurs')
          .select('nom, prenom')
          .eq('id', session.formateur_id)
          .single();
        if (formateur) {
          formateurNom = `${formateur.prenom} ${formateur.nom}`;
        }
      }
      
      // 2. Récupérer les contacts avec email
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, email, prenom, nom')
        .in('id', contactIds)
        .not('email', 'is', null);
      
      if (contactsError) throw contactsError;
      
      const contactsWithEmail = contacts?.filter(c => c.email) || [];
      
      if (contactsWithEmail.length === 0) {
        throw new Error('Aucun stagiaire sélectionné n\'a d\'adresse email');
      }
      
      // 3. Tracer l'envoi dans la base
      const { error: traceError } = await supabase
        .from('envois_groupes')
        .insert({
          session_id: sessionId,
          type_document: typeDocument,
          nombre_destinataires: contactsWithEmail.length,
          destinataires_ids: contactsWithEmail.map(c => c.id)
        });
      
      if (traceError) throw traceError;
      
      // 4. Envoyer les emails via l'edge function (avec génération PDF côté serveur)
      const { error: emailError } = await supabase.functions.invoke('send-automated-emails', {
        body: {
          type: 'document_envoi',
          recipients: contactsWithEmail.map(c => ({
            email: c.email,
            name: `${c.prenom} ${c.nom}`,
            contactId: c.id,
          })),
          documentType: typeDocument,
          sessionName: session.nom,
          generateAttachments: true, // Active la génération PDF côté serveur
          sessionInfo: {
            formation_type: session.formation_type,
            date_debut: session.date_debut,
            date_fin: session.date_fin,
            lieu: session.lieu,
            heure_debut: session.heure_debut,
            heure_fin: session.heure_fin,
            heure_debut_matin: session.heure_debut_matin,
            heure_fin_matin: session.heure_fin_matin,
            heure_debut_aprem: session.heure_debut_aprem,
            heure_fin_aprem: session.heure_fin_aprem,
            duree_heures: session.duree_heures,
            formateur: formateurNom,
          },
        },
      });
      
      if (emailError) {
        console.error('Erreur envoi emails:', emailError);
        // On ne throw pas pour ne pas bloquer le traçage
      }
      
      return { 
        emailsSent: contactsWithEmail.length,
        emailError: emailError?.message 
      };
    },
    onSuccess: (result, { typeDocument }) => {
      queryClient.invalidateQueries({ queryKey: ['session-inscrits-detail', sessionId] });
      if (result.emailError) {
        toast.warning(`${typeDocument} tracé pour ${result.emailsSent} stagiaire(s), mais erreur d'envoi email: ${result.emailError}`);
      } else {
        toast.success(`${typeDocument} envoyé à ${result.emailsSent} stagiaire(s)`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'envoi');
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
