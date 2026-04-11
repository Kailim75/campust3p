import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQualiopiIndicateurs, QualiopiIndicateur } from '@/hooks/useQualiopiIndicateurs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Clock, Loader2, FileText, ChevronDown, ChevronRight, ClipboardList, RotateCcw } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CRITERES_LABELS: Record<number, string> = {
  1: 'Information du public sur les prestations',
  2: 'Identification précise des objectifs des prestations',
  3: 'Adaptation aux publics bénéficiaires',
  4: 'Adéquation des moyens pédagogiques, techniques et d\'encadrement',
  5: 'Qualification et développement des connaissances et compétences des personnels',
  6: 'Inscription et investissement du prestataire dans son environnement professionnel',
  7: 'Recueil et prise en compte des appréciations et des réclamations'
};

export default function QualiopiCriteres() {
  const [searchParams] = useSearchParams();
  const { indicateurs, isLoading, updateStatut, isUpdating } = useQualiopiIndicateurs();
  const [openCriteres, setOpenCriteres] = useState<number[]>([]);

  const critereParam = searchParams.get('qcrit');
  const critereFromUrl = useMemo(() => {
    const n = critereParam ? Number(critereParam) : null;
    return n && Number.isFinite(n) ? n : null;
  }, [critereParam]);

  useEffect(() => {
    if (!critereFromUrl) return;

    setOpenCriteres(prev => (prev.includes(critereFromUrl) ? prev : [critereFromUrl, ...prev]));

    // Scroll to the requested criterion if present
    window.setTimeout(() => {
      const el = document.getElementById(`qualiopi-critere-${critereFromUrl}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [critereFromUrl]);

  const setCritereOpen = (critere: number, open: boolean) => {
    setOpenCriteres(prev => {
      const has = prev.includes(critere);
      if (open && !has) return [...prev, critere];
      if (!open && has) return prev.filter(c => c !== critere);
      return prev;
    });
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'conforme':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'partiellement_conforme':
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (statut: string) => {
    const config = {
      conforme: { variant: 'default' as const, label: 'Conforme', className: 'bg-green-500' },
      partiellement_conforme: { variant: 'secondary' as const, label: 'Partiel', className: 'bg-orange-500 text-white' },
      non_conforme: { variant: 'destructive' as const, label: 'Non conforme', className: '' }
    };
    const { variant, label, className } = config[statut as keyof typeof config] || config.non_conforme;
    return <Badge variant={variant} className={className}>{label}</Badge>;
  };

  const groupedByCritere = useMemo(() => (
    indicateurs?.reduce((acc, ind) => {
      if (!acc[ind.critere]) acc[ind.critere] = [];
      acc[ind.critere].push(ind);
      return acc;
    }, {} as Record<number, QualiopiIndicateur[]>) || {}
  ), [indicateurs]);

  const critereEntries = useMemo(() => (
    Object.entries(groupedByCritere)
      .map(([critere, inds]) => {
        const critereNum = Number(critere);
        const conformes = inds.filter((ind) => ind.statut === 'conforme').length;
        const partiels = inds.filter((ind) => ind.statut === 'partiellement_conforme').length;
        const nonConformes = inds.filter((ind) => ind.statut === 'non_conforme').length;
        const total = inds.length;
        const tauxCritere = total > 0 ? Math.round((conformes / total) * 100) : 0;

        return {
          critereNum,
          inds,
          conformes,
          partiels,
          nonConformes,
          total,
          tauxCritere,
        };
      })
      .sort((left, right) => left.critereNum - right.critereNum)
  ), [groupedByCritere]);

  const totalConformes = indicateurs?.filter((ind) => ind.statut === 'conforme').length || 0;
  const totalPartiels = indicateurs?.filter((ind) => ind.statut === 'partiellement_conforme').length || 0;
  const totalNonConformes = indicateurs?.filter((ind) => ind.statut === 'non_conforme').length || 0;
  const totalIndicateurs = indicateurs?.length || 0;
  const ouvertsCount = openCriteres.length;

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
              <p className="text-sm font-semibold">Pilotage des critères</p>
              <p className="text-xs text-muted-foreground">
                Mets à jour les statuts indicateur par indicateur pour refléter l&apos;état réel de conformité.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg border bg-background px-3 py-2 text-xs">
                <p className="font-medium">Lecture rapide</p>
                <p className="text-muted-foreground">{totalConformes}/{totalIndicateurs} indicateurs conformes</p>
                <p className="mt-1 text-muted-foreground">{ouvertsCount} critère{ouvertsCount > 1 ? 's' : ''} ouvert{ouvertsCount > 1 ? 's' : ''}</p>
              </div>
              {openCriteres.length > 0 && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setOpenCriteres([])}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replier tout
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conformes</p>
                <p className="mt-1 text-lg font-semibold">{totalConformes}</p>
                <p className="text-xs text-muted-foreground">Base actuellement sécurisée</p>
              </CardContent>
            </Card>
            <Card className={totalPartiels > 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border/70'}>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Partiels</p>
                <p className="mt-1 text-lg font-semibold">{totalPartiels}</p>
                <p className="text-xs text-muted-foreground">Nécessitent encore des preuves ou ajustements</p>
              </CardContent>
            </Card>
            <Card className={totalNonConformes > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border/70'}>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Non conformes</p>
                <p className="mt-1 text-lg font-semibold">{totalNonConformes}</p>
                <p className="text-xs text-muted-foreground">À traiter en priorité</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Critères</p>
                <p className="mt-1 text-lg font-semibold">{critereEntries.length}</p>
                <p className="text-xs text-muted-foreground">Axes Qualiopi suivis dans le CRM</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {critereEntries.map(({ critereNum, inds, conformes, partiels, nonConformes, total, tauxCritere }) => {
        const isOpen = openCriteres.includes(critereNum);

        return (
          <Collapsible 
            key={critere} 
            open={isOpen}
            onOpenChange={(open) => setCritereOpen(critereNum, open)}
          >
            <Card id={`qualiopi-critere-${critereNum}`} className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full px-4 py-4 h-auto justify-between hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isOpen ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <Badge 
                      variant={tauxCritere === 100 ? 'default' : tauxCritere >= 50 ? 'secondary' : 'destructive'}
                      className="min-w-[60px] justify-center"
                    >
                      {conformes}/{total}
                    </Badge>
                    <div className="text-left min-w-0">
                      <span className="font-semibold">Critère {critereNum}</span>
                      <span className="text-muted-foreground ml-2 text-sm hidden md:inline truncate">
                        {CRITERES_LABELS[critereNum]}
                      </span>
                      <div className="mt-1 hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{partiels} partiel{partiels > 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{nonConformes} non conforme{nonConformes > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-muted-foreground">
                      {CRITERES_LABELS[critereNum]}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <ClipboardList className="h-3 w-3" />
                        {total} indicateur{total > 1 ? 's' : ''}
                      </Badge>
                      {partiels > 0 && (
                        <Badge variant="secondary" className="text-[11px]">
                          {partiels} partiel{partiels > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {nonConformes > 0 && (
                        <Badge variant="destructive" className="text-[11px]">
                          {nonConformes} non conforme{nonConformes > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {inds.map(ind => (
                      <Card
                        key={ind.id}
                        className={cn(
                          'border-l-4',
                          ind.statut === 'conforme' && 'bg-green-500/5',
                          ind.statut === 'partiellement_conforme' && 'bg-yellow-500/5',
                          ind.statut === 'non_conforme' && 'bg-destructive/5',
                        )}
                        style={{
                          borderLeftColor: ind.statut === 'conforme' ? '#22c55e' :
                            ind.statut === 'partiellement_conforme' ? '#f97316' : '#ef4444'
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              {getStatusIcon(ind.statut)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    Indicateur {ind.numero}
                                  </Badge>
                                  <h4 className="font-medium">{ind.titre}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {ind.description}
                                </p>
                                
                                {ind.preuves_attendues && ind.preuves_attendues.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                      <FileText className="h-3 w-3" />
                                      Preuves attendues :
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {ind.preuves_attendues.map((preuve, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {preuve}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusBadge(ind.statut)}
                              <Select
                                value={ind.statut}
                                onValueChange={(value) => updateStatut({ id: ind.id, statut: value })}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Changer..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="conforme">✅ Conforme</SelectItem>
                                  <SelectItem value="partiellement_conforme">⚠️ Partiel</SelectItem>
                                  <SelectItem value="non_conforme">❌ Non conforme</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
