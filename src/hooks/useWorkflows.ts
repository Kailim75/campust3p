import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkflowAction {
  type: 'send_email' | 'create_notification' | 'update_status' | 'create_historique' | 'add_delay' | 'webhook';
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
  trigger_type: string;
  trigger_conditions: Record<string, any>;
  actions: WorkflowAction[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_data: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result: Record<string, any> | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export type WorkflowInput = Omit<Workflow, 'id' | 'created_at' | 'updated_at'>;

export const TRIGGER_TYPES = [
  { value: 'contact_created', label: 'Nouveau contact créé', icon: 'user-plus', category: 'Contacts' },
  { value: 'inscription_created', label: 'Nouvelle inscription', icon: 'clipboard', category: 'Sessions' },
  { value: 'payment_received', label: 'Paiement reçu', icon: 'credit-card', category: 'Paiements' },
  { value: 'exam_scheduled', label: 'Examen planifié', icon: 'calendar', category: 'Examens' },
  { value: 'status_changed', label: 'Statut modifié', icon: 'refresh-cw', category: 'Général' },
  { value: 'session_reminder_7d', label: 'Rappel session J-7', icon: 'bell', category: 'Sessions' },
  { value: 'session_reminder_1d', label: 'Rappel session J-1', icon: 'bell', category: 'Sessions' },
  { value: 'document_expired', label: 'Document expiré', icon: 'file-x', category: 'Documents' },
  { value: 'session_completed', label: 'Session terminée', icon: 'check-circle', category: 'Sessions' },
  { value: 'facture_overdue', label: 'Facture en retard', icon: 'alert-triangle', category: 'Paiements' },
];

export const ACTION_TYPES = [
  { value: 'send_email', label: 'Envoyer un email', icon: 'mail', description: 'Envoyer un email automatique au contact' },
  { value: 'create_notification', label: 'Créer une notification', icon: 'bell', description: 'Notifier les administrateurs ou formateurs' },
  { value: 'update_status', label: 'Mettre à jour un statut', icon: 'refresh-cw', description: 'Changer le statut d\'un enregistrement' },
  { value: 'create_historique', label: 'Ajouter à l\'historique', icon: 'file-text', description: 'Créer une entrée dans l\'historique du contact' },
  { value: 'add_delay', label: 'Ajouter un délai', icon: 'clock', description: 'Attendre avant l\'action suivante' },
  { value: 'webhook', label: 'Appel webhook', icon: 'globe', description: 'Envoyer des données vers une URL externe' },
];

export interface WorkflowTemplate {
  id: string;
  nom: string;
  description: string;
  trigger_type: string;
  actions: WorkflowAction[];
  category: string;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'welcome_email',
    nom: 'Email de bienvenue',
    description: 'Envoie automatiquement un email de bienvenue à chaque nouveau contact inscrit.',
    trigger_type: 'contact_created',
    category: 'Onboarding',
    actions: [
      { type: 'send_email', config: { subject: 'Bienvenue {{prenom}} !', content: 'Bonjour {{prenom}}, bienvenue dans notre centre de formation.' } },
      { type: 'create_historique', config: { type: 'email', titre: 'Email de bienvenue envoyé', contenu: 'Email automatique envoyé à la création du contact.' } },
    ],
  },
  {
    id: 'payment_confirmation',
    nom: 'Confirmation de paiement',
    description: 'Confirme la réception d\'un paiement et met à jour le statut de la facture.',
    trigger_type: 'payment_received',
    category: 'Paiements',
    actions: [
      { type: 'send_email', config: { subject: 'Paiement reçu - Confirmation', content: 'Nous confirmons la réception de votre paiement.' } },
      { type: 'create_notification', config: { title: 'Paiement reçu', message: 'Un paiement a été enregistré.', notification_type: 'success' } },
    ],
  },
  {
    id: 'session_reminder',
    nom: 'Rappel de session J-1',
    description: 'Envoie un rappel la veille de la session de formation.',
    trigger_type: 'session_reminder_1d',
    category: 'Sessions',
    actions: [
      { type: 'send_email', config: { subject: 'Rappel : votre session demain', content: 'Bonjour {{prenom}}, nous vous rappelons votre session de formation prévue demain.' } },
    ],
  },
  {
    id: 'overdue_invoice',
    nom: 'Relance facture impayée',
    description: 'Relance automatique pour les factures en retard de paiement.',
    trigger_type: 'facture_overdue',
    category: 'Paiements',
    actions: [
      { type: 'send_email', config: { subject: 'Relance : facture en attente', content: 'Bonjour {{prenom}}, votre facture est en attente de règlement.' } },
      { type: 'create_notification', config: { title: 'Facture en retard', message: 'Une relance a été envoyée.', notification_type: 'warning' } },
      { type: 'create_historique', config: { type: 'email', titre: 'Relance facture envoyée', contenu: 'Relance automatique envoyée pour facture impayée.' } },
    ],
  },
  {
    id: 'doc_expiry_alert',
    nom: 'Alerte document expiré',
    description: 'Notifie l\'équipe quand un document important expire.',
    trigger_type: 'document_expired',
    category: 'Documents',
    actions: [
      { type: 'create_notification', config: { title: 'Document expiré', message: 'Un document a expiré et nécessite un renouvellement.', notification_type: 'warning' } },
    ],
  },
  {
    id: 'session_complete_cert',
    nom: 'Post-session automatique',
    description: 'Après une session terminée, notifie et enregistre dans l\'historique.',
    trigger_type: 'session_completed',
    category: 'Sessions',
    actions: [
      { type: 'send_email', config: { subject: 'Session terminée - Merci !', content: 'Bonjour {{prenom}}, merci d\'avoir participé à votre session de formation.' } },
      { type: 'create_historique', config: { type: 'note', titre: 'Session terminée', contenu: 'L\'apprenant a terminé sa session de formation.' } },
    ],
  },
];

export function useWorkflows() {
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(w => ({
        ...w,
        trigger_conditions: w.trigger_conditions as Record<string, any> || {},
        actions: (w.actions as unknown as WorkflowAction[]) || []
      })) as Workflow[];
    }
  });

  const createWorkflow = useMutation({
    mutationFn: async (input: WorkflowInput) => {
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          nom: input.nom,
          description: input.description,
          actif: input.actif,
          trigger_type: input.trigger_type,
          trigger_conditions: input.trigger_conditions,
          actions: input.actions as unknown as Record<string, any>[]
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow créé avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const updateWorkflow = useMutation({
    mutationFn: async ({ id, ...input }: WorkflowInput & { id: string }) => {
      const { data, error } = await supabase
        .from('workflows')
        .update({
          nom: input.nom,
          description: input.description,
          actif: input.actif,
          trigger_type: input.trigger_type,
          trigger_conditions: input.trigger_conditions,
          actions: input.actions as unknown as Record<string, any>[]
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow supprimé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const toggleWorkflow = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase
        .from('workflows')
        .update({ actif })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Statut du workflow mis à jour');
    }
  });

  const duplicateWorkflow = useMutation({
    mutationFn: async (workflow: Workflow) => {
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          nom: `${workflow.nom} (copie)`,
          description: workflow.description,
          actif: false,
          trigger_type: workflow.trigger_type,
          trigger_conditions: workflow.trigger_conditions,
          actions: workflow.actions as unknown as Record<string, any>[]
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow dupliqué');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  return {
    workflows,
    isLoading,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    duplicateWorkflow
  };
}

export function useWorkflowExecutions(workflowId?: string) {
  return useQuery({
    queryKey: ['workflow-executions', workflowId],
    queryFn: async () => {
      let query = supabase
        .from('workflow_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(e => ({
        ...e,
        trigger_data: e.trigger_data as Record<string, any> || {},
        result: e.result as Record<string, any> | null
      })) as WorkflowExecution[];
    }
  });
}

export function useAllWorkflowExecutions() {
  return useQuery({
    queryKey: ['workflow-executions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      return (data || []).map(e => ({
        ...e,
        trigger_data: e.trigger_data as Record<string, any> || {},
        result: e.result as Record<string, any> | null
      })) as WorkflowExecution[];
    }
  });
}

export function useExecuteWorkflow() {
  return useMutation({
    mutationFn: async (params: { trigger_type: string; trigger_data: Record<string, any>; workflow_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: params
      });
      
      if (error) throw error;
      return data;
    }
  });
}
