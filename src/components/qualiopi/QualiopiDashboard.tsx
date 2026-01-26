import { useSearchParams } from 'react-router-dom';
import { useQualiopiIndicateurs } from '@/hooks/useQualiopiIndicateurs';
import { useQualiopiActions } from '@/hooks/useQualiopiActions';
import { useQualiopiAudits } from '@/hooks/useQualiopiAudits';
import { useQualiopiPreuves } from '@/hooks/useQualiopiPreuves';
import { useCentreFormation } from '@/hooks/useCentreFormation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Target, Calendar, AlertTriangle, Loader2, ChevronRight, FileDown, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateQualiopiSynthesisPDF } from '@/lib/qualiopi-pdf-generator';
import { generateQualiopiAuditPDF } from '@/lib/qualiopi-audit-pdf-generator';
import { toast } from 'sonner';
import QualiopiTrendChart from './QualiopiTrendChart';

const CRITERES_LABELS: Record<number, string> = {
  1: 'Information du public',
  2: 'Identification des objectifs',
  3: 'Adaptation aux bénéficiaires',
  4: 'Adéquation des moyens',
  5: 'Qualification des personnels',
  6: 'Environnement professionnel',
  7: 'Recueil des appréciations'
};

export default function QualiopiDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { indicateurs, isLoading: loadingIndicateurs } = useQualiopiIndicateurs();
  const { actions } = useQualiopiActions();
  const { audits } = useQualiopiAudits();
  const { preuves } = useQualiopiPreuves();
  const { centreFormation } = useCentreFormation();

  const openCritere = (critere: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('qtab', 'criteres');
    next.set('qcrit', String(critere));
    setSearchParams(next, { replace: true });
  };

  const handleExportPDF = () => {
    if (!indicateurs || indicateurs.length === 0) {
      toast.error('Aucun indicateur à exporter');
      return;
    }
    try {
      generateQualiopiSynthesisPDF({
        indicateurs,
        audits: audits || undefined,
        centreName: centreFormation?.nom_legal || centreFormation?.nom_commercial || undefined
      });
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handleExportAuditPDF = () => {
    if (!indicateurs || indicateurs.length === 0 || !centreFormation) {
      toast.error('Données insuffisantes pour générer le rapport');
      return;
    }
    try {
      // Calculate scores
      const criteriaScores = [1, 2, 3, 4, 5, 6, 7].map(critere => {
        const indicateursCritere = indicateurs.filter(i => i.critere === critere);
        const conformes = indicateursCritere.filter(i => i.statut === 'conforme').length;
        const score = indicateursCritere.length > 0 
          ? Math.round((conformes / indicateursCritere.length) * 100)
          : 0;
        return { critere, score, label: CRITERES_LABELS[critere] };
      });

      const globalScore = indicateurs.length > 0
        ? Math.round((indicateurs.filter(i => i.statut === 'conforme').length / indicateurs.length) * 100)
        : 0;

      const blob = generateQualiopiAuditPDF({
        centre: {
          nom_commercial: centreFormation.nom_commercial,
          nom_legal: centreFormation.nom_legal,
          siret: centreFormation.siret,
          nda: centreFormation.nda,
          adresse_complete: centreFormation.adresse_complete,
          qualiopi_numero: centreFormation.qualiopi_numero,
          qualiopi_date_obtention: centreFormation.qualiopi_date_obtention,
          qualiopi_date_expiration: centreFormation.qualiopi_date_expiration,
        },
        indicateurs: indicateurs.map(i => ({
          id: i.id,
          numero: i.numero,
          critere: i.critere,
          titre: i.titre,
          description: i.description,
        })),
        preuves: (preuves || []).map(p => ({
          id: p.id,
          indicateur_id: p.indicateur_id,
          titre: p.titre,
          description: p.description,
          type_preuve: p.type_preuve,
          fichier_url: p.fichier_url,
          date_ajout: p.date_creation || p.created_at,
          valide: p.valide,
          commentaire: null,
        })),
        actions: (actions || []).map(a => ({
          id: a.id,
          indicateur_id: a.indicateur_id,
          titre: a.titre,
          description: a.description,
          statut: a.statut,
          priorite: a.priorite,
          date_echeance: a.date_echeance,
          responsable: a.responsable,
        })),
        globalScore,
        criteriaScores,
      });

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rapport_Audit_Qualiopi_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Rapport d\'audit généré avec succès');
    } catch (error) {
      console.error('Erreur génération rapport audit:', error);
      toast.error('Erreur lors de la génération du rapport');
    }
  };

  if (loadingIndicateurs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = {
    conformes: indicateurs?.filter(i => i.statut === 'conforme').length || 0,
    partiels: indicateurs?.filter(i => i.statut === 'partiellement_conforme').length || 0,
    nonConformes: indicateurs?.filter(i => i.statut === 'non_conforme').length || 0,
    total: indicateurs?.length || 0,
  };

  const tauxConformite = stats.total > 0 
    ? Math.round((stats.conformes / stats.total) * 100)
    : 0;

  const actionsEnCours = actions?.filter(a => a.statut === 'en_cours' || a.statut === 'a_faire').length || 0;
  const prochainAudit = audits?.find(a => a.statut === 'planifie');


  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleExportPDF} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Synthèse PDF
        </Button>
        <Button onClick={handleExportAuditPDF} variant="default" className="gap-2">
          <FileText className="h-4 w-4" />
          Rapport d'audit complet
        </Button>
      </div>

      {/* KPIs principaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de conformité</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tauxConformite}%</div>
            <Progress value={tauxConformite} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indicateurs conformes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.conformes}/{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.partiels} partiels, {stats.nonConformes} non conformes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions en cours</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{actionsEnCours}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Actions d'amélioration à traiter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochain audit</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {prochainAudit ? (
              <>
                <div className="text-lg font-bold">
                  {format(new Date(prochainAudit.date_audit), 'dd MMM yyyy', { locale: fr })}
                </div>
                <Badge variant="outline" className="mt-1">
                  {prochainAudit.type_audit}
                </Badge>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Aucun audit planifié</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graphique de tendance */}
      <QualiopiTrendChart audits={audits} currentConformityRate={tauxConformite} />

      {/* Conformité par critère */}
      <Card>
        <CardHeader>
          <CardTitle>Conformité par critère</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map(critere => {
              const indicateursCritere = indicateurs?.filter(i => i.critere === critere) || [];
              const conformesCritere = indicateursCritere.filter(i => i.statut === 'conforme').length;
              const partielsCritere = indicateursCritere.filter(i => i.statut === 'partiellement_conforme').length;
              const tauxCritere = indicateursCritere.length > 0
                ? Math.round((conformesCritere / indicateursCritere.length) * 100)
                : 0;

              return (
                <Button
                  key={critere}
                  variant="ghost"
                  onClick={() => openCritere(critere)}
                  className="w-full h-auto p-0 justify-start hover:bg-muted/50"
                >
                  <div className="w-full space-y-2 p-3 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium shrink-0">Critère {critere}</span>
                        <span className="text-sm text-muted-foreground truncate">
                          {CRITERES_LABELS[critere]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={tauxCritere === 100 ? 'default' : tauxCritere >= 50 ? 'secondary' : 'destructive'}>
                          {conformesCritere}/{indicateursCritere.length}
                        </Badge>
                        {partielsCritere > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({partielsCritere} partiel{partielsCritere > 1 ? 's' : ''})
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <Progress 
                      value={tauxCritere} 
                      className={tauxCritere === 100 ? '[&>div]:bg-green-500' : tauxCritere >= 50 ? '' : '[&>div]:bg-red-500'}
                    />
                  </div>
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Astuce : cliquez sur un critère pour ouvrir le détail dans l’onglet “Critères & Indicateurs”.
          </p>
        </CardContent>
      </Card>

      {/* Actions prioritaires */}
      {actions && actions.filter(a => a.statut !== 'terminee' && a.statut !== 'annulee').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Actions prioritaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actions
                .filter(a => a.statut !== 'terminee' && a.statut !== 'annulee')
                .slice(0, 5)
                .map(action => (
                  <div key={action.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{action.titre}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        action.priorite === 'haute' ? 'destructive' : 
                        action.priorite === 'moyenne' ? 'secondary' : 'outline'
                      }>
                        {action.priorite}
                      </Badge>
                      {action.date_echeance && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(action.date_echeance), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
