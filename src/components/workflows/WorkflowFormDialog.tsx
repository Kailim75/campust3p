import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useWorkflows, TRIGGER_TYPES, ACTION_TYPES, WorkflowAction, Workflow } from '@/hooks/useWorkflows';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';

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

  useEffect(() => {
    if (workflow) {
      setNom(workflow.nom);
      setDescription(workflow.description || '');
      setActif(workflow.actif);
      setTriggerType(workflow.trigger_type);
      setTriggerConditions(workflow.trigger_conditions || {});
      setActions(workflow.actions || []);
    } else {
      setNom('');
      setDescription('');
      setActif(true);
      setTriggerType('');
      setTriggerConditions({});
      setActions([]);
    }
  }, [workflow, open]);

  const handleAddAction = () => {
    setActions([...actions, { type: 'send_email', config: {} }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
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

    if (workflow) {
      updateWorkflow.mutate({ id: workflow.id, ...data });
    } else {
      createWorkflow.mutate(data);
    }

    onOpenChange(false);
  };

  const renderActionConfig = (action: WorkflowAction, index: number) => {
    switch (action.type) {
      case 'send_email':
        return (
          <div className="space-y-3">
            <div>
              <Label>Template d'email</Label>
              <Select
                value={action.config.template_id || ''}
                onValueChange={(v) => handleActionChange(index, 'template_id', v)}
              >
                <SelectTrigger>
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
              <Label>Ou sujet personnalisé</Label>
              <Input
                value={action.config.subject || ''}
                onChange={(e) => handleActionChange(index, 'subject', e.target.value)}
                placeholder="Sujet de l'email (variables: {{prenom}}, {{nom}})"
              />
            </div>
            <div>
              <Label>Contenu personnalisé</Label>
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
              <Label>Titre</Label>
              <Input
                value={action.config.title || ''}
                onChange={(e) => handleActionChange(index, 'title', e.target.value)}
                placeholder="Titre de la notification"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={action.config.message || ''}
                onChange={(e) => handleActionChange(index, 'message', e.target.value)}
                placeholder="Message de la notification"
                rows={2}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={action.config.notification_type || 'info'}
                onValueChange={(v) => handleActionChange(index, 'notification_type', v)}
              >
                <SelectTrigger>
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
              <Label>Table</Label>
              <Select
                value={action.config.table || ''}
                onValueChange={(v) => handleActionChange(index, 'table', v)}
              >
                <SelectTrigger>
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
              <Label>Nouveau statut</Label>
              <Input
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
              <Label>Type d'entrée</Label>
              <Select
                value={action.config.type || 'note'}
                onValueChange={(v) => handleActionChange(index, 'type', v)}
              >
                <SelectTrigger>
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
              <Label>Titre</Label>
              <Input
                value={action.config.titre || ''}
                onChange={(e) => handleActionChange(index, 'titre', e.target.value)}
                placeholder="Titre de l'entrée"
              />
            </div>
            <div>
              <Label>Contenu</Label>
              <Textarea
                value={action.config.contenu || ''}
                onChange={(e) => handleActionChange(index, 'contenu', e.target.value)}
                placeholder="Contenu de l'entrée"
                rows={2}
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
            {workflow ? 'Modifier le workflow' : 'Nouveau workflow'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="actif">Workflow actif</Label>
              <Switch id="actif" checked={actif} onCheckedChange={setActif} />
            </div>

            <div>
              <Label htmlFor="nom">Nom du workflow *</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Email de bienvenue"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du workflow"
                rows={2}
              />
            </div>
          </div>

          {/* Déclencheur */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Déclencheur</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Quand déclencher ce workflow ?" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Actions</CardTitle>
                <Button variant="outline" size="sm" onClick={handleAddAction}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune action configurée. Ajoutez au moins une action.
                </p>
              ) : (
                actions.map((action, index) => (
                  <Card key={index} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Select
                          value={action.type}
                          onValueChange={(v) => handleActionChange(index, 'type', v as any)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map((a) => (
                              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAction(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {renderActionConfig(action, index)}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Boutons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!nom || !triggerType || actions.length === 0}
            >
              {workflow ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
