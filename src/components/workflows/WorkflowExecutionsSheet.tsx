import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkflowExecutions, Workflow } from '@/hooks/useWorkflows';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: Workflow | null;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', icon: Clock, variant: 'outline' as const },
  running: { label: 'En cours', icon: Loader2, variant: 'secondary' as const },
  completed: { label: 'Terminé', icon: CheckCircle, variant: 'default' as const },
  failed: { label: 'Échoué', icon: XCircle, variant: 'destructive' as const }
};

export function WorkflowExecutionsSheet({ open, onOpenChange, workflow }: Props) {
  const { data: executions, isLoading } = useWorkflowExecutions(workflow?.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            Historique d'exécution
            {workflow && <span className="font-normal text-muted-foreground ml-2">— {workflow.nom}</span>}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : executions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune exécution enregistrée
            </div>
          ) : (
            <div className="space-y-4">
              {executions?.map((execution) => {
                const statusConfig = STATUS_CONFIG[execution.status];
                const Icon = statusConfig.icon;

                return (
                  <div 
                    key={execution.id} 
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={statusConfig.variant} className="gap-1">
                        <Icon className={`h-3 w-3 ${execution.status === 'running' ? 'animate-spin' : ''}`} />
                        {statusConfig.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(execution.started_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </span>
                    </div>

                    {execution.error_message && (
                      <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                        {execution.error_message}
                      </div>
                    )}

                    {execution.result && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Résultat :</span>
                        <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto text-xs">
                          {JSON.stringify(execution.result, null, 2)}
                        </pre>
                      </div>
                    )}

                    {execution.trigger_data && Object.keys(execution.trigger_data).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Données du déclencheur
                        </summary>
                        <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(execution.trigger_data, null, 2)}
                        </pre>
                      </details>
                    )}

                    {execution.completed_at && (
                      <div className="text-xs text-muted-foreground">
                        Durée : {Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000)}s
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
