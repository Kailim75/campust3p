import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";
import { redactPayload } from "../_shared/redact.ts";

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

// ===============================================
// SÉCURITÉ (audit du 13/08/2026, §3.1)
// ===============================================
// Jusqu'au 11/09/2026 cette fonction s'exécutait avec la clé service_role
// (RLS contournée) pour N'IMPORTE QUEL utilisateur connecté — un formateur
// suffisait — sur un workflow et des enregistrements choisis par le
// navigateur : bascule de statut sur n'importe quelle table, email redirigé
// vers `trigger_data.email`, historique écrit sur le contact d'un autre centre.
//
// Désormais :
//  1. l'appelant est authentifié par son JWT (auth.getUser) ;
//  2. il doit être admin, staff ou super_admin (même périmètre que la SQL
//     `is_admin_or_staff()`) ;
//  3. le workflow doit appartenir à un de ses centres, et CHAQUE
//     enregistrement ciblé (contact, cible de update_status) doit appartenir
//     au centre du workflow — contrôle fait AVANT toute écriture ;
//  4. update_status : liste blanche stricte table → champ de statut ;
//  5. send_email : le destinataire n'est JAMAIS lu dans trigger_data.
//
// Aucun appelant serveur (pg_net, cron, autre fonction) n'existe au
// 11/09/2026 : le seul appel est le bouton « Tester » de WorkflowsPage.
// Il n'y a donc volontairement AUCUNE voie d'exemption.

// Même périmètre que public.is_admin_or_staff().
const ROLES_AUTORISES = ['admin', 'staff', 'super_admin'];

// Tables proposées par l'interface (WorkflowFormDialog) et par
// generate-workflow-ai, avec le seul champ de statut modifiable.
const CHAMPS_STATUT_AUTORISES: Record<string, readonly string[]> = {
  contacts: ['statut'],
  factures: ['statut'],
  devis: ['statut'],
  sessions: ['statut'],
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
  centre_id: string | null;
}

interface Appelant {
  userId: string;
  superAdmin: boolean;
  centreIds: string[];
}

interface ContactVerifie {
  id: string;
  centre_id: string;
  email: string | null;
  prenom: string | null;
  nom: string | null;
}

/** Enregistrements dont l'appartenance au centre du workflow a été vérifiée. */
interface ContexteVerifie {
  appelant: Appelant;
  workflow: Workflow;
  contact: ContactVerifie | null;
  /** clé `${table}:${id}` → centre_id vérifié */
  cibles: Map<string, string>;
}

type Verification =
  | { ok: true; contexte: ContexteVerifie }
  | { ok: false; raison: 'inaccessible' | 'autre_centre'; detail: string };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function estObjet(v: unknown): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Motif des autres fonctions du projet (export-audit-pack, alma-reconcile-cron) :
 * jeton vérifié par auth.getUser sur un client anon portant l'en-tête, rôles et
 * centres relus côté serveur — jamais depuis le corps de la requête.
 */
async function authentifierAppelant(req: Request, admin: any): Promise<Appelant | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await authClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return jsonResponse(401, { success: false, error: 'Invalid token' });
  }

  // Un utilisateur peut porter plusieurs rôles : on lit toutes les lignes
  // (pas de .single(), qui échouerait et refuserait un admin légitime).
  const { data: roles, error: rolesError } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  const nomsRoles: string[] = (roles ?? []).map((r: { role: string }) => r.role);
  if (rolesError || !nomsRoles.some((r) => ROLES_AUTORISES.includes(r))) {
    return jsonResponse(403, { success: false, error: 'Forbidden - admin or staff role required' });
  }

  // Centres de l'appelant : même source que public.has_centre_access()
  // (super_admin OU rattachement dans user_centres).
  const { data: rattachements, error: centresError } = await admin
    .from('user_centres')
    .select('centre_id')
    .eq('user_id', user.id);
  if (centresError) {
    return jsonResponse(403, { success: false, error: 'Forbidden' });
  }
  const centreIds = (rattachements ?? [])
    .map((r: { centre_id: string | null }) => r.centre_id)
    .filter((c: string | null): c is string => !!c);
  const superAdmin = nomsRoles.includes('super_admin');

  if (!superAdmin && centreIds.length === 0) {
    return jsonResponse(403, { success: false, error: 'Forbidden - no centre' });
  }

  return { userId: user.id, superAdmin, centreIds };
}

/** Équivalent de public.has_centre_access(centre_id). */
function centreAccessible(appelant: Appelant, centreId: string | null | undefined): boolean {
  if (!centreId) return false;
  return appelant.superAdmin || appelant.centreIds.includes(centreId);
}

/** Le workflow lui-même est-il dans un centre de l'appelant ? */
function workflowAccessible(appelant: Appelant, workflow: Workflow): boolean {
  // Un workflow sans centre (hérité) n'est exécutable que par un super_admin.
  return workflow.centre_id ? centreAccessible(appelant, workflow.centre_id) : appelant.superAdmin;
}

/**
 * Vérifie, AVANT toute écriture, chaque enregistrement que les actions du
 * workflow vont toucher :
 *  - 'inaccessible' : l'enregistrement n'existe pas ou n'est dans aucun centre
 *    de l'appelant → 403 pour toute la requête ;
 *  - 'autre_centre' : il est accessible à l'appelant mais pas dans le centre du
 *    workflow (utilisateur multi-centres) → on n'applique pas ce workflow.
 */
async function verifierCibles(
  admin: any,
  appelant: Appelant,
  workflow: Workflow,
  data: Record<string, any>
): Promise<Verification> {
  const cibles = new Map<string, string>();
  let contact: ContactVerifie | null = null;
  const actions = Array.isArray(workflow.actions) ? workflow.actions : [];

  const controler = (centreId: string | null | undefined, libelle: string): Verification | null => {
    if (!centreAccessible(appelant, centreId)) {
      return { ok: false, raison: 'inaccessible', detail: libelle };
    }
    if (workflow.centre_id && centreId !== workflow.centre_id) {
      return { ok: false, raison: 'autre_centre', detail: libelle };
    }
    return null;
  };

  const besoinContact = actions.some(
    (a) => a?.type === 'send_email' || a?.type === 'create_historique'
  );
  if (besoinContact && data.contact_id !== undefined && data.contact_id !== null) {
    if (typeof data.contact_id !== 'string') {
      return { ok: false, raison: 'inaccessible', detail: 'contact_id invalide' };
    }
    const { data: ligne } = await admin
      .from('contacts')
      .select('id, centre_id, email, prenom, nom')
      .eq('id', data.contact_id)
      .maybeSingle();
    const refus = controler(ligne?.centre_id, `contact ${data.contact_id}`);
    if (refus) return refus;
    contact = ligne as ContactVerifie;
  }

  for (const action of actions) {
    if (action?.type !== 'update_status') continue;
    const table = action.config?.table;
    // Table ou champ hors liste : l'action sera refusée à l'exécution, sans
    // aucune lecture ni écriture sur cette table.
    if (!configStatutAutorisee(action.config)) continue;

    const recordId = data[`${table}_id`] || data.id;
    if (!recordId) continue; // l'action répondra « No record ID found »
    if (typeof recordId !== 'string') {
      return { ok: false, raison: 'inaccessible', detail: `${table} : identifiant invalide` };
    }
    const cle = `${table}:${recordId}`;
    if (cibles.has(cle)) continue;

    const { data: ligne } = await admin
      .from(table)
      .select('id, centre_id')
      .eq('id', recordId)
      .maybeSingle();
    const refus = controler(ligne?.centre_id, `${table} ${recordId}`);
    if (refus) return refus;
    cibles.set(cle, ligne.centre_id);
  }

  return { ok: true, contexte: { appelant, workflow, contact, cibles } };
}

function configStatutAutorisee(config: Record<string, any> | undefined): boolean {
  const table = config?.table;
  if (typeof table !== 'string' || !Object.prototype.hasOwnProperty.call(CHAMPS_STATUT_AUTORISES, table)) {
    return false;
  }
  const champ = config?.status_field || 'statut';
  return CHAMPS_STATUT_AUTORISES[table].includes(champ);
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
    // Avant toute lecture du corps : 401 / 403 JSON avec en-têtes CORS.
    const appelant = await authentifierAppelant(req, supabase);
    if (appelant instanceof Response) return appelant;

    const body = await req.json().catch(() => null);
    const { trigger_type, trigger_data, workflow_id } = estObjet(body) ? body : ({} as Record<string, any>);
    const donnees: Record<string, any> = estObjet(trigger_data) ? trigger_data : {};

    if (workflow_id !== undefined && workflow_id !== null && typeof workflow_id !== 'string') {
      return jsonResponse(400, { success: false, error: 'workflow_id invalide' });
    }
    if (!workflow_id && typeof trigger_type !== 'string') {
      return jsonResponse(400, { success: false, error: 'trigger_type ou workflow_id requis' });
    }

    console.log(
      `Executing workflow for trigger: ${trigger_type} (user ${appelant.userId})`,
      redactPayload(donnees)
    );

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

    const { data: workflowsLus, error: wfError } = await query;

    if (wfError) {
      console.error('Error fetching workflows:', wfError);
      throw wfError;
    }

    const tousWorkflows = (workflowsLus ?? []) as Workflow[];
    const workflows = tousWorkflows.filter((w) => workflowAccessible(appelant, w));

    // Workflow désigné explicitement mais hors des centres de l'appelant.
    if (workflow_id && tousWorkflows.length > 0 && workflows.length === 0) {
      return jsonResponse(403, { success: false, error: 'Forbidden - workflow hors de vos centres' });
    }

    if (workflows.length === 0) {
      console.log('No active workflows found for trigger:', trigger_type);
      return jsonResponse(200, { success: true, message: 'No workflows to execute' });
    }

    // Contrôle de centre de TOUTES les cibles avant la moindre écriture :
    // un refus ne laisse ni exécution partielle ni ligne workflow_executions.
    const aExecuter: ContexteVerifie[] = [];
    for (const workflow of workflows) {
      const verification = await verifierCibles(supabase, appelant, workflow, donnees);
      if (verification.ok) {
        aExecuter.push(verification.contexte);
        continue;
      }
      if (verification.raison === 'autre_centre' && !workflow_id) {
        // Déclenchement par type : ce workflow appartient à un autre des
        // centres de l'appelant, il ne concerne pas cet enregistrement.
        console.log(`Workflow ${workflow.id} ignoré : ${verification.detail} hors de son centre`);
        continue;
      }
      console.warn(
        `[execute-workflow] refus pour ${appelant.userId} sur workflow ${workflow.id} : ${verification.detail}`
      );
      return jsonResponse(403, {
        success: false,
        error: 'Forbidden - enregistrement hors du centre du workflow',
      });
    }

    const results = [];

    for (const contexte of aExecuter) {
      const { workflow } = contexte;
      // Créer l'entrée d'exécution
      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflow.id,
          trigger_data: donnees,
          status: 'running'
        })
        .select()
        .single();

      if (execError) {
        console.error('Error creating execution:', execError);
        continue;
      }

      try {
        // Bouton « Tester » : simulation. On NE déclenche PAS les actions réelles
        // (aucun email envoyé, aucune écriture) et on ne fait donc pas échouer le
        // test faute de contact/enregistrement réel. Accès et centre sont déjà
        // vérifiés ; on résume simplement ce qui serait fait. Les VRAIS
        // déclencheurs (données réelles, sans test:true) suivent la voie normale,
        // où un échec d'action marque désormais l'exécution « failed ».
        if (donnees?.test === true) {
          const apercu = (workflow.actions ?? []).map((a: WorkflowAction) => a.type);
          await supabase
            .from('workflow_executions')
            .update({
              status: 'completed',
              result: { simulation: true, actions_prevues: apercu, declenche_par: appelant.userId },
              completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);
          results.push({ workflow_id: workflow.id, success: true, simulation: true, actions: apercu });
          continue;
        }

        // Vérifier les conditions du trigger
        if (!checkConditions(workflow.trigger_conditions, donnees)) {
          await supabase
            .from('workflow_executions')
            .update({
              status: 'completed',
              result: { skipped: true, reason: 'Conditions not met', declenche_par: appelant.userId },
              completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);
          continue;
        }

        // Exécuter chaque action
        const actionResults = [];
        for (const action of workflow.actions) {
          const result = await executeAction(supabase, action, donnees, contexte);
          actionResults.push(result);
        }

        // Une action peut échouer en RETOURNANT { success: false } (destinataire
        // manquant, template hors centre, clé Resend absente, type inconnu…) SANS
        // lever d'exception. Sans ce contrôle, l'exécution était marquée
        // « completed » et renvoyée « success: true » alors qu'une action avait
        // échoué : panne silencieuse (l'opérateur croyait l'action faite).
        const resume = resumerActions(actionResults);

        // Mettre à jour l'exécution — 'failed' si au moins une action a échoué.
        await supabase
          .from('workflow_executions')
          .update({
            status: resume.echec ? 'failed' : 'completed',
            error_message: resume.messageErreur,
            result: { actions: actionResults, declenche_par: appelant.userId },
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        results.push(
          resume.echec
            ? { workflow_id: workflow.id, success: false, error: resume.messageErreur, actions: actionResults }
            : { workflow_id: workflow.id, success: true, actions: actionResults }
        );

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

    // La réponse ne peut plus être « success: true » si un workflow a échoué.
    const succesGlobal = results.every((r) => r.success !== false);
    return jsonResponse(200, { success: succesGlobal, results });

  } catch (error: any) {
    console.error('Workflow execution error:', error);
    return jsonResponse(500, { success: false, error: error.message });
  }
});

// Une exécution est en échec dès qu'UNE action retourne { success: false }
// (échec renvoyé, sans exception levée). Seuls les échecs EXPLICITES comptent :
// un résultat sans champ `success` (ou success !== false) est considéré réussi,
// pour ne pas transformer un succès en faux échec.
export function resumerActions(
  actionResults: any[],
): { echec: boolean; messageErreur: string | null } {
  const enEchec = actionResults.filter((r) => r?.success === false);
  if (enEchec.length === 0) return { echec: false, messageErreur: null };
  const messageErreur = enEchec
    .map((r) => r?.error ?? 'action en échec')
    .join(' ; ');
  return { echec: true, messageErreur };
}

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
  triggerData: Record<string, any>,
  contexte: ContexteVerifie
): Promise<any> {
  console.log(`Executing action: ${action.type}`);

  switch (action.type) {
    case 'send_email':
      return await sendEmailAction(supabase, action.config ?? {}, triggerData, contexte);

    case 'create_notification':
      return await createNotificationAction(supabase, action.config ?? {}, triggerData, contexte);

    case 'update_status':
      return await updateStatusAction(supabase, action.config ?? {}, triggerData, contexte);

    case 'create_historique':
      return await createHistoriqueAction(supabase, action.config ?? {}, triggerData, contexte);

    default:
      return { success: false, error: `Unknown action type: ${action.type}` };
  }
}

async function sendEmailAction(
  supabase: any,
  config: Record<string, any>,
  data: Record<string, any>,
  contexte: ContexteVerifie
): Promise<any> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const { contact, workflow, appelant } = contexte;

  // Variables : les coordonnées du contact viennent de la BASE, pas du
  // navigateur (un {{email}} ou {{prenom}} forgé ne s'affiche pas).
  const variables: Record<string, any> = contact
    ? { ...data, email: contact.email ?? '', prenom: contact.prenom ?? '', nom: contact.nom ?? '' }
    : data;

  // Récupérer le template d'email si spécifié
  let subject = config.subject || 'Notification';
  let content = config.content || '';

  if (config.template_id) {
    const { data: template } = await supabase
      .from('email_templates')
      .select('id, sujet, contenu, centre_id')
      .eq('id', config.template_id)
      .maybeSingle();

    if (template) {
      const templateAutorise = !template.centre_id ||
        (workflow.centre_id
          ? template.centre_id === workflow.centre_id
          : centreAccessible(appelant, template.centre_id));
      if (!templateAutorise) {
        return { success: false, error: 'Template hors du centre du workflow' };
      }
      subject = replaceVariables(template.sujet, variables);
      content = replaceVariables(template.contenu, variables, { html: true });
    } else {
      subject = replaceVariables(subject, variables);
      content = replaceVariables(content, variables, { html: true });
    }
  } else {
    subject = replaceVariables(subject, variables);
    content = replaceVariables(content, variables, { html: true });
  }

  // Destinataire : JAMAIS trigger_data.email. Soit l'adresse fixée dans la
  // configuration du workflow (par un admin/staff), soit l'email du contact
  // relu en base après contrôle de centre.
  const adresseConfig = typeof config.to === 'string' ? config.to.trim() : '';
  const recipientEmail = adresseConfig || contact?.email || '';

  if (!recipientEmail) {
    return { success: false, error: 'No recipient email found' };
  }

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: EMAIL_CONFIG.FROM,
    to: [recipientEmail],
    subject: subject.replace(/[\r\n]+/g, ' '),
    html: content,
    reply_to: EMAIL_CONFIG.REPLY_TO
  });

  // Logger l'envoi
  await supabase.from('email_logs').insert({
    contact_id: contact?.id ?? null,
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
  data: Record<string, any>,
  contexte: ContexteVerifie
): Promise<any> {
  const title = replaceVariables(config.title || 'Notification', data);
  const message = replaceVariables(config.message || '', data);
  const centreId = contexte.workflow.centre_id;

  // Destinataires : les admin/staff du centre du workflow uniquement
  // (auparavant : tous les admin/staff de tous les centres).
  if (!centreId) {
    return { success: false, error: 'Workflow sans centre : destinataires indéterminés' };
  }
  const { data: membres } = await supabase
    .from('user_centres')
    .select('user_id')
    .eq('centre_id', centreId);
  const membresIds = [...new Set((membres ?? []).map((m: any) => m.user_id).filter(Boolean))];
  if (membresIds.length === 0) {
    return { success: false, error: 'No users to notify' };
  }

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'staff'])
    .in('user_id', membresIds);

  const destinataires = [...new Set((userRoles ?? []).map((ur: any) => ur.user_id))];
  if (destinataires.length === 0) {
    return { success: false, error: 'No users to notify' };
  }

  const notifications = destinataires.map((userId) => ({
    user_id: userId,
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
  data: Record<string, any>,
  contexte: ContexteVerifie
): Promise<any> {
  const { table, status_field, new_status } = config;

  if (!configStatutAutorisee(config)) {
    return {
      success: false,
      error: `Mise à jour refusée : ${String(table)}.${String(status_field || 'statut')} hors liste autorisée`,
    };
  }

  const recordId = data[`${table}_id`] || data.id;

  if (!recordId) {
    return { success: false, error: 'No record ID found' };
  }

  const centreVerifie = contexte.cibles.get(`${table}:${recordId}`);
  if (!centreVerifie) {
    // Ne devrait jamais arriver : verifierCibles a contrôlé toutes les cibles.
    return { success: false, error: 'Cible non vérifiée' };
  }

  const { error } = await supabase
    .from(table)
    .update({ [status_field || 'statut']: new_status })
    .eq('id', recordId)
    .eq('centre_id', centreVerifie);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, updated: recordId };
}

async function createHistoriqueAction(
  supabase: any,
  config: Record<string, any>,
  data: Record<string, any>,
  contexte: ContexteVerifie
): Promise<any> {
  if (!contexte.contact) {
    return { success: false, error: 'No contact found' };
  }

  const titre = replaceVariables(config.titre || 'Action automatique', data);
  const contenu = replaceVariables(config.contenu || '', data);

  const { error } = await supabase.from('contact_historique').insert({
    contact_id: contexte.contact.id,
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

function echapperHtml(valeur: string): string {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replaceVariables(
  text: string,
  data: Record<string, any>,
  options: { html?: boolean } = {}
): string {
  if (!text) return '';

  // Remplacement par FONCTION (jamais par chaîne : `$&`, `$'` y seraient
  // interprétés). En HTML, les valeurs sont échappées : une variable ne peut
  // pas injecter de lien ou de balise dans un email parti de l'adresse du centre.
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key) || data[key] === undefined) return match;
    const valeur = String(data[key]);
    return options.html ? echapperHtml(valeur) : valeur;
  });
}
