import { useQualiopiIndicateurs } from '@/hooks/useQualiopiIndicateurs';
import { useQualiopiCentreData } from '@/hooks/useQualiopiCentreData';
import { useQualiopiActions } from '@/hooks/useQualiopiActions';
import { useCentreFormation } from '@/hooks/useCentreFormation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Target, CheckCircle2, AlertTriangle, XCircle, FileText, TrendingUp, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const CRITERES_LABELS: Record<number, string> = {
  1: 'Information du public',
  2: 'Identification des objectifs',
  3: 'Adaptation aux bénéficiaires',
  4: 'Adéquation des moyens',
  5: 'Qualification des personnels',
  6: 'Environnement professionnel',
  7: 'Recueil des appréciations'
};

interface AuditFinding {
  type: 'force' | 'faiblesse' | 'manquant' | 'risque';
  critere?: number;
  titre: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export default function QualiopiSimulation() {
  const { indicateurs, isLoading: loadingInd } = useQualiopiIndicateurs();
  const { data: centreData, isLoading: loadingCentre } = useQualiopiCentreData();
  const { actions } = useQualiopiActions();
  const { centreFormation } = useCentreFormation();

  if (loadingInd || loadingCentre) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Generate findings based on rules
  const findings: AuditFinding[] = [];

  // Points forts
  const conformesByCritere = [1, 2, 3, 4, 5, 6, 7].map(c => {
    const inds = indicateurs?.filter(i => i.critere === c) || [];
    const conformes = inds.filter(i => i.statut === 'conforme').length;
    const taux = inds.length > 0 ? Math.round((conformes / inds.length) * 100) : 0;
    return { critere: c, taux, conformes, total: inds.length };
  });

  conformesByCritere.filter(c => c.taux === 100).forEach(c => {
    findings.push({
      type: 'force',
      critere: c.critere,
      titre: `Critère ${c.critere} — ${CRITERES_LABELS[c.critere]}`,
      description: `Tous les indicateurs sont conformes (${c.conformes}/${c.total})`,
      severity: 'low',
    });
  });

  if (centreData && centreData.avgSatisfaction >= 4) {
    findings.push({
      type: 'force',
      titre: 'Satisfaction élevée',
      description: `Note moyenne de satisfaction : ${centreData.avgSatisfaction}/5`,
      severity: 'low',
    });
  }

  if (centreData && centreData.pctDocsObligatoires >= 90) {
    findings.push({
      type: 'force',
      titre: 'Documentation solide',
      description: `${centreData.pctDocsObligatoires}% des documents obligatoires sont en place`,
      severity: 'low',
    });
  }

  // Points faibles
  conformesByCritere.filter(c => c.taux > 0 && c.taux < 80).forEach(c => {
    findings.push({
      type: 'faiblesse',
      critere: c.critere,
      titre: `Critère ${c.critere} — ${CRITERES_LABELS[c.critere]}`,
      description: `Seulement ${c.taux}% de conformité (${c.conformes}/${c.total})`,
      severity: c.taux < 50 ? 'high' : 'medium',
    });
  });

  if (centreData && centreData.tauxSatisfaction < 80) {
    findings.push({
      type: 'faiblesse',
      titre: 'Couverture satisfaction insuffisante',
      description: `Seulement ${centreData.tauxSatisfaction}% des sessions terminées ont une enquête satisfaction`,
      severity: 'high',
    });
  }

  // Documents manquants
  conformesByCritere.filter(c => c.taux === 0 && c.total > 0).forEach(c => {
    findings.push({
      type: 'manquant',
      critere: c.critere,
      titre: `Critère ${c.critere} — ${CRITERES_LABELS[c.critere]}`,
      description: `Aucun indicateur conforme sur ${c.total}`,
      severity: 'high',
    });
  });

  if (centreData && centreData.totalEmargements === 0 && centreData.totalSessions > 0) {
    findings.push({
      type: 'manquant',
      titre: 'Aucune feuille d\'émargement',
      description: 'Les feuilles d\'émargement sont obligatoires pour chaque session',
      severity: 'high',
    });
  }

  if (centreData && centreData.tauxEnquetesFroid === 0 && centreData.sessionsTerminees > 0) {
    findings.push({
      type: 'manquant',
      titre: 'Enquêtes à froid inexistantes',
      description: 'Aucune enquête de satisfaction à froid réalisée',
      severity: 'medium',
    });
  }

  // Risques majeurs
  const actionsRetard = actions?.filter(a => 
    a.statut !== 'terminee' && a.statut !== 'annulee' && 
    a.date_echeance && new Date(a.date_echeance) < new Date()
  ).length || 0;

  if (actionsRetard > 0) {
    findings.push({
      type: 'risque',
      titre: `${actionsRetard} action(s) corrective(s) en retard`,
      description: 'Les actions correctives non traitées dans les délais constituent un risque majeur en audit',
      severity: 'high',
    });
  }

  if (centreData && centreData.scoreConformite < 50) {
    findings.push({
      type: 'risque',
      titre: 'Score conformité critique',
      description: `Score actuel : ${centreData.scoreConformite}/100 — Risque élevé de non-conformité lors d'un audit`,
      severity: 'high',
    });
  }

  if (!centreFormation?.qualiopi_numero) {
    findings.push({
      type: 'risque',
      titre: 'Numéro Qualiopi non renseigné',
      description: 'Le numéro de certification Qualiopi n\'est pas renseigné dans les paramètres du centre',
      severity: 'medium',
    });
  }

  const forces = findings.filter(f => f.type === 'force');
  const faiblesses = findings.filter(f => f.type === 'faiblesse');
  const manquants = findings.filter(f => f.type === 'manquant');
  const risques = findings.filter(f => f.type === 'risque');

  const globalScore = centreData?.scoreConformite || 0;
  const verdict = globalScore >= 80 ? 'favorable' : globalScore >= 50 ? 'reserve' : 'defavorable';

  return (
    <div className="space-y-6">
      {/* Verdict global */}
      <Card className={cn(
        "border-2",
        verdict === 'favorable' ? 'border-green-500/30 bg-green-500/5' :
        verdict === 'reserve' ? 'border-yellow-500/30 bg-yellow-500/5' :
        'border-red-500/30 bg-red-500/5'
      )}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-xl",
              verdict === 'favorable' ? 'bg-green-500/10' :
              verdict === 'reserve' ? 'bg-yellow-500/10' : 'bg-red-500/10'
            )}>
              <Target className={cn(
                "h-8 w-8",
                verdict === 'favorable' ? 'text-green-600' :
                verdict === 'reserve' ? 'text-yellow-600' : 'text-destructive'
              )} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">
                {verdict === 'favorable' ? '✅ Avis favorable — Prêt pour audit' :
                 verdict === 'reserve' ? '⚠️ Avis avec réserves — Points à sécuriser' :
                 '🔴 Avis défavorable — Actions correctives urgentes'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Score global : {globalScore}/100 • {forces.length} point(s) fort(s) • {risques.length} risque(s) identifié(s)
              </p>
            </div>
            <div className="text-right">
              <div className={cn(
                "text-4xl font-black",
                verdict === 'favorable' ? 'text-green-600' :
                verdict === 'reserve' ? 'text-yellow-600' : 'text-destructive'
              )}>
                {globalScore}
              </div>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé par catégorie */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5 text-green-500" />} label="Points forts" count={forces.length} color="green" />
        <SummaryCard icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />} label="Points faibles" count={faiblesses.length} color="yellow" />
        <SummaryCard icon={<FileText className="h-5 w-5 text-orange-500" />} label="Docs manquants" count={manquants.length} color="orange" />
        <SummaryCard icon={<ShieldAlert className="h-5 w-5 text-destructive" />} label="Risques majeurs" count={risques.length} color="red" />
      </div>

      {/* Détail par section */}
      {risques.length > 0 && (
        <FindingsSection
          title="🔴 Risques majeurs"
          findings={risques}
          borderColor="border-destructive/30"
          bgColor="bg-destructive/5"
        />
      )}

      {manquants.length > 0 && (
        <FindingsSection
          title="📋 Documents manquants"
          findings={manquants}
          borderColor="border-orange-500/30"
          bgColor="bg-orange-500/5"
        />
      )}

      {faiblesses.length > 0 && (
        <FindingsSection
          title="⚠️ Points faibles"
          findings={faiblesses}
          borderColor="border-yellow-500/30"
          bgColor="bg-yellow-500/5"
        />
      )}

      {forces.length > 0 && (
        <FindingsSection
          title="✅ Points forts"
          findings={forces}
          borderColor="border-green-500/30"
          bgColor="bg-green-500/5"
        />
      )}

      {/* Barème par critère */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Barème par critère</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {conformesByCritere.map(c => (
              <div key={c.critere} className="flex items-center gap-3">
                <span className="text-sm font-medium w-24 shrink-0">Critère {c.critere}</span>
                <Progress value={c.taux} className={cn(
                  "flex-1",
                  c.taux === 100 ? '[&>div]:bg-green-500' :
                  c.taux >= 50 ? '' : '[&>div]:bg-red-500'
                )} />
                <span className={cn(
                  "text-sm font-bold w-12 text-right",
                  c.taux >= 80 ? 'text-green-600' : c.taux >= 50 ? 'text-yellow-600' : 'text-destructive'
                )}>{c.taux}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FindingsSection({ title, findings, borderColor, bgColor }: {
  title: string;
  findings: AuditFinding[];
  borderColor: string;
  bgColor: string;
}) {
  return (
    <Card className={cn("border", borderColor)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {findings.map((finding, idx) => (
            <div key={idx} className={cn("p-3 rounded-lg", bgColor)}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{finding.titre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{finding.description}</p>
                </div>
                <Badge variant={
                  finding.severity === 'high' ? 'destructive' :
                  finding.severity === 'medium' ? 'secondary' : 'outline'
                } className="shrink-0 text-xs">
                  {finding.severity === 'high' ? 'Critique' :
                   finding.severity === 'medium' ? 'Important' : 'Mineur'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
