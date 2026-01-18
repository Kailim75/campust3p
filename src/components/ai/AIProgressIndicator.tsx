import { Progress } from '@/components/ui/progress';
import { Bot, Search, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProgressStep = 
  | 'idle'
  | 'sending'
  | 'analyzing'
  | 'executing'
  | 'responding'
  | 'done';

interface AIProgressIndicatorProps {
  step: ProgressStep;
  currentTool?: string;
  className?: string;
}

const STEP_CONFIG: Record<ProgressStep, { label: string; progress: number; icon: React.ComponentType<any> }> = {
  idle: { label: '', progress: 0, icon: Bot },
  sending: { label: 'Envoi de la demande...', progress: 15, icon: Loader2 },
  analyzing: { label: 'Analyse de la demande...', progress: 35, icon: Search },
  executing: { label: 'Exécution des actions...', progress: 65, icon: Zap },
  responding: { label: 'Génération de la réponse...', progress: 85, icon: Bot },
  done: { label: 'Terminé', progress: 100, icon: CheckCircle2 },
};

const TOOL_LABELS: Record<string, string> = {
  create_contact: 'Création du contact',
  search_contacts: 'Recherche de contacts',
  update_contact: 'Mise à jour du contact',
  list_sessions: 'Chargement des sessions',
  create_session: 'Création de la session',
  enroll_contact_to_session: 'Inscription en cours',
  list_factures: 'Chargement des factures',
  create_facture: 'Création de la facture',
  register_payment: 'Enregistrement du paiement',
  send_email: 'Envoi de l\'email',
  create_notification: 'Création de la notification',
  get_dashboard_stats: 'Calcul des statistiques',
  add_contact_historique: 'Ajout à l\'historique'
};

export function AIProgressIndicator({ step, currentTool, className }: AIProgressIndicatorProps) {
  if (step === 'idle') return null;

  const config = STEP_CONFIG[step];
  const Icon = config.icon;
  const toolLabel = currentTool ? TOOL_LABELS[currentTool] : null;

  return (
    <div className={cn("space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20", className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn(
          "h-4 w-4 text-primary",
          step !== 'done' && "animate-spin"
        )} />
        <span className="text-sm font-medium text-foreground">
          {toolLabel || config.label}
        </span>
      </div>
      <Progress value={config.progress} className="h-1.5" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Traitement IA</span>
        <span>{config.progress}%</span>
      </div>
    </div>
  );
}
