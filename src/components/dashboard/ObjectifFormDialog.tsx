import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateObjectif, useUpdateObjectif, TypePeriode, TypeObjectif, typeObjectifLabels, Objectif } from '@/hooks/useObjectifs';

interface ObjectifFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectif?: Objectif | null;
}

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function ObjectifFormDialog({ open, onOpenChange, objectif }: ObjectifFormDialogProps) {
  const createMutation = useCreateObjectif();
  const updateMutation = useUpdateObjectif();
  const isEditing = !!objectif;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const [typePeriode, setTypePeriode] = useState<TypePeriode>('mensuel');
  const [mois, setMois] = useState<number>(currentMonth);
  const [trimestre, setTrimestre] = useState<number>(currentQuarter);
  const [annee, setAnnee] = useState<number>(currentYear);
  const [typeObjectif, setTypeObjectif] = useState<TypeObjectif>('ca');
  const [valeurCible, setValeurCible] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (objectif) {
      setTypePeriode(objectif.type_periode);
      setMois(objectif.mois || currentMonth);
      setTrimestre(objectif.trimestre || currentQuarter);
      setAnnee(objectif.annee);
      setTypeObjectif(objectif.type_objectif);
      setValeurCible(objectif.valeur_cible.toString());
      setDescription(objectif.description || '');
    } else {
      setTypePeriode('mensuel');
      setMois(currentMonth);
      setTrimestre(currentQuarter);
      setAnnee(currentYear);
      setTypeObjectif('ca');
      setValeurCible('');
      setDescription('');
    }
  }, [objectif, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      type_periode: typePeriode,
      mois: typePeriode === 'mensuel' ? mois : null,
      trimestre: typePeriode === 'trimestriel' ? trimestre : null,
      annee,
      type_objectif: typeObjectif,
      valeur_cible: parseFloat(valeurCible),
      description: description || null
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: objectif.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    
    onOpenChange(false);
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'objectif' : 'Créer un objectif'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de période</Label>
              <Select value={typePeriode} onValueChange={(v) => setTypePeriode(v as TypePeriode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensuel">Mensuel</SelectItem>
                  <SelectItem value="trimestriel">Trimestriel</SelectItem>
                  <SelectItem value="annuel">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Année</Label>
              <Select value={annee.toString()} onValueChange={(v) => setAnnee(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {typePeriode === 'mensuel' && (
            <div className="space-y-2">
              <Label>Mois</Label>
              <Select value={mois.toString()} onValueChange={(v) => setMois(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {typePeriode === 'trimestriel' && (
            <div className="space-y-2">
              <Label>Trimestre</Label>
              <Select value={trimestre.toString()} onValueChange={(v) => setTrimestre(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">T1 (Jan-Mars)</SelectItem>
                  <SelectItem value="2">T2 (Avr-Juin)</SelectItem>
                  <SelectItem value="3">T3 (Juil-Sept)</SelectItem>
                  <SelectItem value="4">T4 (Oct-Déc)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Type d'objectif</Label>
            <Select value={typeObjectif} onValueChange={(v) => setTypeObjectif(v as TypeObjectif)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeObjectifLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Valeur cible
              {typeObjectif === 'ca' || typeObjectif === 'encaissements' ? ' (€)' : 
               typeObjectif === 'taux_reussite' ? ' (%)' : ''}
            </Label>
            <Input
              type="number"
              value={valeurCible}
              onChange={(e) => setValeurCible(e.target.value)}
              placeholder={typeObjectif === 'ca' ? '50000' : '10'}
              min="0"
              step={typeObjectif === 'taux_reussite' ? '1' : '0.01'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optionnel)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Objectif de CA pour le mois de janvier"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
