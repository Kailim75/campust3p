import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

// ===============================================
// CONFIGURATION EMAIL CENTRALISÉE - NE PAS MODIFIER
// Adresse unique et verrouillée pour TOUS les envois
// ===============================================
const EMAIL_CONFIG = {
  FROM: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
  REPLY_TO: "montrouge@ecolet3p.fr",
} as const;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowAction {
  type: 'send_email' | 'create_notification' | 'update_status' | 'create_historique';
  config: Record<string, any>;
}

interface Workflow {
  id: string;
  nom: string;
  trigger_type: string;
  trigger_conditions: Record<string, any>;
  actions: WorkflowAction[];
  actif: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { trigger_type, trigger_data, workflow_id } = await req.json();
    
    console.log(`Executing workflow for trigger: ${trigger_type}`, trigger_data);

    // Récupérer les workflows actifs pour ce type de déclencheur
    let query = supabase
      .from('workflows')
      .select('*')
      .eq('actif', true);
    
    if (workflow_id) {
      query = query.eq('id', workflow_id);
    } else {
      query = query.eq('trigger_type', trigger_type);
    }
    
    const { data: workflows, error: wfError } = await query;

    if (wfError) {
      console.error('Error fetching workflows:', wfError);
      throw wfError;
    }

    if (!workflows || workflows.length === 0) {
      console.log('No active workflows found for trigger:', trigger_type);
      return new Response(
        JSON.stringify({ success: true, message: 'No workflows to execute' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const workflow of workflows as Workflow[]) {
      // Créer l'entrée d'exécution
      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflow.id,
          trigger_data,
          status: 'running'
        })
        .select()
        .single();

      if (execError) {
        console.error('Error creating execution:', execError);
        continue;
      }

      try {
        // Vérifier les conditions du trigger
        if (!checkConditions(workflow.trigger_conditions, trigger_data)) {
          await supabase
            .from('workflow_executions')
            .update({ 
              status: 'completed', 
              result: { skipped: true, reason: 'Conditions not met' },
              completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);
          continue;
        }

        // Exécuter chaque action
        const actionResults = [];
        for (const action of workflow.actions) {
          const result = await executeAction(supabase, action, trigger_data);
          actionResults.push(result);
        }

        // Mettre à jour l'exécution
        await supabase
          .from('workflow_executions')
          .update({
            status: 'completed',
            result: { actions: actionResults },
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        results.push({ workflow_id: workflow.id, success: true, actions: actionResults });

      } catch (actionError: any) {
        console.error('Error executing workflow:', actionError);
        await supabase
          .from('workflow_executions')
          .update({
            status: 'failed',
            error_message: actionError.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        results.push({ workflow_id: workflow.id, success: false, error: actionError.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Workflow execution error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function checkConditions(conditions: Record<string, any>, data: Record<string, any>): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  for (const [key, value] of Object.entries(conditions)) {
    if (key === 'formation_type' && data.formation !== value) {
      return false;
    }
    if (key === 'statut' && data.statut !== value) {
      return false;
    }
    if (key === 'type_financement' && data.type_financement !== value) {
      return false;
    }
  }

  return true;
}

async function executeAction(
  supabase: any, 
  action: WorkflowAction, 
  triggerData: Record<string, any>
): Promise<any> {
  console.log(`Executing action: ${action.type}`, action.config);

  switch (action.type) {
    case 'send_email':
      return await sendEmailAction(supabase, action.config, triggerData);
    
    case 'create_notification':
      return await createNotificationAction(supabase, action.config, triggerData);
    
    case 'update_status':
      return await updateStatusAction(supabase, action.config, triggerData);
    
    case 'create_historique':
      return await createHistoriqueAction(supabase, action.config, triggerData);
    
    default:
      return { success: false, error: `Unknown action type: ${action.type}` };
  }
}

async function sendEmailAction(
  supabase: any,
  config: Record<string, any>,
  data: Record<string, any>
): Promise<any> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const resend = new Resend(resendApiKey);

  // Récupérer le template d'email si spécifié
  let subject = config.subject || 'Notification';
  let content = config.content || '';

  if (config.template_id) {
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', config.template_id)
      .single();

    if (template) {
      subject = replaceVariables(template.sujet, data);
      content = replaceVariables(template.contenu, data);
    }
  } else {
    subject = replaceVariables(subject, data);
    content = replaceVariables(content, data);
  }

  // Récupérer l'email du destinataire
  let recipientEmail = config.to || data.email;
  
  if (data.contact_id && !recipientEmail) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('email, prenom, nom')
      .eq('id', data.contact_id)
      .single();
    
    if (contact) {
      recipientEmail = contact.email;
    }
  }

  if (!recipientEmail) {
    return { success: false, error: 'No recipient email found' };
  }

  const emailResult = await resend.emails.send({
    from: EMAIL_CONFIG.FROM,
    to: [recipientEmail],
    subject,
    html: content,
    reply_to: EMAIL_CONFIG.REPLY_TO
  });

  // Logger l'envoi
  await supabase.from('email_logs').insert({
    contact_id: data.contact_id,
    recipient_email: recipientEmail,
    subject,
    type: 'workflow_automated',
    status: 'sent',
    template_used: config.template_id
  });

  return { success: true, email_sent: true };
}

async function createNotificationAction(
  supabase: any,
  config: Record<string, any>,
  data: Record<string, any>
): Promise<any> {
  const title = replaceVariables(config.title || 'Notification', data);
  const message = replaceVariables(config.message || '', data);

  // Récupérer tous les utilisateurs admin/staff
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'staff']);

  if (!userRoles || userRoles.length === 0) {
    return { success: false, error: 'No users to notify' };
  }

  const notifications = userRoles.map((ur: any) => ({
    user_id: ur.user_id,
    title,
    message,
    type: config.notification_type || 'workflow',
    link: config.link || null,
    metadata: { workflow: true, trigger_data: data }
  }));

  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, count: notifications.length };
}

async function updateStatusAction(
  supabase: any,
  config: Record<string, any>,
  data: Record<string, any>
): Promise<any> {
  const { table, status_field, new_status } = config;
  const recordId = data[`${table}_id`] || data.id;

  if (!recordId) {
    return { success: false, error: 'No record ID found' };
  }

  const { error } = await supabase
    .from(table)
    .update({ [status_field || 'statut']: new_status })
    .eq('id', recordId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, updated: recordId };
}

async function createHistoriqueAction(
  supabase: any,
  config: Record<string, any>,
  data: Record<string, any>
): Promise<any> {
  const titre = replaceVariables(config.titre || 'Action automatique', data);
  const contenu = replaceVariables(config.contenu || '', data);

  const { error } = await supabase.from('contact_historique').insert({
    contact_id: data.contact_id,
    type: config.type || 'note',
    titre,
    contenu,
    date_echange: new Date().toISOString()
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

function replaceVariables(text: string, data: Record<string, any>): string {
  if (!text) return '';
  
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}
