import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Zap, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkflows, TRIGGER_TYPES, ACTION_TYPES, WorkflowAction, Workflow } from '@/hooks/useWorkflows';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: Workflow | null;
}

export function WorkflowFormDialog({ open, onOpenChange, workflow }: Props) {
  const { createWorkflow, updateWorkflow } = useWorkflows();
  const { data: emailTemplates } = useEmailTemplates();
  
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [actif, setActif] = useState(true);
  const [triggerType, setTriggerType] = useState('');
  const [triggerConditions, setTriggerConditions] = useState<Record<string, any>>({});
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (workflow) {
      setNom(workflow.nom);
      setDescription(workflow.description || '');
      setActif(workflow.actif);
      setTriggerType(workflow.trigger_type);
      setTriggerConditions(workflow.trigger_conditions || {});
      setActions(workflow.actions || []);
      setExpandedActions(new Set(workflow.actions?.map((_, i) => i) || []));
    } else {
      setNom('');
      setDescription('');
      setActif(true);
      setTriggerType('');
      setTriggerConditions({});
      setActions([]);
      setExpandedActions(new Set());
    }
  }, [workflow, open]);

  const handleAddAction = () => {
    const newIndex = actions.length;
    setActions([...actions, { type: 'send_email', config: {} }]);
    setExpandedActions(prev => new Set([...prev, newIndex]));
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    setExpandedActions(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const handleActionChange = (index: number, field: string, value: any) => {
    const updated = [...actions];
    if (field === 'type') {
      updated[index] = { type: value, config: {} };
    } else {
      updated[index] = { 
        ...updated[index], 
        config: { ...updated[index].config, [field]: value } 
      };
    }
    setActions(updated);
  };

  const toggleActionExpand = (index: number) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;
    const updated = [...actions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setActions(updated);
  };

  const handleSubmit = () => {
    if (!nom || !triggerType || actions.length === 0) return;

    const data = {
      nom,
      description,
      actif,
      trigger_type: triggerType,
      trigger_conditions: triggerConditions,
      actions
    };

    if (workflow?.id) {
      updateWorkflow.mutate({ id: workflow.id, ...data });
    } else {
      createWorkflow.mutate(data);
    }

    onOpenChange(false);
  };

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type)?.label || type;
  };

  const renderActionConfig = (action: WorkflowAction, index: number) => {
    switch (action.type) {
      case 'send_email':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Template d'email</Label>
              <Select
                value={action.config.template_id || ''}
                onValueChange={(v) => handleActionChange(index, 'template_id', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner un template" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ou sujet personnalisé</Label>
              <Input
                className="h-9"
                value={action.config.subject || ''}
                onChange={(e) => handleActionChange(index, 'subject', e.target.value)}
                placeholder="Sujet (variables: {{prenom}}, {{nom}})"
              />
            </div>
            <div>
              <Label className="text-xs">Contenu</Label>
              <Textarea
                value={action.config.content || ''}
                onChange={(e) => handleActionChange(index, 'content', e.target.value)}
                placeholder="Contenu HTML de l'email"
                rows={3}
              />
            </div>
          </div>
        );

      case 'create_notification':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Titre</Label>
              <Input
                className="h-9"
                value={action.config.title || ''}
                onChange={(e) => handleActionChange(index, 'title', e.target.value)}
                placeholder="Titre de la notification"
              />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                value={action.config.message || ''}
                onChange={(e) => handleActionChange(index, 'message', e.target.value)}
                placeholder="Message de la notification"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={action.config.notification_type || 'info'}
                onValueChange={(v) => handleActionChange(index, 'notification_type', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                  <SelectItem value="success">Succès</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'update_status':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Table</Label>
              <Select
                value={action.config.table || ''}
                onValueChange={(v) => handleActionChange(index, 'table', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner une table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="factures">Factures</SelectItem>
                  <SelectItem value="devis">Devis</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nouveau statut</Label>
              <Input
                className="h-9"
                value={action.config.new_status || ''}
                onChange={(e) => handleActionChange(index, 'new_status', e.target.value)}
                placeholder="Valeur du nouveau statut"
              />
            </div>
          </div>
        );

      case 'create_historique':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Type d'entrée</Label>
              <Select
                value={action.config.type || 'note'}
                onValueChange={(v) => handleActionChange(index, 'type', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="appel">Appel</SelectItem>
                  <SelectItem value="rdv">Rendez-vous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Titre</Label>
              <Input
                className="h-9"
                value={action.config.titre || ''}
                onChange={(e) => handleActionChange(index, 'titre', e.target.value)}
                placeholder="Titre de l'entrée"
              />
            </div>
            <div>
              <Label className="text-xs">Contenu</Label>
              <Textarea
                value={action.config.contenu || ''}
                onChange={(e) => handleActionChange(index, 'contenu', e.target.value)}
                placeholder="Contenu de l'entrée"
                rows={2}
              />
            </div>
          </div>
        );

      case 'add_delay':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Délai (en minutes)</Label>
              <Input
                className="h-9"
                type="number"
                min={1}
                value={action.config.delay_minutes || ''}
                onChange={(e) => handleActionChange(index, 'delay_minutes', parseInt(e.target.value) || 0)}
                placeholder="60"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Ex: 60 = 1h, 1440 = 1 jour, 10080 = 1 semaine
              </p>
            </div>
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">URL du webhook</Label>
              <Input
                className="h-9"
                value={action.config.url || ''}
                onChange={(e) => handleActionChange(index, 'url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className="text-xs">Méthode HTTP</Label>
              <Select
                value={action.config.method || 'POST'}
                onValueChange={(v) => handleActionChange(index, 'method', v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Corps (JSON)</Label>
              <Textarea
                value={action.config.body || ''}
                onChange={(e) => handleActionChange(index, 'body', e.target.value)}
                placeholder='{"key": "{{value}}"}'
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workflow?.id ? 'Modifier le workflow' : 'Nouveau workflow'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="actif" className="text-sm">Workflow actif</Label>
              <Switch id="actif" checked={actif} onCheckedChange={setActif} />
            </div>
            <div>
              <Label htmlFor="nom" className="text-xs">Nom *</Label>
              <Input
                id="nom"
                className="h-9"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Email de bienvenue"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du workflow"
                rows={2}
              />
            </div>
          </div>

          {/* Trigger */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Déclencheur
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Quand déclencher ce workflow ?" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1">{t.category}</Badge>
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {triggerType && (
            <div className="flex justify-center">
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {/* Actions */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Actions ({actions.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={handleAddAction} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              {actions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Aucune action. Ajoutez-en au moins une.
                </p>
              ) : (
                actions.map((action, index) => (
                  <div key={index}>
                    {index > 0 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <Collapsible open={expandedActions.has(index)}>
                      <div className="border rounded-lg">
                        <CollapsibleTrigger asChild>
                          <div
                            className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleActionExpand(index)}
                          >
                            <Badge variant="secondary" className="text-[10px]">{index + 1}</Badge>
                            <span className="text-sm font-medium flex-1">{getActionLabel(action.type)}</span>
                            <div className="flex items-center gap-1">
                              {index > 0 && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveAction(index, 'up'); }}>
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                              )}
                              {index < actions.length - 1 && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveAction(index, 'down'); }}>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleRemoveAction(index); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              {expandedActions.has(index) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-3 pb-3 border-t pt-3 space-y-3">
                            <div>
                              <Label className="text-xs">Type d'action</Label>
                              <Select
                                value={action.type}
                                onValueChange={(v) => handleActionChange(index, 'type', v as any)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACTION_TYPES.map((a) => (
                                    <SelectItem key={a.value} value={a.value}>
                                      <div>
                                        <div className="font-medium">{a.label}</div>
                                        <div className="text-[10px] text-muted-foreground">{a.description}</div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {renderActionConfig(action, index)}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!nom || !triggerType || actions.length === 0}
            >
              {workflow?.id ? 'Enregistrer' : 'Créer le workflow'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
