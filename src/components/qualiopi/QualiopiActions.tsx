import { useMemo, useState } from 'react';
import { useQualiopiActions, QualiopiAction } from '@/hooks/useQualiopiActions';
import { useQualiopiIndicateurs } from '@/hooks/useQualiopiIndicateurs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, CheckCircle2, Clock, AlertTriangle, Trash2, Calendar, ClipboardList, User, RotateCcw } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<QualiopiAction['statut'], string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

const PRIORITY_LABELS: Record<QualiopiAction['priorite'], string> = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
};

const PRIORITY_BADGE_VARIANT: Record<QualiopiAction['priorite'], 'destructive' | 'secondary' | 'outline'> = {
  haute: 'destructive',
  moyenne: 'secondary',
  basse: 'outline',
};

function formatDueDateLabel(date: string | null): string {
  if (!date) return 'Sans échéance';

  const parsedDate = parseISO(date);

  if (isToday(parsedDate)) return "Aujourd'hui";
  if (isTomorrow(parsedDate)) return 'Demain';

  return format(parsedDate, 'dd MMM yyyy', { locale: fr });
}

export default function QualiopiActions() {
  const { actions, isLoading, createAction, updateAction, deleteAction, isCreating } = useQualiopiActions();
  const { indicateurs } = useQualiopiIndicateurs();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    indicateur_id: '',
    titre: '',
    description: '',
    priorite: 'moyenne' as 'haute' | 'moyenne' | 'basse',
    date_echeance: '',
    responsable: ''
  });

  const handleSubmit = () => {
    if (!formData.titre || !formData.description) return;
    
    createAction({
      ...formData,
      indicateur_id: formData.indicateur_id || null,
      date_echeance: formData.date_echeance || null,
      date_realisation: null,
      responsable: formData.responsable || null,
      statut: 'a_faire'
    });
    
    setIsDialogOpen(false);
    setFormData({
      indicateur_id: '',
      titre: '',
      description: '',
      priorite: 'moyenne',
      date_echeance: '',
      responsable: ''
    });
  };

  const indicateurById = useMemo(() => {
    return new Map((indicateurs || []).map((indicateur) => [indicateur.id, indicateur]));
  }, [indicateurs]);

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'terminee':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'en_cours':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'a_faire':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const sortedActions = useMemo(() => {
    const priorityOrder: Record<QualiopiAction['priorite'], number> = {
      haute: 0,
      moyenne: 1,
      basse: 2,
    };

    const statusOrder: Record<QualiopiAction['statut'], number> = {
      en_cours: 0,
      a_faire: 1,
      terminee: 2,
      annulee: 3,
    };

    return [...(actions || [])].sort((left, right) => {
      const leftOverdue = Boolean(left.date_echeance && isPast(parseISO(left.date_echeance)) && left.statut !== 'terminee' && left.statut !== 'annulee');
      const rightOverdue = Boolean(right.date_echeance && isPast(parseISO(right.date_echeance)) && right.statut !== 'terminee' && right.statut !== 'annulee');

      if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;

      if (statusOrder[left.statut] !== statusOrder[right.statut]) {
        return statusOrder[left.statut] - statusOrder[right.statut];
      }

      if (priorityOrder[left.priorite] !== priorityOrder[right.priorite]) {
        return priorityOrder[left.priorite] - priorityOrder[right.priorite];
      }

      if (left.date_echeance && right.date_echeance) {
        return left.date_echeance.localeCompare(right.date_echeance);
      }

      if (left.date_echeance) return -1;
      if (right.date_echeance) return 1;

      return right.updated_at.localeCompare(left.updated_at);
    });
  }, [actions]);

  const filteredActions = useMemo(() => {
    return sortedActions.filter((action) => filterStatut === 'all' || action.statut === filterStatut);
  }, [filterStatut, sortedActions]);

  const openActionsCount = actions?.filter((action) => action.statut === 'a_faire' || action.statut === 'en_cours').length || 0;
  const overdueActionsCount = actions?.filter((action) => action.date_echeance && isPast(parseISO(action.date_echeance)) && action.statut !== 'terminee' && action.statut !== 'annulee').length || 0;
  const completedActionsCount = actions?.filter((action) => action.statut === 'terminee').length || 0;
  const linkedIndicatorActionsCount = actions?.filter((action) => Boolean(action.indicateur_id)).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold">Plan d&apos;actions Qualiopi</p>
              <p className="text-xs text-muted-foreground">
                Les actions correctives à suivre pour améliorer le score, traiter les écarts et préparer l&apos;audit.
              </p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2 text-xs">
              <p className="font-medium">Lecture rapide</p>
              <p className="text-muted-foreground">{openActionsCount} action{openActionsCount > 1 ? 's' : ''} ouverte{openActionsCount > 1 ? 's' : ''}</p>
              <p className="mt-1 text-muted-foreground">{overdueActionsCount} en retard · {linkedIndicatorActionsCount} liée{linkedIndicatorActionsCount > 1 ? 's' : ''} à un indicateur</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ouvertes</p>
                <p className="mt-1 text-lg font-semibold">{openActionsCount}</p>
                <p className="text-xs text-muted-foreground">À piloter activement</p>
              </CardContent>
            </Card>
            <Card className={overdueActionsCount > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border/70'}>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">En retard</p>
                <p className="mt-1 text-lg font-semibold">{overdueActionsCount}</p>
                <p className="text-xs text-muted-foreground">À traiter avant glissement</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Terminées</p>
                <p className="mt-1 text-lg font-semibold">{completedActionsCount}</p>
                <p className="text-xs text-muted-foreground">Actions déjà clôturées</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rattachées</p>
                <p className="mt-1 text-lg font-semibold">{linkedIndicatorActionsCount}</p>
                <p className="text-xs text-muted-foreground">Liées à un indicateur Qualiopi</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="a_faire">À faire</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="terminee">Terminée</SelectItem>
              <SelectItem value="annulee">Annulée</SelectItem>
            </SelectContent>
          </Select>
          {filterStatut !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setFilterStatut('all')} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {filteredActions.length} action{filteredActions.length > 1 ? 's' : ''} affichée{filteredActions.length > 1 ? 's' : ''}
          </span>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle action
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle action d'amélioration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Crée une action claire, assignable et suivable. Plus elle est reliée à un indicateur, plus le suivi sera utile.
              </p>
              <div>
                <Label>Indicateur concerné (optionnel)</Label>
                <Select 
                  value={formData.indicateur_id || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, indicateur_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un indicateur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {indicateurs?.map(ind => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.numero} - {ind.titre.substring(0, 40)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Titre *</Label>
                <Input 
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  placeholder="Titre de l'action"
                />
              </div>
              
              <div>
                <Label>Description *</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description détaillée de l'action"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priorité</Label>
                  <Select 
                    value={formData.priorite} 
                    onValueChange={(v: 'haute' | 'moyenne' | 'basse') => setFormData({ ...formData, priorite: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="haute">🔴 Haute</SelectItem>
                      <SelectItem value="moyenne">🟠 Moyenne</SelectItem>
                      <SelectItem value="basse">🟢 Basse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Date d'échéance</Label>
                  <Input 
                    type="date"
                    value={formData.date_echeance}
                    onChange={(e) => setFormData({ ...formData, date_echeance: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Responsable</Label>
                <Input 
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  placeholder="Nom du responsable"
                />
              </div>
              
              <Button onClick={handleSubmit} disabled={isCreating} className="w-full">
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer l'action
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {filteredActions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune action d&apos;amélioration trouvée pour ce filtre.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActions.map(action => (
            <Card key={action.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(action.statut)}
                    <div className="flex-1">
                      <h4 className="font-medium">{action.titre}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                      {action.indicateur_id && indicateurById.get(action.indicateur_id) && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <ClipboardList className="h-3.5 w-3.5" />
                          <span>
                            Indicateur {indicateurById.get(action.indicateur_id)?.numero} · {indicateurById.get(action.indicateur_id)?.titre}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant={PRIORITY_BADGE_VARIANT[action.priorite]}>
                          Priorité {PRIORITY_LABELS[action.priorite]}
                        </Badge>
                        <Badge variant="outline">
                          {STATUS_LABELS[action.statut]}
                        </Badge>
                        {action.responsable && (
                          <Badge variant="outline" className="gap-1">
                            <User className="h-3 w-3" />
                            {action.responsable}
                          </Badge>
                        )}
                        {action.date_echeance && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'flex items-center gap-1',
                              action.statut !== 'terminee' && action.statut !== 'annulee' && isPast(parseISO(action.date_echeance))
                                ? 'border-destructive/40 text-destructive'
                                : ''
                            )}
                          >
                            <Calendar className="h-3 w-3" />
                            {formatDueDateLabel(action.date_echeance)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select
                      value={action.statut}
                      onValueChange={(value) => updateAction({ 
                        id: action.id, 
                        statut: value as QualiopiAction['statut'],
                        date_realisation: value === 'terminee' ? new Date().toISOString().split('T')[0] : null
                      })}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a_faire">À faire</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="terminee">Terminée</SelectItem>
                        <SelectItem value="annulee">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteAction(action.id)}
                      title="Supprimer l'action"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
