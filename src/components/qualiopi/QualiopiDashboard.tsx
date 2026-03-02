import { useQualiopiCentreData } from '@/hooks/useQualiopiCentreData';
import { useQualiopiIndicateurs } from '@/hooks/useQualiopiIndicateurs';
import { useQualiopiActions } from '@/hooks/useQualiopiActions';
import { useQualiopiAudits } from '@/hooks/useQualiopiAudits';
import { useQualiopiPreuves } from '@/hooks/useQualiopiPreuves';
import { useCentreFormation } from '@/hooks/useCentreFormation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, Clock, Target, Calendar, AlertTriangle, Loader2, 
  ChevronRight, FileDown, FileText, Shield, TrendingUp, 
  AlertCircle, Star, Award, BarChart3, FolderDown
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateQualiopiSynthesisPDF } from '@/lib/qualiopi-pdf-generator';
import { generateQualiopiAuditPDF } from '@/lib/qualiopi-audit-pdf-generator';
import { toast } from 'sonner';
import QualiopiTrendChart from './QualiopiTrendChart';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';

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
  const { data: centreData, isLoading: loadingCentre } = useQualiopiCentreData();

  const openCritere = (critere: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('qtab', 'criteres');
    next.set('qcrit', String(critere));
    setSearchParams(next, { replace: true });
  };

  const openTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('qtab', tab);
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
    } catch {
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handleExportAuditPDF = () => {
    if (!indicateurs || indicateurs.length === 0 || !centreFormation) {
      toast.error('Données insuffisantes pour générer le rapport');
      return;
    }
    try {
      const criteriaScores = [1, 2, 3, 4, 5, 6, 7].map(critere => {
        const indicateursCritere = indicateurs.filter(i => i.critere === critere);
        const conformes = indicateursCritere.filter(i => i.statut === 'conforme').length;
        const score = indicateursCritere.length > 0 
          ? Math.round((conformes / indicateursCritere.length) * 100) : 0;
        return { critere, score, label: CRITERES_LABELS[critere] };
      });

      const globalScore = indicateurs.length > 0
        ? Math.round((indicateurs.filter(i => i.statut === 'conforme').length / indicateurs.length) * 100) : 0;

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
          id: i.id, numero: i.numero, critere: i.critere, titre: i.titre, description: i.description,
        })),
        preuves: (preuves || []).map(p => ({
          id: p.id, indicateur_id: p.indicateur_id, titre: p.titre, description: p.description,
          type_preuve: p.type_preuve, fichier_url: p.fichier_url,
          date_ajout: p.date_creation || p.created_at, valide: p.valide, commentaire: null,
        })),
        actions: (actions || []).map(a => ({
          id: a.id, indicateur_id: a.indicateur_id, titre: a.titre, description: a.description,
          statut: a.statut, priorite: a.priorite, date_echeance: a.date_echeance, responsable: a.responsable,
        })),
        globalScore,
        criteriaScores,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rapport_Audit_Qualiopi_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Rapport d\'audit généré avec succès');
    } catch {
      toast.error('Erreur lors de la génération du rapport');
    }
  };

  if (loadingIndicateurs || loadingCentre) {
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
    ? Math.round((stats.conformes / stats.total) * 100) : 0;

  const actionsEnCours = actions?.filter(a => a.statut === 'en_cours' || a.statut === 'a_faire').length || 0;
  const prochainAudit = audits?.find(a => a.statut === 'planifie');

  const scoreColor = centreData?.scoreLevel === 'ready' 
    ? 'text-green-600' : centreData?.scoreLevel === 'warning' 
    ? 'text-yellow-600' : 'text-destructive';

  const scoreBg = centreData?.scoreLevel === 'ready'
    ? 'from-green-500/10 to-emerald-500/5 border-green-500/20'
    : centreData?.scoreLevel === 'warning'
    ? 'from-yellow-500/10 to-amber-500/5 border-yellow-500/20'
    : 'from-red-500/10 to-rose-500/5 border-red-500/20';

  return (
    <div className="space-y-6">
      {/* Header with badge + exports */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {centreData?.isQualiopiReady && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-700 text-sm">Qualiopi Ready</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-2">
            <FileDown className="h-4 w-4" />
            Synthèse PDF
          </Button>
          <Button onClick={handleExportAuditPDF} size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Rapport d'audit
          </Button>
          <Button onClick={() => openTab('simulation')} variant="outline" size="sm" className="gap-2">
            <Target className="h-4 w-4" />
            Simuler un audit
          </Button>
        </div>
      </div>

      {/* Score Conformité Global - Hero */}
      <Card className={cn("border bg-gradient-to-br overflow-hidden", scoreBg)}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Score circle */}
            <div className="relative flex-shrink-0">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-muted/20" />
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8"
                  className={cn(
                    centreData?.scoreLevel === 'ready' ? 'stroke-green-500' :
                    centreData?.scoreLevel === 'warning' ? 'stroke-yellow-500' : 'stroke-destructive'
                  )}
                  strokeDasharray={`${(centreData?.scoreConformite || 0) * 3.27} 327`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-3xl font-black", scoreColor)}>
                  {centreData?.scoreConformite || 0}
                </span>
                <span className="text-xs text-muted-foreground font-medium">/100</span>
              </div>
            </div>

            {/* Score details */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-bold">Score Conformité Qualiopi</h3>
                <p className="text-sm text-muted-foreground">
                  {centreData?.isQualiopiReady 
                    ? '✅ Prêt pour audit — Tous les indicateurs clés sont au vert'
                    : centreData?.scoreLevel === 'warning'
                    ? '⚠️ Des points à sécuriser avant l\'audit'
                    : '🔴 Actions correctives urgentes nécessaires'}
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <ScoreDetailItem
                  label="Docs obligatoires"
                  value={centreData?.pctDocsObligatoires || 0}
                  weight="30%"
                />
                <ScoreDetailItem
                  label="Satisfaction"
                  value={centreData?.pctSessionsSatisfaction || 0}
                  weight="30%"
                />
                <ScoreDetailItem
                  label="Dossiers complets"
                  value={centreData?.pctDossiersComplets || 0}
                  weight="25%"
                />
                <ScoreDetailItem
                  label="Enquêtes à froid"
                  value={centreData?.pctEnquetesFroid || 0}
                  weight="15%"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs secondaires */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indicateurs conformes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conformes}/{stats.total}</div>
            <Progress value={tauxConformite} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.partiels} partiels, {stats.nonConformes} non conformes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction moyenne</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centreData?.avgSatisfaction || 0}/5</div>
            <p className="text-xs text-muted-foreground mt-1">
              NPS : {centreData?.npsScore || 0} • {centreData?.totalSatisfactionReponses || 0} réponses
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
            <Calendar className="h-4 w-4 text-primary" />
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

      {/* Alertes Qualité */}
      {centreData && centreData.alertes.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Alertes Qualité
              <Badge variant="destructive" className="ml-2">{centreData.alertes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {centreData.alertes.map(alerte => (
                <div
                  key={alerte.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    alerte.type === 'error' ? 'bg-destructive/5 border-destructive/20' :
                    alerte.type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
                    'bg-primary/5 border-primary/20'
                  )}
                >
                  {alerte.type === 'error' ? (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  ) : alerte.type === 'warning' ? (
                    <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{alerte.titre}</p>
                    <p className="text-xs text-muted-foreground">{alerte.description}</p>
                  </div>
                  {alerte.count && (
                    <Badge variant="outline" className="shrink-0">{alerte.count}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preuves auto-reliées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderDown className="h-5 w-5 text-primary" />
            Preuves générées automatiquement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <PreuveCard label="Émargements" count={centreData?.totalEmargements || 0} icon="📋" />
            <PreuveCard label="Conventions" count={centreData?.totalConventions || 0} icon="📄" />
            <PreuveCard label="Contrats" count={centreData?.totalContrats || 0} icon="✍️" />
            <PreuveCard label="Certificats" count={centreData?.totalCertificats || 0} icon="🏆" />
            <PreuveCard label="Enquêtes satisfaction" count={centreData?.totalSatisfactionReponses || 0} icon="⭐" />
          </div>
        </CardContent>
      </Card>

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
                ? Math.round((conformesCritere / indicateursCritere.length) * 100) : 0;

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

function ScoreDetailItem({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground/60">{weight}</span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={value} className="flex-1 h-2" />
        <span className={cn(
          "text-xs font-bold min-w-[32px] text-right",
          value >= 80 ? 'text-green-600' : value >= 50 ? 'text-yellow-600' : 'text-destructive'
        )}>{value}%</span>
      </div>
    </div>
  );
}

function PreuveCard({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/30 border">
      <span className="text-2xl">{icon}</span>
      <p className="text-xl font-bold mt-1">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
