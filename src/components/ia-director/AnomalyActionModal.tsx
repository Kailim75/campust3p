// ═══════════════════════════════════════════════════════════════
// IA Director — Anomaly Action Modal
// Displays affected records and proposes context-specific actions
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  CheckCircle2, Clock, AlertTriangle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Anomaly, AnomalyStatus } from "./audit/types";

// ── Context-specific actions per anomaly category ──
interface ContextAction {
  id: string;
  label: string;
  description: string;
  icon: typeof Play;
  actionType: string;
  confirmation_required: boolean;
  variant?: "default" | "outline" | "secondary" | "destructive";
}

function getContextActions(anomaly: Anomaly): ContextAction[] {
  const base: ContextAction[] = [];

  switch (anomaly.category) {
    case "prospects":
      if (anomaly.id.includes("pipeline") || anomaly.id.includes("sans-relance") || anomaly.id.includes("chaud")) {
        base.push(
          { id: "open_prospects", label: "Ouvrir liste prospects filtrée", description: "Afficher les prospects concernés dans le CRM", icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false },
          { id: "create_relance_tasks", label: "Créer tâches de relance en masse", description: `Créer ${anomaly.affected_count} tâche(s) de suivi`, icon: ListTodo, actionType: "create_task", confirmation_required: true },
          { id: "send_relance_email", label: "Générer email relance (pré-rempli)", description: "Préparer un email de relance groupé", icon: Mail, actionType: "send_email", confirmation_required: true },
          { id: "schedule_campaign", label: "Programmer campagne automatique", description: "Planifier une séquence de relance automatisée", icon: Calendar, actionType: "schedule_campaign", confirmation_required: true },
        );
      }
      if (anomaly.id.includes("triple-relance")) {
        base.push(
          { id: "switch_sms", label: "Tenter relance SMS", description: "Changer d'approche avec un SMS", icon: MessageSquare, actionType: "send_sms", confirmation_required: true },
          { id: "archive_cold", label: "Archiver les prospects froids", description: "Marquer comme perdus les prospects sans réponse", icon: Archive, actionType: "bulk_update", confirmation_required: true, variant: "destructive" },
        );
      }
      break;

    case "paiements":
      base.push(
        { id: "open_unpaid", label: "Ouvrir liste stagiaires concernés", description: "Afficher les factures impayées", icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false },
        { id: "send_payment_email", label: "Générer email relance paiement", description: "Envoyer un rappel de paiement par email", icon: Mail, actionType: "send_email", confirmation_required: true },
        { id: "send_payment_sms", label: "Envoyer SMS de rappel", description: "Relancer par SMS les débiteurs", icon: MessageSquare, actionType: "send_sms", confirmation_required: true },
        { id: "create_accounting_task", label: "Créer tâche suivi comptable", description: "Ajouter une tâche de relance comptable", icon: ListTodo, actionType: "create_task", confirmation_required: false },
      );
      break;

    case "sessions":
      base.push(
        { id: "open_sessions", label: "Ouvrir les sessions concernées", description: "Voir les sessions en détail", icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false },
        { id: "send_recruitment_email", label: "Lancer campagne de recrutement", description: "Envoyer un email aux prospects tièdes", icon: Send, actionType: "send_email", confirmation_required: true },
        { id: "suggest_session", label: "Proposer une session alternative", description: "Recommander un autre créneau", icon: Calendar, actionType: "schedule_session_suggestion", confirmation_required: false },
      );
      break;

    case "administratif":
      base.push(
        { id: "open_incomplete", label: "Ouvrir les dossiers incomplets", description: "Filtrer les contacts avec infos manquantes", icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false },
        { id: "send_completion_email", label: "Demander complétion par email", description: "Envoyer un email demandant les infos manquantes", icon: Mail, actionType: "send_email", confirmation_required: true },
        { id: "create_completion_tasks", label: "Créer tâches de complétion", description: "Ajouter des rappels pour chaque dossier", icon: ListTodo, actionType: "create_task", confirmation_required: false },
      );
      break;

    case "qualite_data":
      base.push(
        { id: "open_data_issues", label: "Ouvrir la liste filtrée", description: "Voir les contacts avec problèmes de données", icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false },
        { id: "create_cleanup_task", label: "Créer tâche de nettoyage", description: "Planifier un nettoyage des données", icon: ListTodo, actionType: "create_task", confirmation_required: false },
      );
      if (anomaly.id.includes("doublon")) {
        base.push(
          { id: "merge_duplicates", label: "Fusionner en masse", description: "Fusionner les doublons détectés", icon: Users, actionType: "bulk_update", confirmation_required: true, variant: "destructive" },
        );
      }
      break;

    default:
      base.push(
        { id: "open_view", label: "Voir les enregistrements", description: "Ouvrir la vue filtrée", icon: ExternalLink, actionType: "open_filtered_view", confirmation_required: false },
      );
  }

  return base;
}

const statusConfig: Record<AnomalyStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  open: { label: "Ouverte", icon: AlertTriangle, className: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  in_progress: { label: "En cours", icon: Clock, className: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  resolved: { label: "Résolue", icon: CheckCircle2, className: "text-green-500 bg-green-500/10 border-green-500/20" },
  ignored: { label: "Ignorée", icon: EyeOff, className: "text-muted-foreground bg-muted/50 border-border" },
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

  if (!anomaly) return null;

  const actions = getContextActions(anomaly);
  const currentStatus = anomaly.status || "open";
  const sCfg = statusConfig[currentStatus];
  const StatusIcon = sCfg.icon;

  const handleExecute = (action: ContextAction) => {
    if (action.confirmation_required) {
      setConfirmAction(action);
    } else {
      onExecuteAction(
        anomaly.id,
        action.actionType,
        { label: action.label, description: action.description, affected_count: anomaly.affected_count },
        anomaly.affected_records,
        anomaly.title
      );
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    onExecuteAction(
      anomaly.id,
      confirmAction.actionType,
      { label: confirmAction.label, description: confirmAction.description, affected_count: anomaly.affected_count },
      anomaly.affected_records,
      anomaly.title
    );
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
            </div>
            <DialogDescription className="text-sm">
              {anomaly.description}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 pb-4">
              {/* ── Metrics ── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">{anomaly.affected_count}</p>
                  <p className="text-[10px] text-muted-foreground">Enregistrement(s)</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {anomaly.impact_estime_euros > 0
                      ? `${anomaly.impact_estime_euros.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`
                      : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Impact estimé</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">{anomaly.priority_score}</p>
                  <p className="text-[10px] text-muted-foreground">Priorité</p>
                </div>
              </div>

              <Separator />

              {/* ── Statut ── */}
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

              {/* ── Actions disponibles ── */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Actions disponibles ({actions.length})
                </p>
                <div className="space-y-2">
                  {actions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <div
                        key={action.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <ActionIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{action.label}</p>
                          <p className="text-[10px] text-muted-foreground">{action.description}</p>
                        </div>
                        <Button
                          variant={action.variant === "destructive" ? "destructive" : "secondary"}
                          size="sm"
                          className="h-8 text-xs gap-1.5 shrink-0"
                          onClick={() => handleExecute(action)}
                          disabled={isExecuting}
                        >
                          {isExecuting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          Exécuter
                          {action.confirmation_required && (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── IDs des enregistrements affectés ── */}
              {anomaly.affected_records.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      IDs des enregistrements ({anomaly.affected_records.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-auto">
                      {anomaly.affected_records.slice(0, 20).map((id) => (
                        <Badge key={id} variant="outline" className="text-[9px] font-mono">
                          {id.substring(0, 8)}…
                        </Badge>
                      ))}
                      {anomaly.affected_records.length > 20 && (
                        <Badge variant="outline" className="text-[9px]">
                          +{anomaly.affected_records.length - 20} autres
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation dialog ── */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous exécuter : <strong>{confirmAction?.label}</strong> ?
              <br />
              <span className="text-muted-foreground text-xs mt-1 block">
                {confirmAction?.description}
              </span>
              <br />
              Cette action sera loggée et tracée. Elle concerne <strong>{anomaly.affected_count}</strong> enregistrement(s).
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
