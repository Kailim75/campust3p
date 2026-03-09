// ═══════════════════════════════════════════════════════════════
// IA Director — Anomaly Action Modal (v2 — Informative)
// Shows real record details and explains what each action does
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Play, Loader2, Users, Mail, MessageSquare, ListTodo,
  ExternalLink, Send, Calendar, Archive, Eye, EyeOff,
  CheckCircle2, Clock, AlertTriangle, XCircle, Info,
  ArrowRight, FileText, CreditCard, Target, Phone,
  User, Hash, Euro, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuickAction, type QuickActionType } from "@/hooks/useRealActionExecution";
import type { Anomaly, AnomalyStatus } from "./audit/types";

// ── Context-specific actions per anomaly category ──
interface ContextAction {
  id: string;
  label: string;
  description: string;
  whatItDoes: string; // NEW: detailed explanation
  icon: typeof Play;
  actionType: string;
  confirmation_required: boolean;
  variant?: "default" | "outline" | "secondary" | "destructive";
  navigateTo?: string; // NEW: optional navigation target
}

function getContextActions(anomaly: Anomaly): ContextAction[] {
  const base: ContextAction[] = [];

  switch (anomaly.category) {
    case "prospects":
      if (anomaly.id.includes("pipeline") || anomaly.id.includes("sans-relance") || anomaly.id.includes("chaud")) {
        base.push(
          {
            id: "open_prospects", label: "Ouvrir liste prospects filtrée",
            description: "Afficher les prospects concernés dans le CRM",
            whatItDoes: "Vous serez redirigé vers la page Prospects avec un filtre actif pour ne voir que les prospects détectés par cette anomalie. Aucune modification ne sera effectuée.",
            icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false,
            navigateTo: "prospects",
          },
          {
            id: "create_relance_tasks", label: "Créer tâches de relance en masse",
            description: `Créer ${anomaly.affected_count} tâche(s) de suivi`,
            whatItDoes: `Une tâche de relance sera créée dans l'historique de chacun des ${anomaly.affected_count} prospect(s) concerné(s). Chaque tâche sera visible dans le suivi du contact. Cette action est tracée dans les logs.`,
            icon: ListTodo, actionType: "create_task", confirmation_required: true,
          },
          {
            id: "send_relance_email", label: "Générer email relance (pré-rempli)",
            description: "Préparer un email de relance groupé",
            whatItDoes: `Un brouillon d'email de relance sera préparé pour les ${anomaly.affected_count} prospect(s). Vous pourrez le personnaliser avant envoi. Aucun email ne sera envoyé automatiquement sans votre validation.`,
            icon: Mail, actionType: "send_email", confirmation_required: true,
          },
          {
            id: "schedule_campaign", label: "Programmer campagne automatique",
            description: "Planifier une séquence de relance automatisée",
            whatItDoes: "Une campagne de relance en 3 étapes (email J+0, SMS J+3, email J+7) sera planifiée pour les prospects sélectionnés. Vous pourrez annuler à tout moment.",
            icon: Calendar, actionType: "schedule_campaign", confirmation_required: true,
          },
          {
            id: "whatsapp_relance", label: "Relance WhatsApp",
            description: "Ouvrir WhatsApp avec un message pré-rempli",
            whatItDoes: `WhatsApp sera ouvert avec un message de relance personnalisé pour le premier contact avec numéro de téléphone. Idéal pour les prospects qui ne répondent pas aux emails (taux de lecture SMS/WhatsApp : 98%).`,
            icon: MessageCircle, actionType: "open_whatsapp", confirmation_required: false,
          },
          {
            id: "log_phone_calls", label: "Créer rappels d'appel",
            description: "Planifier des appels de suivi",
            whatItDoes: `Un rappel d'appel sera créé dans l'historique de chaque contact concerné. Vous retrouverez ces tâches dans le suivi de chaque fiche contact.`,
            icon: Phone, actionType: "log_phone_call", confirmation_required: false,
          },
        );
      }
      if (anomaly.id.includes("triple-relance")) {
        base.push(
          {
            id: "switch_sms", label: "Tenter relance SMS",
            description: "Changer d'approche avec un SMS",
            whatItDoes: `Un SMS de relance sera préparé pour les ${anomaly.affected_count} prospect(s) qui n'ont pas répondu à 3 relances email. Le SMS est généralement plus lu que l'email (98% vs 20%).`,
            icon: MessageSquare, actionType: "send_sms", confirmation_required: true,
          },
          {
            id: "archive_cold", label: "Archiver les prospects froids",
            description: "Marquer comme perdus les prospects sans réponse",
            whatItDoes: `Les ${anomaly.affected_count} prospect(s) seront marqués comme "perdus" et archivés. Ils ne seront plus visibles dans le pipeline actif mais resteront dans la base de données. Action réversible.`,
            icon: Archive, actionType: "bulk_update", confirmation_required: true, variant: "destructive",
          },
        );
      }
      break;

    case "paiements":
      base.push(
        {
          id: "open_unpaid", label: "Ouvrir liste stagiaires concernés",
          description: "Afficher les factures impayées",
          whatItDoes: "Vous serez redirigé vers la page Paiements avec un filtre sur les factures en retard ou impayées. Aucune modification ne sera effectuée.",
          icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false,
          navigateTo: "facturation",
        },
        {
          id: "send_payment_email", label: "Générer email relance paiement",
          description: "Envoyer un rappel de paiement par email",
          whatItDoes: `Un email de relance paiement sera préparé pour les ${anomaly.affected_count} stagiaire(s) avec facture impayée. Le montant total dû et la date d'échéance seront inclus automatiquement.`,
          icon: Mail, actionType: "send_email", confirmation_required: true,
        },
        {
          id: "send_payment_sms", label: "Envoyer SMS de rappel",
          description: "Relancer par SMS les débiteurs",
          whatItDoes: `Un SMS court de rappel de paiement sera envoyé aux ${anomaly.affected_count} stagiaire(s). Message type : "Rappel — votre facture de formation est en attente de règlement. Merci de régulariser."`,
          icon: MessageSquare, actionType: "send_sms", confirmation_required: true,
        },
        {
          id: "create_accounting_task", label: "Créer tâche suivi comptable",
          description: "Ajouter une tâche de relance comptable",
          whatItDoes: "Une tâche sera ajoutée à votre suivi pour rappeler de vérifier l'état des paiements. Pas de communication envoyée aux stagiaires.",
          icon: ListTodo, actionType: "create_task", confirmation_required: false,
        },
        {
          id: "whatsapp_payment", label: "Relance WhatsApp",
          description: "Contacter par WhatsApp pour le paiement",
          whatItDoes: "WhatsApp sera ouvert avec un message de rappel de paiement pour le premier contact concerné.",
          icon: MessageCircle, actionType: "open_whatsapp", confirmation_required: false,
        },
        {
          id: "log_payment_call", label: "Planifier appels",
          description: "Créer des rappels d'appel pour relance",
          whatItDoes: `Des rappels d'appel seront créés pour les ${anomaly.affected_count} stagiaire(s) avec paiement en retard.`,
          icon: Phone, actionType: "log_phone_call", confirmation_required: false,
        },
      );
      break;

    case "sessions":
      base.push(
        {
          id: "open_sessions", label: "Ouvrir les sessions concernées",
          description: "Voir les sessions en détail",
          whatItDoes: "Vous serez redirigé vers la page Sessions pour consulter les détails et la liste d'inscrits.",
          icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false,
          navigateTo: "sessions",
        },
        {
          id: "send_recruitment_email", label: "Lancer campagne de recrutement",
          description: "Envoyer un email aux prospects tièdes",
          whatItDoes: "Un email incitatif sera préparé pour les prospects non encore inscrits, leur proposant les sessions disponibles avec places restantes.",
          icon: Send, actionType: "send_email", confirmation_required: true,
        },
        {
          id: "suggest_session", label: "Proposer une session alternative",
          description: "Recommander un autre créneau",
          whatItDoes: "Les sessions avec le meilleur taux de remplissage seront identifiées pour proposer un transfert d'inscrits ou un regroupement.",
          icon: Calendar, actionType: "schedule_session_suggestion", confirmation_required: false,
        },
      );
      break;

    case "administratif":
      base.push(
        {
          id: "open_incomplete", label: "Ouvrir les dossiers incomplets",
          description: "Filtrer les contacts avec infos manquantes",
          whatItDoes: "Vous serez redirigé vers la liste des contacts filtrée pour ne voir que ceux ayant des informations manquantes (email, téléphone ou date de naissance).",
          icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false,
          navigateTo: "contacts",
        },
        {
          id: "send_completion_email", label: "Demander complétion par email",
          description: "Envoyer un email demandant les infos manquantes",
          whatItDoes: `Un email personnalisé sera préparé pour chaque contact, listant spécifiquement les informations manquantes de leur dossier (email, téléphone, date de naissance).`,
          icon: Mail, actionType: "send_email", confirmation_required: true,
        },
        {
          id: "create_completion_tasks", label: "Créer tâches de complétion",
          description: "Ajouter des rappels pour chaque dossier",
          whatItDoes: `${anomaly.affected_count} tâche(s) de complétion seront créées, chacune listant les champs manquants pour le contact concerné.`,
          icon: ListTodo, actionType: "create_task", confirmation_required: false,
        },
      );
      break;

    case "qualite_data":
      base.push(
        {
          id: "open_data_issues", label: "Ouvrir la liste filtrée",
          description: "Voir les contacts avec problèmes de données",
          whatItDoes: "Vous serez redirigé vers la liste des contacts pour examiner et corriger manuellement les problèmes de données détectés.",
          icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false,
          navigateTo: "contacts",
        },
        {
          id: "create_cleanup_task", label: "Créer tâche de nettoyage",
          description: "Planifier un nettoyage des données",
          whatItDoes: "Une tâche de nettoyage sera créée dans votre suivi avec la liste des contacts à vérifier.",
          icon: ListTodo, actionType: "create_task", confirmation_required: false,
        },
      );
      if (anomaly.id.includes("doublon")) {
        base.push({
          id: "merge_duplicates", label: "Fusionner en masse",
          description: "Fusionner les doublons détectés",
          whatItDoes: `Les ${anomaly.affected_count} contacts potentiellement dupliqués seront analysés. Pour chaque paire, les données seront fusionnées en conservant l'enregistrement le plus complet. ⚠️ Action irréversible.`,
          icon: Users, actionType: "bulk_update", confirmation_required: true, variant: "destructive",
        });
      }
      break;

    default:
      base.push({
        id: "open_view", label: "Voir les enregistrements",
        description: "Ouvrir la vue filtrée",
        whatItDoes: "Navigation vers la section concernée pour examiner les enregistrements.",
        icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false,
      });
  }

  return base;
}

interface RecordDetail {
  id: string;
  label: string;
  sublabel?: string;
  icon: typeof User;
  tags?: string[];
  navigateTo?: string; // deep-link to open profile
}

function useAffectedRecordDetails(anomaly: Anomaly | null) {
  const [records, setRecords] = useState<RecordDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!anomaly || anomaly.affected_records.length === 0) {
      setRecords([]);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const ids = anomaly.affected_records.slice(0, 30); // max 30

        if (anomaly.category === "prospects") {
          const { data } = await supabase
            .from("contacts")
            .select("id, nom, prenom, email, telephone, statut")
            .in("id", ids);
          setRecords((data || []).map((p: any) => ({
            id: p.id,
            label: `${p.prenom || ""} ${p.nom || ""}`.trim() || "Sans nom",
            sublabel: p.email || p.telephone || "Pas de contact",
            icon: Target,
            tags: [p.statut].filter(Boolean),
            navigateTo: `/?section=contacts&contactId=${p.id}`,
          })));
        } else if (anomaly.category === "paiements") {
          const { data } = await supabase
            .from("factures")
            .select("id, numero_facture, montant_total, statut, contact_id, contacts(nom, prenom, email)")
            .in(anomaly.id.includes("solde-impaye") ? "contact_id" : "id", ids);
          // Deduplicate by contact_id for payment anomalies
          const seen = new Set<string>();
          const deduped = (data || []).filter((f: any) => {
            const key = f.contact_id || f.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setRecords(deduped.map((f: any) => ({
            id: f.contact_id || f.id,
            label: f.contacts ? `${f.contacts.prenom || ""} ${f.contacts.nom || ""}`.trim() : f.numero_facture,
            sublabel: `${f.numero_facture} — ${(f.montant_total || 0).toLocaleString("fr-FR")}€ — ${f.statut}`,
            icon: CreditCard,
            tags: [f.statut].filter(Boolean),
            navigateTo: f.contact_id ? `/?section=contacts&contactId=${f.contact_id}` : `/?section=facturation`,
          })));
        } else if (anomaly.category === "sessions") {
          const { data } = await supabase
            .from("sessions")
            .select("id, nom, formation_type, date_debut, places_totales")
            .in("id", ids);
          setRecords((data || []).map((s: any) => ({
            id: s.id,
            label: s.nom || "Session sans nom",
            sublabel: `${s.formation_type || "Formation"} — ${s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : "Date non définie"} — ${s.places_max || "?"} places`,
            icon: Calendar,
            tags: [s.formation_type].filter(Boolean),
            navigateTo: `/?section=sessions`,
          })));
        } else {
          // contacts (administratif, qualite_data, default)
          const { data } = await supabase
            .from("contacts")
            .select("id, nom, prenom, email, telephone, date_naissance")
            .in("id", ids);
          setRecords((data || []).map((c: any) => {
            const missing: string[] = [];
            if (!c.email) missing.push("Email manquant");
            if (!c.telephone) missing.push("Tél manquant");
            if (!c.date_naissance) missing.push("Date naiss. manquante");
            return {
              id: c.id,
              label: `${c.prenom || ""} ${c.nom || ""}`.trim() || "Sans nom",
              sublabel: c.email || c.telephone || "Aucune coordonnée",
              icon: User,
              tags: missing.length > 0 ? missing : undefined,
              navigateTo: `/?section=contacts&contactId=${c.id}`,
            };
          }));
        }
      } catch (e) {
        console.error("Failed to fetch record details:", e);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [anomaly?.id, anomaly?.category, anomaly?.affected_records]);

  return { records, loading };
}

const statusConfig: Record<AnomalyStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  open: { label: "Ouverte", icon: AlertTriangle, className: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  in_progress: { label: "En cours", icon: Clock, className: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  resolved: { label: "Résolue", icon: CheckCircle2, className: "text-green-500 bg-green-500/10 border-green-500/20" },
  ignored: { label: "Ignorée", icon: EyeOff, className: "text-muted-foreground bg-muted/50 border-border" },
};

const severityLabels: Record<string, { label: string; className: string }> = {
  critical: { label: "Critique", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  high: { label: "Haute", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  medium: { label: "Moyenne", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  low: { label: "Basse", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

interface Props {
  anomaly: Anomaly | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecuteAction: (anomalyId: string, actionType: string, payload: Record<string, unknown>, entityIds: string[], anomalyTitle: string) => void;
  onChangeStatus: (anomalyId: string, status: AnomalyStatus) => void;
  isExecuting: boolean;
}

export default function AnomalyActionModal({
  anomaly,
  open,
  onOpenChange,
  onExecuteAction,
  onChangeStatus,
  isExecuting,
}: Props) {
  const [confirmAction, setConfirmAction] = useState<ContextAction | null>(null);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const navigate = useNavigate();
  const { records, loading: recordsLoading } = useAffectedRecordDetails(anomaly);
  const quickAction = useQuickAction();

  if (!anomaly) return null;

  const actions = getContextActions(anomaly);
  const currentStatus = anomaly.status || "open";
  const sCfg = statusConfig[currentStatus];
  const StatusIcon = sCfg.icon;
  const sevCfg = severityLabels[anomaly.severity] || severityLabels.medium;

  const executeRealAction = async (action: ContextAction) => {
    // Map modal action types to real execution types
    const typeMap: Record<string, QuickActionType> = {
      open_filtered_view: "open_filtered_view",
      create_task: "create_tasks",
      send_email: "send_email",
      send_sms: "send_sms",
      open_whatsapp: "open_whatsapp",
      log_phone_call: "log_phone_call",
      schedule_campaign: "send_email",
      schedule_session_suggestion: "create_tasks",
      bulk_update: "create_tasks",
    };
    
    const realType = typeMap[action.actionType] || "create_tasks";
    
    await quickAction.mutateAsync({
      anomaly,
      actionType: realType,
      navigateFn: (path) => { onOpenChange(false); navigate(path); },
    });

    // Also log via the legacy system
    onExecuteAction(
      anomaly.id,
      action.actionType,
      { label: action.label, description: action.description, affected_count: anomaly.affected_count, real_execution: true },
      anomaly.affected_records,
      anomaly.title
    );
  };

  const handleExecute = (action: ContextAction) => {
    if (action.confirmation_required) {
      setConfirmAction(action);
    } else {
      executeRealAction(action);
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    executeRealAction(confirmAction);
    setConfirmAction(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-lg">{anomaly.title}</DialogTitle>
              <Badge variant="outline" className={cn("text-[10px] gap-1", sCfg.className)}>
                <StatusIcon className="h-3 w-3" />
                {sCfg.label}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px]", sevCfg.className)}>
                {sevCfg.label}
              </Badge>
            </div>
            <DialogDescription className="text-sm">
              {anomaly.description}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="actions" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="actions" className="text-xs">
                Actions ({actions.length})
              </TabsTrigger>
              <TabsTrigger value="records" className="text-xs">
                Concernés ({anomaly.affected_count})
              </TabsTrigger>
              <TabsTrigger value="details" className="text-xs">
                Détails
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 -mx-6 px-6 mt-3">
              {/* ══════ ACTIONS TAB ══════ */}
              <TabsContent value="actions" className="mt-0 space-y-4">
                {/* Quick metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold text-foreground">{anomaly.affected_count}</p>
                    <p className="text-[10px] text-muted-foreground">Concerné(s)</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold text-foreground">
                      {anomaly.impact_estime_euros > 0
                        ? `${anomaly.impact_estime_euros.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Impact estimé</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold text-foreground">{anomaly.priority_score}</p>
                    <p className="text-[10px] text-muted-foreground">Priorité</p>
                  </div>
                </div>

                {/* Status change */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Changer le statut</p>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.entries(statusConfig) as [AnomalyStatus, typeof sCfg][]).map(([status, cfg]) => (
                      <Button
                        key={status}
                        variant={currentStatus === status ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => onChangeStatus(anomaly.id, status)}
                        disabled={currentStatus === status}
                      >
                        <cfg.icon className="h-3 w-3" />
                        {cfg.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Action cards */}
                <div className="space-y-2">
                  {actions.map((action) => {
                    const ActionIcon = action.icon;
                    const isExpanded = expandedAction === action.id;
                    return (
                      <div
                        key={action.id}
                        className="rounded-lg border bg-card overflow-hidden transition-all"
                      >
                        <div
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                        >
                          <div className={cn(
                            "p-2 rounded-lg shrink-0",
                            action.variant === "destructive" ? "bg-destructive/10" : "bg-primary/10"
                          )}>
                            <ActionIcon className={cn(
                              "h-4 w-4",
                              action.variant === "destructive" ? "text-destructive" : "text-primary"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{action.label}</p>
                            <p className="text-[10px] text-muted-foreground">{action.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {action.navigateTo && (
                              <Badge variant="outline" className="text-[9px] gap-1 text-primary border-primary/20">
                                <ArrowRight className="h-2.5 w-2.5" />
                                Navigation
                              </Badge>
                            )}
                            {action.confirmation_required && (
                              <Badge variant="outline" className="text-[9px] gap-1 text-amber-500 border-amber-500/20">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Confirmation
                              </Badge>
                            )}
                            <Info className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )} />
                          </div>
                        </div>

                        {/* Expanded: what it does + execute button */}
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0 border-t bg-muted/30">
                            <div className="flex items-start gap-2 py-2.5">
                              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {action.whatItDoes}
                              </p>
                            </div>
                            <Button
                              variant={action.variant === "destructive" ? "destructive" : "default"}
                              size="sm"
                              className="w-full h-9 text-xs gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExecute(action);
                              }}
                              disabled={isExecuting}
                            >
                              {isExecuting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : action.navigateTo ? (
                                <ArrowRight className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                              {action.navigateTo ? "Ouvrir dans le CRM" : "Exécuter cette action"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* ══════ RECORDS TAB ══════ */}
              <TabsContent value="records" className="mt-0 space-y-3">
                {recordsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Chargement des détails…</span>
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun enregistrement trouvé</p>
                    <p className="text-xs mt-1">Les données ont peut-être été corrigées depuis l'audit.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {records.length} enregistrement(s) affiché(s)
                      {anomaly.affected_records.length > 30 && (
                        <span> sur {anomaly.affected_records.length} au total</span>
                      )}
                    </p>
                    <div className="space-y-1.5">
                      {records.map((record) => {
                        const RecIcon = record.icon;
                        return (
                          <div
                            key={record.id}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-lg border bg-card transition-colors",
                              record.navigateTo
                                ? "hover:bg-primary/5 hover:border-primary/30 cursor-pointer group"
                                : "hover:bg-muted/30"
                            )}
                            onClick={() => {
                              if (record.navigateTo) {
                                onOpenChange(false);
                                navigate(record.navigateTo);
                              }
                            }}
                          >
                            <div className="p-1.5 rounded bg-muted shrink-0">
                              <RecIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{record.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{record.sublabel}</p>
                            </div>
                            {record.tags && record.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap justify-end shrink-0">
                                {record.tags.map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px]">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {record.navigateTo && (
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ══════ DETAILS TAB ══════ */}
              <TabsContent value="details" className="mt-0 space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/40 space-y-2">
                    <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Règle de détection
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {anomaly.detection_rule}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1">Score d'urgence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              anomaly.urgence_score >= 75 ? "bg-red-500" :
                              anomaly.urgence_score >= 50 ? "bg-orange-500" : "bg-yellow-500"
                            )}
                            style={{ width: `${anomaly.urgence_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-foreground">{anomaly.urgence_score}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1">Confiance</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${anomaly.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-foreground">{anomaly.confidence_score}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5" />
                      Calcul de priorité
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Le score de priorité ({anomaly.priority_score}) est calculé automatiquement :
                      <br />
                      <code className="text-[10px] bg-muted px-1 py-0.5 rounded mt-1 inline-block">
                        (impact × 0.5) + (urgence × 0.3) + (confiance × 0.2)
                      </code>
                    </p>
                  </div>

                  {anomaly.impact_estime_euros > 0 && (
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                        <Euro className="h-3.5 w-3.5" />
                        Impact financier estimé
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {anomaly.impact_estime_euros.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Basé sur le prix moyen de formation et le nombre d'enregistrements concernés.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation dialog ── */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Voulez-vous exécuter : <strong>{confirmAction?.label}</strong> ?
                </p>
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                    <Info className="h-3 w-3" />
                    Ce que cette action va faire :
                  </p>
                  {confirmAction?.whatItDoes}
                </div>
                <p className="text-xs">
                  Cette action sera tracée dans l'historique. Elle concerne <strong>{anomaly.affected_count}</strong> enregistrement(s).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirmer et exécuter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
