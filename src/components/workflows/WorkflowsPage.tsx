import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Workflow, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  History,
  Zap,
  Mail,
  Bell,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useWorkflows, useWorkflowExecutions, TRIGGER_TYPES, ACTION_TYPES } from '@/hooks/useWorkflows';
import { WorkflowFormDialog } from './WorkflowFormDialog';
import { WorkflowExecutionsSheet } from './WorkflowExecutionsSheet';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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

const ACTION_ICONS: Record<string, any> = {
  send_email: Mail,
  create_notification: Bell,
  update_status: RefreshCw,
  create_historique: FileText
};

export function WorkflowsPage() {
  const { workflows, isLoading, toggleWorkflow, deleteWorkflow } = useWorkflows();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [executionsOpen, setExecutionsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

  const handleEdit = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setFormOpen(true);
  };

  const handleViewExecutions = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setExecutionsOpen(true);
  };

  const handleDelete = (id: string) => {
    setWorkflowToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (workflowToDelete) {
      deleteWorkflow.mutate(workflowToDelete);
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const getTriggerLabel = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  };

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            Workflows Automatisés
          </h1>
          <p className="text-muted-foreground">
            Configurez des automatisations déclenchées par des événements
          </p>
        </div>
        <Button onClick={() => { setSelectedWorkflow(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted" />
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : workflows?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun workflow configuré</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre premier workflow pour automatiser vos processus
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows?.map((workflow) => (
            <Card key={workflow.id} className={!workflow.actif ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{workflow.nom}</CardTitle>
                    {workflow.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {workflow.description}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={workflow.actif}
                    onCheckedChange={(checked) => 
                      toggleWorkflow.mutate({ id: workflow.id, actif: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Trigger */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    {getTriggerLabel(workflow.trigger_type)}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Actions :</span>
                  <div className="flex flex-wrap gap-1">
                    {workflow.actions.map((action, idx) => {
                      const Icon = ACTION_ICONS[action.type] || Zap;
                      return (
                        <Badge key={idx} variant="secondary" className="gap-1">
                          <Icon className="h-3 w-3" />
                          {getActionLabel(action.type)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-xs text-muted-foreground">
                  Créé le {format(new Date(workflow.created_at), 'dd MMM yyyy', { locale: fr })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewExecutions(workflow)}
                  >
                    <History className="h-4 w-4 mr-1" />
                    Historique
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(workflow)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WorkflowFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        workflow={selectedWorkflow}
      />

      <WorkflowExecutionsSheet
        open={executionsOpen}
        onOpenChange={setExecutionsOpen}
        workflow={selectedWorkflow}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce workflow ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les exécutions passées seront également supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
