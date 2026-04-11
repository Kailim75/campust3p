import { useState } from 'react';
import { useQualiopiActions, QualiopiAction } from '@/hooks/useQualiopiActions';
import { useQualiopiIndicateurs } from '@/hooks/useQualiopiIndicateurs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, CheckCircle2, Clock, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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

  const filteredActions = actions?.filter(a => 
    filterStatut === 'all' || a.statut === filterStatut
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2">
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[180px]">
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
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune action d'amélioration trouvée
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
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant={
                          action.priorite === 'haute' ? 'destructive' : 
                          action.priorite === 'moyenne' ? 'secondary' : 'outline'
                        }>
                          {action.priorite}
                        </Badge>
                        {action.responsable && (
                          <Badge variant="outline">{action.responsable}</Badge>
                        )}
                        {action.date_echeance && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(action.date_echeance), 'dd/MM/yyyy')}
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
