import { useQualiopiIndicateurs } from '@/hooks/useQualiopiIndicateurs';
import { useQualiopiCentreData } from '@/hooks/useQualiopiCentreData';
import { useQualiopiActions } from '@/hooks/useQualiopiActions';
import { useCentreFormation } from '@/hooks/useCentreFormation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Target, CheckCircle2, AlertTriangle, XCircle, FileText, TrendingUp, ShieldAlert, Zap, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  actionRecommandee?: string;
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

  // Generate findings based on real data
  const findings: AuditFinding[] = [];

  const conformesByCritere = [1, 2, 3, 4, 5, 6, 7].map(c => {
    const inds = indicateurs?.filter(i => i.critere === c) || [];
    const conformes = inds.filter(i => i.statut === 'conforme').length;
    const taux = inds.length > 0 ? Math.round((conformes / inds.length) * 100) : 0;
    return { critere: c, taux, conformes, total: inds.length };
  });

  // Points forts
  conformesByCritere.filter(c => c.taux === 100).forEach(c => {
    findings.push({ type: 'force', critere: c.critere, titre: `Critère ${c.critere} — ${CRITERES_LABELS[c.critere]}`, description: `Tous les indicateurs conformes (${c.conformes}/${c.total})`, severity: 'low' });
  });
  if (centreData && centreData.avgSatisfaction >= 4) {
    findings.push({ type: 'force', titre: 'Satisfaction élevée', description: `Moyenne ${centreData.avgSatisfaction}/5 — Objectif atteint`, severity: 'low' });
  }
  if (centreData && centreData.pctDocsObligatoires >= 90) {
    findings.push({ type: 'force', titre: 'Documentation solide', description: `${centreData.pctDocsObligatoires}% des documents obligatoires en place`, severity: 'low' });
  }
  if (centreData && centreData.sessionsCompletes > 0) {
    findings.push({ type: 'force', titre: `${centreData.sessionsCompletes} session(s) 100% conforme(s)`, description: 'Dossiers complets avec tous les documents requis', severity: 'low' });
  }

  // Points faibles
  conformesByCritere.filter(c => c.taux > 0 && c.taux < 80).forEach(c => {
    findings.push({ type: 'faiblesse', critere: c.critere, titre: `Critère ${c.critere} — ${CRITERES_LABELS[c.critere]}`, description: `${c.taux}% de conformité (${c.conformes}/${c.total})`, severity: c.taux < 50 ? 'high' : 'medium' });
  });
  if (centreData && centreData.tauxSatisfaction < 80) {
    findings.push({ type: 'faiblesse', titre: 'Couverture satisfaction insuffisante', description: `${centreData.tauxSatisfaction}% des sessions terminées avec enquête`, severity: 'high', actionRecommandee: 'Envoyer enquêtes aux sessions terminées' });
  }

  // Documents manquants — connecté aux sessions réelles
  conformesByCritere.filter(c => c.taux === 0 && c.total > 0).forEach(c => {
    findings.push({ type: 'manquant', critere: c.critere, titre: `Critère ${c.critere} — Aucun conforme`, description: `0/${c.total} indicateurs — Risque majeur en audit`, severity: 'high' });
  });
  if (centreData) {
    const sessionsSansProg = centreData.sessionsConformite.filter(s => !s.hasProgramme);
    if (sessionsSansProg.length > 0) {
      findings.push({ type: 'manquant', critere: 1, titre: `${sessionsSansProg.length} session(s) sans programme`, description: 'Programme de formation obligatoire (Critère 1)', severity: 'high', actionRecommandee: 'Associer programmes via le catalogue' });
    }
    const sessionsSansEmarg = centreData.sessionsConformite.filter(s => !s.hasEmargement && s.statut !== 'a_venir');
    if (sessionsSansEmarg.length > 0) {
      findings.push({ type: 'manquant', critere: 4, titre: `${sessionsSansEmarg.length} session(s) sans émargement`, description: 'Feuille d\'émargement obligatoire (Critère 4)', severity: 'high', actionRecommandee: 'Générer les feuilles d\'émargement' });
    }
    const sessionsSansConv = centreData.sessionsConformite.filter(s => !s.hasConvention && s.nbInscrits > 0);
    if (sessionsSansConv.length > 0) {
      findings.push({ type: 'manquant', titre: `${sessionsSansConv.length} session(s) sans convention/contrat`, description: 'Document contractuel obligatoire', severity: 'high', actionRecommandee: 'Envoyer conventions depuis fiches apprenants' });
    }
  }
  if (centreData && centreData.totalEmargements === 0 && centreData.totalSessions > 0) {
    findings.push({ type: 'manquant', titre: 'Aucune feuille d\'émargement', description: 'Les émargements sont obligatoires pour chaque session', severity: 'high' });
  }
  if (centreData && centreData.tauxEnquetesFroid === 0 && centreData.sessionsTerminees > 0) {
    findings.push({ type: 'manquant', titre: 'Enquêtes à froid inexistantes', description: 'Aucune enquête J+30 réalisée', severity: 'medium' });
  }

  // Risques majeurs
  const actionsRetard = actions?.filter(a => 
    a.statut !== 'terminee' && a.statut !== 'annulee' && 
    a.date_echeance && new Date(a.date_echeance) < new Date()
  ).length || 0;
  if (actionsRetard > 0) {
    findings.push({ type: 'risque', titre: `${actionsRetard} action(s) corrective(s) en retard`, description: 'Risque majeur en audit — Actions non traitées dans les délais', severity: 'high' });
  }
  if (centreData && centreData.scoreConformite < 50) {
    findings.push({ type: 'risque', titre: 'Score conformité critique', description: `${centreData.scoreConformite}/100 — Risque élevé de non-conformité`, severity: 'high' });
  }
  if (!centreFormation?.qualiopi_numero) {
    findings.push({ type: 'risque', titre: 'N° Qualiopi non renseigné', description: 'Numéro de certification absent des paramètres', severity: 'medium' });
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
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {verdict === 'favorable' ? '✅ Prêt pour audit' :
                   verdict === 'reserve' ? '⚠️ Points à sécuriser' :
                   '🔴 Actions correctives urgentes'}
                </h3>
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Basé sur données réelles
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {forces.length} point(s) fort(s) • {risques.length + manquants.length} risque(s) • {faiblesses.length} point(s) faible(s)
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

      {/* Plan d'action immédiat — Top 5 critiques */}
      {(risques.length > 0 || manquants.filter(m => m.severity === 'high').length > 0) && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              🎯 Plan d'action immédiat
              <Badge variant="destructive">{Math.min(5, risques.length + manquants.filter(m => m.severity === 'high').length)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...risques, ...manquants.filter(m => m.severity === 'high')].slice(0, 5).map((finding, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <span className="font-bold text-destructive text-sm shrink-0 mt-0.5">#{idx + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{finding.titre}</p>
                    <p className="text-xs text-muted-foreground">{finding.description}</p>
                    {finding.actionRecommandee && (
                      <p className="text-xs text-primary font-medium mt-1">→ {finding.actionRecommandee}</p>
                    )}
                  </div>
                  {finding.critere && (
                    <Badge variant="outline" className="text-xs shrink-0">C{finding.critere}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions à risque */}
      {centreData && centreData.sessionsNonConformes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5 text-orange-500" />
              Sessions à risque pour l'audit
              <Badge variant="secondary">{centreData.sessionsNonConformes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {centreData.sessionsNonConformes.slice(0, 5).map(session => (
                <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{session.nom}</p>
                      <Badge variant="outline" className="text-xs">{session.formation_type}</Badge>
                    </div>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {session.problemes.map((p, i) => (
                        <span key={i} className="text-xs text-destructive">• {p}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={session.nbProblemes >= 3 ? 'destructive' : 'secondary'} className="text-xs">
                      {session.nbProblemes} pb
                    </Badge>
                    {session.actionRecommandee && (
                      <p className="text-xs text-primary mt-1">→ {session.actionRecommandee}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résumé par catégorie */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5 text-green-500" />} label="Points forts" count={forces.length} />
        <SummaryCard icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />} label="Points faibles" count={faiblesses.length} />
        <SummaryCard icon={<FileText className="h-5 w-5 text-orange-500" />} label="Docs manquants" count={manquants.length} />
        <SummaryCard icon={<ShieldAlert className="h-5 w-5 text-destructive" />} label="Risques majeurs" count={risques.length} />
      </div>

      {/* Détail par section */}
      {risques.length > 0 && (
        <FindingsSection title="🔴 Risques majeurs" findings={risques} borderColor="border-destructive/30" bgColor="bg-destructive/5" />
      )}
      {manquants.length > 0 && (
        <FindingsSection title="📋 Documents manquants" findings={manquants} borderColor="border-orange-500/30" bgColor="bg-orange-500/5" />
      )}
      {faiblesses.length > 0 && (
        <FindingsSection title="⚠️ Points faibles" findings={faiblesses} borderColor="border-yellow-500/30" bgColor="bg-yellow-500/5" />
      )}
      {forces.length > 0 && (
        <FindingsSection title="✅ Points forts" findings={forces} borderColor="border-green-500/30" bgColor="bg-green-500/5" />
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

function SummaryCard({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
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
                  {finding.actionRecommandee && (
                    <p className="text-xs text-primary font-medium mt-1">→ {finding.actionRecommandee}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {finding.critere && (
                    <Badge variant="outline" className="text-xs">C{finding.critere}</Badge>
                  )}
                  <Badge variant={
                    finding.severity === 'high' ? 'destructive' :
                    finding.severity === 'medium' ? 'secondary' : 'outline'
                  } className="text-xs">
                    {finding.severity === 'high' ? 'Critique' :
                     finding.severity === 'medium' ? 'Important' : 'Mineur'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
