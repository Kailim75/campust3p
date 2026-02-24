import { useState } from "react";
import { useProspectScorings, useRunProspectScoring } from "@/hooks/useProspectScoring";
import { useLatestScoreHistory, useScoreHistoryTrend, useRunCentreScoring } from "@/hooks/useScoreHistory";
import { useProspects } from "@/hooks/useProspects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Zap, TrendingUp, Target, Clock, Flame, ThermometerSun, Snowflake,
  AlertTriangle, RefreshCw, DollarSign, Activity, ShieldCheck, FileText,
  CreditCard, BarChart3, Lightbulb,
} from "lucide-react";
import { generateRecommendations } from "./recommendationEngine";
import RecommendationsPanel from "./RecommendationsPanel";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const chaleurConfig = {
  brulant: { label: "Brûlant", icon: Flame, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  chaud: { label: "Chaud", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  tiede: { label: "Tiède", icon: ThermometerSun, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  froid: { label: "Froid", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
};

const scoreConfig = [
  { key: "score_sante", label: "Santé CRM", icon: Activity, description: "Qualité & complétude des données" },
  { key: "score_commercial", label: "Commercial", icon: TrendingUp, description: "Pipeline & conversion prospects" },
  { key: "score_admin", label: "Administratif", icon: FileText, description: "Sessions, inscriptions & remplissage" },
  { key: "score_financier", label: "Financier", icon: CreditCard, description: "Paiements & facturation" },
  { key: "score_risque_ca", label: "Risque CA", icon: ShieldCheck, description: "Protection chiffre d'affaires" },
];

function getScoreColor(score: number) {
  if (score >= 75) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  if (score >= 25) return "text-orange-500";
  return "text-red-500";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  if (score >= 40) return "Moyen";
  if (score >= 20) return "Faible";
  return "Critique";
}

export default function IADirectorPage() {
  const { data: scorings, isLoading } = useProspectScorings();
  const { data: prospects } = useProspects();
  const { data: latestScore, isLoading: scoreLoading } = useLatestScoreHistory();
  const { data: trend } = useScoreHistoryTrend(30);
  const runScoring = useRunProspectScoring();
  const runCentreScoring = useRunCentreScoring();
  const [selectedChaleur, setSelectedChaleur] = useState<string | null>(null);

  const prospectMap = new Map((prospects || []).map(p => [p.id, p]));

  const filtered = selectedChaleur
    ? (scorings || []).filter(s => s.niveau_chaleur === selectedChaleur)
    : scorings || [];

  const summary = {
    brulant: (scorings || []).filter(s => s.niveau_chaleur === "brulant").length,
    chaud: (scorings || []).filter(s => s.niveau_chaleur === "chaud").length,
    tiede: (scorings || []).filter(s => s.niveau_chaleur === "tiede").length,
    froid: (scorings || []).filter(s => s.niveau_chaleur === "froid").length,
    valeurTotale: (scorings || []).reduce((sum, s) => sum + Number(s.valeur_potentielle_euros), 0),
  };

  const prioritesJour = (scorings || [])
    .filter(s => s.niveau_chaleur === "brulant" || s.niveau_chaleur === "chaud")
    .sort((a, b) => b.score_conversion - a.score_conversion)
    .slice(0, 5);

  const handleRunAll = async () => {
    runScoring.mutate();
    runCentreScoring.mutate(undefined);
  };

  const isRunning = runScoring.isPending || runCentreScoring.isPending;

  // Chart data
  const chartData = (trend || []).map(t => ({
    date: new Date(t.date_snapshot).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    global: t.score_global,
    sante: t.score_sante,
    commercial: t.score_commercial,
    financier: t.score_financier,
  }));

  const recommendations = generateRecommendations(scorings || [], latestScore || null);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            IA Director
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Intelligence stratégique — Scoring global & Prospect Intelligence
          </p>
        </div>
        <Button onClick={handleRunAll} disabled={isRunning} className="gap-2">
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isRunning ? "Analyse en cours..." : "Lancer l'analyse complète"}
        </Button>
      </div>

      <Tabs defaultValue="centre" className="space-y-6">
        <TabsList>
          <TabsTrigger value="centre" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Scoring Centre
          </TabsTrigger>
          <TabsTrigger value="prospects" className="gap-2">
            <Target className="h-4 w-4" />
            Prospect Intelligence
          </TabsTrigger>
          <TabsTrigger value="recommandations" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommandations
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════ */}
        {/* TAB: SCORING CENTRE                     */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="centre" className="space-y-6">
          {/* Score Global */}
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Score Global Centre</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className={cn("text-5xl font-bold", getScoreColor(latestScore?.score_global || 0))}>
                      {latestScore?.score_global ?? "—"}
                    </span>
                    <span className="text-muted-foreground text-lg mb-1">/100</span>
                  </div>
                  <Badge variant="outline" className="mt-2">
                    {latestScore ? getScoreLabel(latestScore.score_global) : "Non calculé"}
                  </Badge>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {latestScore && (
                    <>
                      <p>Dernier snapshot</p>
                      <p className="font-medium text-foreground">
                        {new Date(latestScore.date_snapshot).toLocaleDateString("fr-FR")}
                      </p>
                      <p className="mt-1">Pondérations</p>
                      {latestScore.ponderations && Object.entries(latestScore.ponderations).map(([k, v]) => (
                        <p key={k}>{k}: {Math.round(Number(v) * 100)}%</p>
                      ))}
                    </>
                  )}
                </div>
              </div>
              {latestScore && <Progress value={latestScore.score_global} className="mt-4 h-3" />}
            </CardContent>
          </Card>

          {/* 5 Sub-scores */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {scoreConfig.map(({ key, label, icon: Icon, description }) => {
              const value = latestScore ? (latestScore as any)[key] ?? 0 : 0;
              const detail = latestScore?.details?.[key.replace("score_", "")] || {};
              return (
                <Card key={key} className="group hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-end gap-1">
                      <span className={cn("text-3xl font-bold", getScoreColor(value))}>{value}</span>
                      <span className="text-muted-foreground text-xs mb-1">/100</span>
                    </div>
                    <Progress value={value} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
                    {/* Show top detail items */}
                    {Object.entries(detail).slice(0, 3).map(([dk, dv]) => (
                      <div key={dk} className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">{dk.replace(/_/g, " ")}</span>
                        <span className="font-medium text-foreground">
                          {typeof dv === "number" ? dv.toLocaleString("fr-FR") : String(dv)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Trend Chart */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Évolution des scores (30 jours)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="global" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Global" />
                      <Area type="monotone" dataKey="sante" stroke="#22c55e" fill="#22c55e" fillOpacity={0.05} strokeWidth={1} name="Santé" />
                      <Area type="monotone" dataKey="commercial" stroke="#f97316" fill="#f97316" fillOpacity={0.05} strokeWidth={1} name="Commercial" />
                      <Area type="monotone" dataKey="financier" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} strokeWidth={1} name="Financier" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {!latestScore && !scoreLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun scoring centre disponible</p>
              <p className="text-sm">Cliquez sur "Lancer l'analyse complète" pour générer le premier snapshot</p>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════ */}
        {/* TAB: PROSPECT INTELLIGENCE              */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="prospects" className="space-y-6">
          {/* Chaleur KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(chaleurConfig) as [string, typeof chaleurConfig.brulant][]).map(([key, cfg]) => {
              const count = summary[key as keyof typeof summary] as number;
              const Icon = cfg.icon;
              return (
                <Card
                  key={key}
                  className={cn("cursor-pointer transition-all hover:shadow-md border", cfg.border, selectedChaleur === key && "ring-2 ring-primary")}
                  onClick={() => setSelectedChaleur(selectedChaleur === key ? null : key)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", cfg.bg)}>
                      <Icon className={cn("h-5 w-5", cfg.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground">{cfg.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Impact + Priorités */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Impact Financier Estimé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-4xl font-bold text-foreground">
                  {summary.valeurTotale.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                </span>
                <p className="text-xs text-muted-foreground mt-1">Valeur pondérée du pipeline prospect</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Priorités du Jour
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-4xl font-bold text-foreground">{prioritesJour.length}</span>
                <p className="text-xs text-muted-foreground mt-1">Prospects à relancer en priorité</p>
              </CardContent>
            </Card>
          </div>

          {/* Priorités journalières */}
          {prioritesJour.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Priorités Journalières — Top Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prioritesJour.map((s, i) => {
                  const prospect = prospectMap.get(s.prospect_id);
                  const cfg = chaleurConfig[s.niveau_chaleur];
                  return (
                    <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {prospect ? `${prospect.prenom} ${prospect.nom}` : "Prospect inconnu"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {prospect?.formation_souhaitee || "Aucune formation"} · Relance dans {s.delai_optimal_relance}j
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(cfg.bg, cfg.color, cfg.border)}>
                        {s.score_conversion}/100
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">
                        {Number(s.valeur_potentielle_euros).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Scoring table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Scoring des Prospects {selectedChaleur && `— ${chaleurConfig[selectedChaleur as keyof typeof chaleurConfig]?.label}`}
                <span className="text-muted-foreground font-normal ml-2 text-sm">({filtered.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Aucun scoring disponible</p>
                  <p className="text-sm">Lancez l'analyse pour scorer vos prospects</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium text-muted-foreground">Prospect</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Score</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Chaleur</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Valeur €</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Relance</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Facteurs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((s) => {
                        const prospect = prospectMap.get(s.prospect_id);
                        const cfg = chaleurConfig[s.niveau_chaleur];
                        const Icon = cfg.icon;
                        return (
                          <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <p className="font-medium text-foreground">
                                {prospect ? `${prospect.prenom} ${prospect.nom}` : "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">{prospect?.formation_souhaitee || ""}</p>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-2">
                                <Progress value={s.score_conversion} className="w-16 h-1.5" />
                                <span className="font-semibold text-foreground">{s.score_conversion}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className={cn("gap-1", cfg.bg, cfg.color, cfg.border)}>
                                <Icon className="h-3 w-3" />
                                {cfg.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-right font-semibold text-foreground">
                              {Number(s.valeur_potentielle_euros).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                            </td>
                            <td className="p-3 text-center text-muted-foreground">{s.delai_optimal_relance}j</td>
                            <td className="p-3 max-w-[200px]">
                              <div className="flex flex-wrap gap-1">
                                {(s.facteurs_positifs || []).slice(0, 2).map((f, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 truncate max-w-[120px]">{f}</span>
                                ))}
                                {(s.facteurs_negatifs || []).slice(0, 1).map((f, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive truncate max-w-[120px]">{f}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ═══════════════════════════════════════ */}
        {/* TAB: RECOMMANDATIONS                    */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="recommandations" className="space-y-6">
          <RecommendationsPanel recommendations={recommendations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
