import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkflowAction {
  type: 'send_email' | 'create_notification' | 'update_status' | 'create_historique';
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
  { value: 'contact_created', label: 'Nouveau contact créé' },
  { value: 'inscription_created', label: 'Nouvelle inscription' },
  { value: 'payment_received', label: 'Paiement reçu' },
  { value: 'exam_scheduled', label: 'Examen planifié' },
  { value: 'status_changed', label: 'Statut modifié' },
  { value: 'session_reminder_7d', label: 'Rappel session J-7' },
  { value: 'session_reminder_1d', label: 'Rappel session J-1' },
  { value: 'document_expired', label: 'Document expiré' },
];

export const ACTION_TYPES = [
  { value: 'send_email', label: 'Envoyer un email' },
  { value: 'create_notification', label: 'Créer une notification' },
  { value: 'update_status', label: 'Mettre à jour un statut' },
  { value: 'create_historique', label: 'Ajouter à l\'historique' },
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

  return {
    workflows,
    isLoading,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow
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
