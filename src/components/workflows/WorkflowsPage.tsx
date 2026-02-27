import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, 
  Workflow, 
  Trash2, 
  Edit, 
  History,
  Zap,
  Mail,
  Bell,
  RefreshCw,
  FileText,
  Search,
  Copy,
  Play,
  LayoutTemplate,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useWorkflows, useAllWorkflowExecutions, TRIGGER_TYPES, ACTION_TYPES, WORKFLOW_TEMPLATES } from '@/hooks/useWorkflows';
import { WorkflowFormDialog } from './WorkflowFormDialog';
import { WorkflowExecutionsSheet } from './WorkflowExecutionsSheet';
import { WorkflowTemplatesDialog } from './WorkflowTemplatesDialog';
import { format, isToday, subDays } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { useExecuteWorkflow } from '@/hooks/useWorkflows';

const ACTION_ICONS: Record<string, any> = {
  send_email: Mail,
  create_notification: Bell,
  update_status: RefreshCw,
  create_historique: FileText,
  add_delay: Clock,
  webhook: Globe
};

export function WorkflowsPage() {
  const { workflows, isLoading, toggleWorkflow, deleteWorkflow, duplicateWorkflow } = useWorkflows();
  const { data: allExecutions } = useAllWorkflowExecutions();
  const executeWorkflow = useExecuteWorkflow();
  const [formOpen, setFormOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [executionsOpen, setExecutionsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTrigger, setFilterTrigger] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('workflows');

  // Stats
  const stats = useMemo(() => {
    const total = workflows?.length || 0;
    const actifs = workflows?.filter(w => w.actif).length || 0;
    const todayExecutions = allExecutions?.filter(e => isToday(new Date(e.started_at))).length || 0;
    const recentExecutions = allExecutions?.filter(e => new Date(e.started_at) > subDays(new Date(), 7)) || [];
    const successRate = recentExecutions.length > 0
      ? Math.round((recentExecutions.filter(e => e.status === 'completed').length / recentExecutions.length) * 100)
      : 0;
    const failedToday = allExecutions?.filter(e => isToday(new Date(e.started_at)) && e.status === 'failed').length || 0;

    return { total, actifs, todayExecutions, successRate, failedToday, recentTotal: recentExecutions.length };
  }, [workflows, allExecutions]);

  // Filtered workflows
  const filteredWorkflows = useMemo(() => {
    if (!workflows) return [];
    return workflows.filter(w => {
      const matchesSearch = searchQuery === '' || 
        w.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && w.actif) || 
        (filterStatus === 'inactive' && !w.actif);
      const matchesTrigger = filterTrigger === 'all' || w.trigger_type === filterTrigger;
      return matchesSearch && matchesStatus && matchesTrigger;
    });
  }, [workflows, searchQuery, filterStatus, filterTrigger]);

  // Execution counts per workflow
  const executionCounts = useMemo(() => {
    const counts: Record<string, { total: number; completed: number; failed: number; lastRun?: string }> = {};
    allExecutions?.forEach(e => {
      if (!counts[e.workflow_id]) {
        counts[e.workflow_id] = { total: 0, completed: 0, failed: 0 };
      }
      counts[e.workflow_id].total++;
      if (e.status === 'completed') counts[e.workflow_id].completed++;
      if (e.status === 'failed') counts[e.workflow_id].failed++;
      if (!counts[e.workflow_id].lastRun || new Date(e.started_at) > new Date(counts[e.workflow_id].lastRun!)) {
        counts[e.workflow_id].lastRun = e.started_at;
      }
    });
    return counts;
  }, [allExecutions]);

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

  const handleDuplicate = (workflow: any) => {
    duplicateWorkflow.mutate(workflow);
  };

  const handleTestWorkflow = async (workflow: any) => {
    try {
      toast.info('Test du workflow en cours...');
      await executeWorkflow.mutateAsync({
        trigger_type: workflow.trigger_type,
        trigger_data: { test: true, workflow_name: workflow.nom },
        workflow_id: workflow.id
      });
      toast.success('Workflow testé avec succès');
    } catch (error: any) {
      toast.error(`Erreur lors du test : ${error.message}`);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedWorkflow({
      nom: template.nom,
      description: template.description,
      actif: true,
      trigger_type: template.trigger_type,
      trigger_conditions: {},
      actions: template.actions,
    });
    setTemplatesOpen(false);
    setFormOpen(true);
  };

  const getTriggerLabel = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  };

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            Workflows Automatisés
          </h1>
          <p className="text-muted-foreground">
            Automatisez vos processus métier avec des déclencheurs et des actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => { setSelectedWorkflow(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.actifs}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayExecutions}</p>
                <p className="text-xs text-muted-foreground">Exécutions aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
                <p className="text-xs text-muted-foreground">Taux de succès (7j)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failedToday}</p>
                <p className="text-xs text-muted-foreground">Échecs aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows">
            <Workflow className="h-4 w-4 mr-1" />
            Workflows ({filteredWorkflows.length})
          </TabsTrigger>
          <TabsTrigger value="executions">
            <Activity className="h-4 w-4 mr-1" />
            Journal d'exécution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un workflow..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTrigger} onValueChange={setFilterTrigger}>
              <SelectTrigger className="w-[200px]">
                <Zap className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Déclencheur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les déclencheurs</SelectItem>
                {TRIGGER_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workflow Cards */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-24 bg-muted" />
                  <CardContent className="h-32" />
                </Card>
              ))}
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery || filterStatus !== 'all' || filterTrigger !== 'all'
                    ? 'Aucun workflow trouvé'
                    : 'Aucun workflow configuré'}
                </h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  {searchQuery || filterStatus !== 'all' || filterTrigger !== 'all'
                    ? 'Essayez de modifier vos filtres de recherche.'
                    : 'Automatisez vos processus en créant un workflow ou en utilisant un template prédéfini.'}
                </p>
                {!searchQuery && filterStatus === 'all' && filterTrigger === 'all' && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
                      <LayoutTemplate className="h-4 w-4 mr-2" />
                      Utiliser un template
                    </Button>
                    <Button onClick={() => setFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un workflow
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWorkflows.map((workflow) => {
                const execData = executionCounts[workflow.id];
                return (
                  <Card key={workflow.id} className={`transition-all hover:shadow-md ${!workflow.actif ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base truncate">{workflow.nom}</CardTitle>
                          </div>
                          {workflow.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
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
                    <CardContent className="space-y-3">
                      {/* Trigger */}
                      <div>
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Zap className="h-3 w-3" />
                          {getTriggerLabel(workflow.trigger_type)}
                        </Badge>
                      </div>

                      {/* Actions flow */}
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          {workflow.actions.length} action{workflow.actions.length > 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {workflow.actions.map((action, idx) => {
                            const Icon = ACTION_ICONS[action.type] || Zap;
                            return (
                              <TooltipProvider key={idx}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="secondary" className="gap-1 text-xs px-1.5 py-0.5">
                                        <Icon className="h-3 w-3" />
                                      </Badge>
                                      {idx < workflow.actions.length - 1 && (
                                        <span className="text-muted-foreground text-xs">→</span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {getActionLabel(action.type)}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      </div>

                      {/* Execution stats */}
                      {execData && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {execData.total} exéc.
                          </span>
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            {execData.completed}
                          </span>
                          {execData.failed > 0 && (
                            <span className="flex items-center gap-1 text-destructive">
                              <XCircle className="h-3 w-3" />
                              {execData.failed}
                            </span>
                          )}
                          {execData.lastRun && (
                            <span className="ml-auto text-[10px]">
                              {format(new Date(execData.lastRun), 'dd/MM HH:mm', { locale: fr })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="text-[10px] text-muted-foreground">
                        Créé le {format(new Date(workflow.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 pt-2 border-t">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleTestWorkflow(workflow)}>
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tester</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewExecutions(workflow)}>
                                <History className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Historique</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(workflow)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Dupliquer</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(workflow)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Modifier</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(workflow.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Supprimer</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Dernières exécutions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!allExecutions || allExecutions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune exécution enregistrée
                </div>
              ) : (
                <div className="space-y-2">
                  {allExecutions.slice(0, 25).map((execution) => {
                    const wf = workflows?.find(w => w.id === execution.workflow_id);
                    const statusConfig: Record<string, { label: string; color: string; Icon: any }> = {
                      pending: { label: 'En attente', color: 'text-muted-foreground', Icon: Clock },
                      running: { label: 'En cours', color: 'text-primary', Icon: RefreshCw },
                      completed: { label: 'Terminé', color: 'text-primary', Icon: CheckCircle },
                      failed: { label: 'Échoué', color: 'text-destructive', Icon: XCircle },
                    };
                    const s = statusConfig[execution.status] || statusConfig.pending;
                    
                    return (
                      <div key={execution.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <s.Icon className={`h-4 w-4 ${s.color} flex-shrink-0 ${execution.status === 'running' ? 'animate-spin' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{wf?.nom || 'Workflow inconnu'}</p>
                          {execution.error_message && (
                            <p className="text-xs text-destructive truncate">{execution.error_message}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-xs ${s.color}`}>
                          {s.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(execution.started_at), 'dd/MM HH:mm', { locale: fr })}
                        </span>
                        {execution.completed_at && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000)}s
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WorkflowFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        workflow={selectedWorkflow}
      />

      <WorkflowTemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelect={handleTemplateSelect}
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
