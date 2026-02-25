// ═══════════════════════════════════════════════════════════════
// Hook: useRealActionExecution — Actually executes IA Director actions
// Creates real tasks, sends real emails, opens WhatsApp, etc.
// ═══════════════════════════════════════════════════════════════

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Anomaly } from "@/components/ia-director/audit/types";

export type QuickActionType =
  | "create_tasks"
  | "send_email"
  | "send_sms"
  | "open_whatsapp"
  | "log_phone_call"
  | "open_filtered_view"
  | "mark_resolved"
  | "mark_ignored";

interface QuickActionParams {
  anomaly: Anomaly;
  actionType: QuickActionType;
  navigateFn?: (path: string) => void;
}

async function getAffectedContacts(anomaly: Anomaly) {
  if (anomaly.affected_records.length === 0) return [];
  
  const { data } = await supabase
    .from("contacts")
    .select("id, nom, prenom, email, telephone")
    .in("id", anomaly.affected_records.slice(0, 50));
  return data || [];
}

async function executeCreateTasks(anomaly: Anomaly) {
  const contacts = await getAffectedContacts(anomaly);
  if (contacts.length === 0) {
    toast.warning("Aucun contact trouvé pour créer des tâches");
    return { created: 0 };
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  const tasks = contacts.map((c) => ({
    contact_id: c.id,
    titre: `[IA Director] ${anomaly.title}`,
    contenu: `Action automatique — ${anomaly.description}\n\nPriorité: ${anomaly.priority_score}/100\nImpact estimé: ${anomaly.impact_estime_euros}€`,
    type: "tache" as const,
    date_echange: new Date().toISOString().split("T")[0],
    date_rappel: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    alerte_active: true,
    rappel_description: anomaly.title,
    created_by: user?.id || null,
  }));

  const { error } = await supabase.from("contact_historique").insert(tasks);
  if (error) throw error;

  return { created: tasks.length };
}

async function executeSendEmail(anomaly: Anomaly) {
  const contacts = await getAffectedContacts(anomaly);
  const withEmail = contacts.filter((c) => c.email);
  
  if (withEmail.length === 0) {
    toast.warning("Aucun contact avec email trouvé");
    return { sent: 0, skipped: contacts.length };
  }

  // Call the send-automated-emails edge function
  const { data: { session } } = await supabase.auth.getSession();
  
  const emailPromises = withEmail.map(async (contact) => {
    try {
      const { error } = await supabase.functions.invoke("send-automated-emails", {
        body: {
          type: "ia_director_action",
          to: contact.email,
          recipientName: `${contact.prenom || ""} ${contact.nom || ""}`.trim(),
          subject: getEmailSubject(anomaly),
          content: getEmailContent(anomaly, contact),
          contactId: contact.id,
        },
      });
      return { success: !error, contactId: contact.id };
    } catch {
      return { success: false, contactId: contact.id };
    }
  });

  const results = await Promise.all(emailPromises);
  const sent = results.filter((r) => r.success).length;
  return { sent, skipped: contacts.length - withEmail.length, failed: withEmail.length - sent };
}

function getEmailSubject(anomaly: Anomaly): string {
  switch (anomaly.category) {
    case "paiements": return "Rappel — Régularisation de votre situation";
    case "prospects": return "Votre projet de formation — Parlons-en !";
    case "sessions": return "Information importante concernant votre formation";
    case "administratif": return "Dossier incomplet — Pièces à fournir";
    default: return "Information importante — Centre de formation";
  }
}

function getEmailContent(anomaly: Anomaly, contact: { prenom?: string; nom?: string }): string {
  const name = `${contact.prenom || ""} ${contact.nom || ""}`.trim() || "Madame, Monsieur";
  switch (anomaly.category) {
    case "paiements":
      return `Bonjour ${name},\n\nNous nous permettons de vous contacter concernant une régularisation en attente sur votre dossier de formation.\n\nNous vous invitons à prendre contact avec notre service administratif dans les meilleurs délais.\n\nCordialement,\nL'équipe pédagogique`;
    case "prospects":
      return `Bonjour ${name},\n\nNous avons remarqué votre intérêt pour nos formations et souhaitions revenir vers vous.\n\nNotre équipe est à votre disposition pour répondre à vos questions et vous accompagner dans votre projet.\n\nCordialement,\nL'équipe commerciale`;
    case "administratif":
      return `Bonjour ${name},\n\nNous constatons que votre dossier de formation est incomplet. Afin de finaliser votre inscription, nous vous prions de bien vouloir nous transmettre les documents manquants.\n\nCordialement,\nLe service administratif`;
    default:
      return `Bonjour ${name},\n\nNous souhaitons vous informer d'une action en cours concernant votre dossier.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement`;
  }
}

async function executeOpenWhatsApp(anomaly: Anomaly) {
  const contacts = await getAffectedContacts(anomaly);
  const withPhone = contacts.filter((c) => c.telephone);
  
  if (withPhone.length === 0) {
    toast.warning("Aucun contact avec téléphone trouvé");
    return { opened: 0 };
  }

  // Open WhatsApp for the first contact (can't bulk WhatsApp)
  const phone = withPhone[0].telephone!.replace(/\s/g, "").replace(/^0/, "+33");
  const message = encodeURIComponent(getWhatsAppMessage(anomaly));
  window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  
  return { opened: 1, total: withPhone.length, firstContact: `${withPhone[0].prenom} ${withPhone[0].nom}` };
}

function getWhatsAppMessage(anomaly: Anomaly): string {
  switch (anomaly.category) {
    case "paiements": return "Bonjour, nous souhaitons faire un point concernant votre situation de paiement. Quand seriez-vous disponible pour en discuter ?";
    case "prospects": return "Bonjour, nous revenons vers vous concernant votre projet de formation. Êtes-vous toujours intéressé(e) ? Nous sommes disponibles pour en discuter.";
    default: return "Bonjour, nous souhaitons faire un point concernant votre dossier. Quand seriez-vous disponible ?";
  }
}

async function executeLogPhoneCall(anomaly: Anomaly) {
  const contacts = await getAffectedContacts(anomaly);
  if (contacts.length === 0) return { logged: 0 };

  const { data: { user } } = await supabase.auth.getUser();
  
  const logs = contacts.map((c) => ({
    contact_id: c.id,
    titre: `[IA Director] Appel — ${anomaly.title}`,
    contenu: `Appel planifié suite à l'anomalie détectée.\n${anomaly.description}`,
    type: "appel" as const,
    date_echange: new Date().toISOString().split("T")[0],
    date_rappel: new Date().toISOString().split("T")[0],
    alerte_active: true,
    rappel_description: `Appeler pour: ${anomaly.title}`,
    created_by: user?.id || null,
  }));

  const { error } = await supabase.from("contact_historique").insert(logs);
  if (error) throw error;

  return { logged: logs.length };
}

function getNavigationTarget(anomaly: Anomaly): string {
  switch (anomaly.category) {
    case "prospects": return "prospects";
    case "paiements": return "facturation";
    case "sessions": return "sessions";
    case "administratif":
    case "qualite_data":
    default: return "contacts";
  }
}

async function logAction(anomaly: Anomaly, actionType: string, result: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("ia_action_logs").insert([{
    anomaly_id: anomaly.id,
    anomaly_title: anomaly.title,
    action_type: actionType,
    entity_ids: anomaly.affected_records,
    payload: { actionType, result } as any,
    status: "executed",
    created_by: user?.id || null,
  }]);
}

export function useQuickAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ anomaly, actionType, navigateFn }: QuickActionParams) => {
      let result: Record<string, unknown> = {};

      switch (actionType) {
        case "create_tasks": {
          result = await executeCreateTasks(anomaly);
          toast.success(`${(result as any).created} tâche(s) créée(s) dans l'historique`);
          break;
        }
        case "send_email": {
          result = await executeSendEmail(anomaly);
          const r = result as any;
          if (r.sent > 0) toast.success(`${r.sent} email(s) envoyé(s)`);
          if (r.failed > 0) toast.warning(`${r.failed} email(s) échoué(s)`);
          if (r.skipped > 0) toast.info(`${r.skipped} contact(s) sans email`);
          break;
        }
        case "open_whatsapp": {
          result = await executeOpenWhatsApp(anomaly);
          const w = result as any;
          if (w.opened > 0) toast.success(`WhatsApp ouvert pour ${w.firstContact}`);
          break;
        }
        case "log_phone_call": {
          result = await executeLogPhoneCall(anomaly);
          toast.success(`${(result as any).logged} rappel(s) d'appel créé(s)`);
          break;
        }
        case "open_filtered_view": {
          const target = getNavigationTarget(anomaly);
          navigateFn?.(`/?section=${target}`);
          result = { navigated_to: target };
          break;
        }
        case "mark_resolved":
        case "mark_ignored": {
          const status = actionType === "mark_resolved" ? "resolved" : "ignored";
          result = { new_status: status };
          break;
        }
        case "send_sms": {
          // Log the intention — SMS sending requires provider integration
          toast.info("Envoi SMS planifié (intégration SMS requise)");
          result = { planned: true };
          break;
        }
      }

      await logAction(anomaly, actionType, result);
      return { actionType, result };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ia-action-logs"] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export interface InlineAction {
  type: QuickActionType;
  label: string;
  icon: string; // lucide icon name
  variant?: "default" | "outline" | "destructive" | "secondary";
  confirmation?: string;
}

export function getInlineActions(anomaly: Anomaly): InlineAction[] {
  const actions: InlineAction[] = [];

  // Always offer navigation
  actions.push({ type: "open_filtered_view", label: "Voir", icon: "eye", variant: "outline" });

  switch (anomaly.category) {
    case "prospects":
      actions.push({ type: "create_tasks", label: "Tâches", icon: "list-todo", confirmation: `Créer des tâches de relance pour ${anomaly.affected_count} prospect(s) ?` });
      actions.push({ type: "send_email", label: "Email", icon: "mail", confirmation: `Envoyer un email de relance à ${anomaly.affected_count} contact(s) ?` });
      actions.push({ type: "open_whatsapp", label: "WhatsApp", icon: "message-circle", variant: "outline" });
      actions.push({ type: "log_phone_call", label: "Appel", icon: "phone", variant: "outline" });
      break;
    case "paiements":
      actions.push({ type: "send_email", label: "Relance", icon: "mail", confirmation: `Envoyer un email de relance paiement à ${anomaly.affected_count} contact(s) ?` });
      actions.push({ type: "create_tasks", label: "Suivi", icon: "list-todo" });
      actions.push({ type: "log_phone_call", label: "Appel", icon: "phone", variant: "outline" });
      break;
    case "sessions":
      actions.push({ type: "send_email", label: "Recruter", icon: "send", confirmation: `Envoyer un email de recrutement ?` });
      actions.push({ type: "create_tasks", label: "Planifier", icon: "list-todo" });
      break;
    case "administratif":
    case "qualite_data":
      actions.push({ type: "create_tasks", label: "Tâches", icon: "list-todo" });
      actions.push({ type: "send_email", label: "Demander", icon: "mail", confirmation: `Envoyer un email demandant les infos manquantes ?` });
      break;
    default:
      actions.push({ type: "create_tasks", label: "Tâches", icon: "list-todo" });
  }

  return actions;
}
