import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EnqueteType = 'satisfaction' | 'reclamation';

interface CreateTokenParams {
  contact_id: string;
  session_id?: string;
  type: EnqueteType;
}

interface CreateTokenResult {
  token: string;
  url: string;
}

export function useEnqueteTokens() {
  const queryClient = useQueryClient();

  // Créer un token pour un candidat
  const createToken = useMutation({
    mutationFn: async (params: CreateTokenParams): Promise<CreateTokenResult> => {
      const { data, error } = await supabase
        .from('enquete_tokens')
        .insert({
          contact_id: params.contact_id,
          session_id: params.session_id,
          type: params.type,
        })
        .select('token')
        .single();

      if (error) throw error;

      const baseUrl = window.location.origin;
      return {
        token: data.token,
        url: `${baseUrl}/enquete/${data.token}`,
      };
    },
    onError: (error: Error) => {
      console.error('Error creating enquete token:', error);
    },
  });

  // Créer des tokens pour plusieurs candidats
  const createBulkTokens = useMutation({
    mutationFn: async (
      params: { contacts: { id: string; session_id?: string }[]; type: EnqueteType }
    ): Promise<CreateTokenResult[]> => {
      const inserts = params.contacts.map(c => ({
        contact_id: c.id,
        session_id: c.session_id,
        type: params.type,
      }));

      const { data, error } = await supabase
        .from('enquete_tokens')
        .insert(inserts)
        .select('token, contact_id');

      if (error) throw error;

      const baseUrl = window.location.origin;
      return (data || []).map(d => ({
        token: d.token,
        url: `${baseUrl}/enquete/${d.token}`,
      }));
    },
  });

  // Valider un token (pour la page publique) - uses secure RPC function
  const validateToken = async (token: string) => {
    const { data, error } = await supabase
      .rpc('validate_enquete_token', { p_token: token });

    if (error) throw error;
    
    // La fonction renvoie un tableau, on prend le premier élément
    const tokenData = Array.isArray(data) ? data[0] : data;
    
    if (!tokenData) {
      throw new Error('Token invalide');
    }
    
    // Vérifier expiration
    if (new Date(tokenData.expire_at) < new Date()) {
      throw new Error('Ce lien a expiré');
    }

    // Vérifier si déjà utilisé
    if (tokenData.used_at) {
      throw new Error('Ce formulaire a déjà été rempli');
    }

    // Transformer pour correspondre à l'ancien format attendu
    return {
      ...tokenData,
      contact: {
        id: tokenData.contact_id,
        nom: tokenData.contact_nom,
        prenom: tokenData.contact_prenom,
        email: tokenData.contact_email,
      },
      session: tokenData.session_id ? {
        id: tokenData.session_id,
        nom: tokenData.session_nom,
        formation_type: tokenData.session_formation_type,
      } : null,
    };
  };

  // Marquer un token comme utilisé
  const markTokenAsUsed = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await supabase
        .from('enquete_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      if (error) throw error;
    },
  });

  // Envoyer par email
  const sendEnqueteEmail = useMutation({
    mutationFn: async (params: {
      contact_id: string;
      contact_email: string;
      contact_name: string;
      session_id?: string;
      session_name?: string;
      type: EnqueteType;
    }) => {
      // D'abord créer le token
      const tokenResult = await createToken.mutateAsync({
        contact_id: params.contact_id,
        session_id: params.session_id,
        type: params.type,
      });

      // Ensuite envoyer l'email via edge function
      try {
        const { data, error } = await supabase.functions.invoke('send-enquete-email', {
          body: {
            to: params.contact_email,
            name: params.contact_name,
            enqueteUrl: tokenResult.url,
            type: params.type,
            sessionName: params.session_name,
          },
        });

        if (error) {
          await supabase.from('email_logs').insert({
            type: params.type === 'satisfaction' ? 'enquete_satisfaction' : 'enquete_reclamation',
            recipient_email: params.contact_email,
            recipient_name: params.contact_name,
            contact_id: params.contact_id,
            session_id: params.session_id,
            subject:
              params.type === 'satisfaction'
                ? 'Donnez-nous votre avis sur votre formation'
                : 'Formulaire de réclamation',
            status: 'failed',
            error_message: error.message,
          });
          throw error;
        }

        // Si jamais la fonction renvoie un payload d'erreur malgré un 2xx
        if ((data as any)?.error) {
          const message = (data as any)?.error?.message ?? 'Erreur Resend';
          await supabase.from('email_logs').insert({
            type: params.type === 'satisfaction' ? 'enquete_satisfaction' : 'enquete_reclamation',
            recipient_email: params.contact_email,
            recipient_name: params.contact_name,
            contact_id: params.contact_id,
            session_id: params.session_id,
            subject:
              params.type === 'satisfaction'
                ? 'Donnez-nous votre avis sur votre formation'
                : 'Formulaire de réclamation',
            status: 'failed',
            error_message: message,
          });
          throw new Error(message);
        }

        const resendId = (data as any)?.data?.id ?? null;

        // Logger l'envoi
        await supabase.from('email_logs').insert({
          type: params.type === 'satisfaction' ? 'enquete_satisfaction' : 'enquete_reclamation',
          recipient_email: params.contact_email,
          recipient_name: params.contact_name,
          contact_id: params.contact_id,
          session_id: params.session_id,
          subject:
            params.type === 'satisfaction'
              ? 'Donnez-nous votre avis sur votre formation'
              : 'Formulaire de réclamation',
          status: 'sent',
          resend_id: resendId,
        });

        return tokenResult;
      } catch (e) {
        // Remonter l'erreur pour afficher le toast
        throw e as Error;
      }
    },
    onSuccess: () => {
      toast.success('Email envoyé avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur d'envoi: ${error.message}`);
    },
  });

  // Copier le lien
  const copyEnqueteLink = async (params: CreateTokenParams): Promise<string> => {
    const result = await createToken.mutateAsync(params);
    await navigator.clipboard.writeText(result.url);
    toast.success('Lien copié dans le presse-papier');
    return result.url;
  };

  return {
    createToken,
    createBulkTokens,
    validateToken,
    markTokenAsUsed,
    sendEnqueteEmail,
    copyEnqueteLink,
    isCreatingToken: createToken.isPending,
    isSendingEmail: sendEnqueteEmail.isPending,
  };
}
