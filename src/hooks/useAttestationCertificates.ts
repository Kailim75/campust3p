import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AttestationCertificate {
  id: string;
  numero_certificat: string;
  contact_id: string;
  session_id: string | null;
  type_attestation: string;
  date_emission: string;
  emis_par: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface CreateCertificateParams {
  contactId: string;
  sessionId?: string | null;
  typeAttestation?: string;
  metadata?: Record<string, unknown>;
}

interface CertificateResult {
  id: string;
  numero_certificat: string;
  date_emission: string;
}

export function useAttestationCertificates() {
  const queryClient = useQueryClient();

  // Récupérer tous les certificats
  const { data: certificates, isLoading } = useQuery({
    queryKey: ['attestation-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attestation_certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AttestationCertificate[];
    },
  });

  // Récupérer les certificats d'un contact
  const getCertificatesByContact = async (contactId: string): Promise<AttestationCertificate[]> => {
    const { data, error } = await supabase
      .from('attestation_certificates')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AttestationCertificate[];
  };

  // Récupérer un certificat par numéro (pour vérification)
  const getCertificateByNumero = async (numeroCertificat: string): Promise<AttestationCertificate | null> => {
    const { data, error } = await supabase
      .from('attestation_certificates')
      .select('*')
      .eq('numero_certificat', numeroCertificat)
      .maybeSingle();

    if (error) throw error;
    return data as AttestationCertificate | null;
  };

  // Créer ou récupérer un certificat existant
  const createCertificate = useMutation({
    mutationFn: async ({ 
      contactId, 
      sessionId = null, 
      typeAttestation = 'formation',
      metadata = {}
    }: CreateCertificateParams): Promise<CertificateResult> => {
      const { data, error } = await supabase.rpc('create_attestation_certificate', {
        p_contact_id: contactId,
        p_session_id: sessionId,
        p_type_attestation: typeAttestation,
        p_metadata: metadata as unknown as Record<string, never>,
      });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Aucun certificat retourné');
      }

      return data[0] as CertificateResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attestation-certificates'] });
    },
    onError: (error: Error) => {
      console.error('Erreur création certificat:', error);
      toast.error('Erreur lors de la création du certificat');
    },
  });

  // Obtenir ou créer un certificat (fonction utilitaire)
  const getOrCreateCertificate = async (params: CreateCertificateParams): Promise<CertificateResult> => {
    return createCertificate.mutateAsync(params);
  };

  return {
    certificates,
    isLoading,
    getCertificatesByContact,
    getCertificateByNumero,
    createCertificate: createCertificate.mutate,
    createCertificateAsync: createCertificate.mutateAsync,
    getOrCreateCertificate,
    isCreating: createCertificate.isPending,
  };
}

// Hook pour les certificats d'un contact spécifique
export function useContactCertificates(contactId: string | null) {
  return useQuery({
    queryKey: ['contact-certificates', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('attestation_certificates')
        .select(`
          *,
          session:sessions(nom, formation_type, date_debut, date_fin)
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
}

// Hook pour vérifier un certificat par son numéro
export function useVerifyCertificate(numeroCertificat: string | null) {
  return useQuery({
    queryKey: ['verify-certificate', numeroCertificat],
    queryFn: async () => {
      if (!numeroCertificat) return null;
      
      const { data, error } = await supabase
        .from('attestation_certificates')
        .select(`
          *,
          contact:contacts(nom, prenom, email),
          session:sessions(nom, formation_type, date_debut, date_fin)
        `)
        .eq('numero_certificat', numeroCertificat)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!numeroCertificat,
  });
}
