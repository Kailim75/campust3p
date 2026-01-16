import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, TrendingUp, TrendingDown, Minus, Settings, Plus } from 'lucide-react';
import { useState } from 'react';
import { useCurrentObjectifsWithProgress, formatPeriodLabel, typeObjectifLabels, typeObjectifUnits, ObjectifWithProgress } from '@/hooks/useObjectifs';
import { ObjectifFormDialog } from './ObjectifFormDialog';
import { cn } from '@/lib/utils';

function formatValue(value: number, type: string): string {
  if (type === 'ca' || type === 'encaissements') {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }
  if (type === 'taux_reussite') {
    return `${value}%`;
  }
  return value.toString();
}

function ObjectifCard({ objectif }: { objectif: ObjectifWithProgress }) {
  const progressColor = objectif.progression >= 100 
    ? 'bg-green-500' 
    : objectif.progression >= 75 
      ? 'bg-primary' 
      : objectif.progression >= 50 
        ? 'bg-yellow-500' 
        : 'bg-red-500';

  const TrendIcon = objectif.ecart > 0 ? TrendingUp : objectif.ecart < 0 ? TrendingDown : Minus;
  const trendColor = objectif.ecart >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <Card className="relative overflow-hidden">
      <div 
        className={cn("absolute bottom-0 left-0 h-1", progressColor)} 
        style={{ width: `${Math.min(100, objectif.progression)}%` }}
      />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {typeObjectifLabels[objectif.type_objectif]}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {formatPeriodLabel(objectif)}
            </Badge>
          </div>
          <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
            <TrendIcon className="h-4 w-4" />
            <span className="font-medium">
              {objectif.ecart >= 0 ? '+' : ''}{formatValue(Math.abs(objectif.ecart), objectif.type_objectif)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">
            {formatValue(objectif.valeur_actuelle, objectif.type_objectif)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatValue(objectif.valeur_cible, objectif.type_objectif)}
          </span>
        </div>
        
        <div className="space-y-1">
          <Progress value={objectif.progression} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{objectif.progression}% atteint</span>
            {objectif.progression >= 100 && (
              <span className="text-green-600 font-medium">🎉 Objectif atteint !</span>
            )}
          </div>
        </div>

        {objectif.description && (
          <p className="text-xs text-muted-foreground mt-2">{objectif.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ObjectifProgressCard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: objectifs, isLoading } = useCurrentObjectifsWithProgress();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Objectifs en cours</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nouvel objectif
          </Button>
        </CardHeader>
        <CardContent>
          {!objectifs || objectifs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun objectif défini pour la période actuelle</p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setDialogOpen(true)}
              >
                Créer un objectif
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {objectifs.map((obj) => (
                <ObjectifCard key={obj.id} objectif={obj} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ObjectifFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </>
  );
}
