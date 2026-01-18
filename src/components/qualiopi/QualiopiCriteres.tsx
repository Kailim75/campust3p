import { useState } from 'react';
import { useQualiopiIndicateurs, QualiopiIndicateur } from '@/hooks/useQualiopiIndicateurs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Clock, Loader2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

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
  const { indicateurs, isLoading, updateStatut, isUpdating } = useQualiopiIndicateurs();
  const [openCriteres, setOpenCriteres] = useState<number[]>([]);

  const toggleCritere = (critere: number) => {
    setOpenCriteres(prev => 
      prev.includes(critere) 
        ? prev.filter(c => c !== critere)
        : [...prev, critere]
    );
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Grouper par critère
  const groupedByCritere = indicateurs?.reduce((acc, ind) => {
    if (!acc[ind.critere]) acc[ind.critere] = [];
    acc[ind.critere].push(ind);
    return acc;
  }, {} as Record<number, QualiopiIndicateur[]>) || {};

  return (
    <div className="space-y-4">
      {Object.entries(groupedByCritere).map(([critere, inds]) => {
        const critereNum = parseInt(critere);
        const conformes = inds.filter(i => i.statut === 'conforme').length;
        const total = inds.length;
        const tauxCritere = Math.round((conformes / total) * 100);
        const isOpen = openCriteres.includes(critereNum);

        return (
          <Collapsible 
            key={critere} 
            open={isOpen}
            onOpenChange={() => toggleCritere(critereNum)}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full px-4 py-4 h-auto justify-between hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
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
                    <div className="text-left">
                      <span className="font-semibold">Critère {critereNum}</span>
                      <span className="text-muted-foreground ml-2 text-sm hidden md:inline">
                        {CRITERES_LABELS[critereNum]}
                      </span>
                    </div>
                  </div>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground mb-4 md:hidden">
                    {CRITERES_LABELS[critereNum]}
                  </p>
                  <div className="space-y-3">
                    {inds.map(ind => (
                      <Card key={ind.id} className="border-l-4" style={{
                        borderLeftColor: ind.statut === 'conforme' ? '#22c55e' : 
                                         ind.statut === 'partiellement_conforme' ? '#f97316' : '#ef4444'
                      }}>
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