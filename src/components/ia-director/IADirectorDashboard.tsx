import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, TrendingUp, FileText, CreditCard, ShieldCheck,
  DollarSign, AlertTriangle, Flame, Clock, Target,
  ThermometerSun, Snowflake, BarChart3, Eye, LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { ProspectScoring } from "@/hooks/useProspectScoring";
import type { ScoreHistory } from "@/hooks/useScoreHistory";
import type { Recommendation } from "./recommendationEngine";
import type { Anomaly } from "./audit/types";
import FinancialProjectionsCard from "./projections/FinancialProjectionsCard";
import { useFinancialProjections } from "./projections/useFinancialProjections";
import { useState } from "react";
import { Button } from "@/components/ui/button";
const scoreConfig = [
  { key: "score_sante", label: "Santé CRM", icon: Activity, description: "Qualité & complétude des données" },
  { key: "score_commercial", label: "Commercial", icon: TrendingUp, description: "Pipeline & conversion prospects" },
  { key: "score_admin", label: "Administratif", icon: FileText, description: "Sessions, inscriptions & remplissage" },
  { key: "score_financier", label: "Financier", icon: CreditCard, description: "Paiements & facturation" },
  { key: "score_risque_ca", label: "Risque CA", icon: ShieldCheck, description: "Protection chiffre d'affaires" },
];

const chaleurConfig = {
  brulant: { label: "Brûlant", icon: Flame, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  chaud: { label: "Chaud", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  tiede: { label: "Tiède", icon: ThermometerSun, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  froid: { label: "Froid", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
};

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

interface Props {
  latestScore: ScoreHistory | null;
  scoreLoading: boolean;
  scorings: ProspectScoring[];
  prospectMap: Map<string, any>;
  chartData: { date: string; global: number; sante: number; commercial: number; financier: number }[];
  recommendations: Recommendation[];
  anomalies?: Anomaly[];
  onSelectAnomaly?: (anomaly: Anomaly) => void;
}

export default function IADirectorDashboard({
  latestScore,
  scoreLoading,
  scorings,
  prospectMap,
  chartData,
  recommendations,
  anomalies = [],
  onSelectAnomaly,
}: Props) {
  const [viewMode, setViewMode] = useState<"executive" | "analytical">("executive");
  const { data: projectionData, isLoading: projLoading } = useFinancialProjections(scorings);
  const pipelineCA = scorings.reduce((sum, s) => sum + Number(s.valeur_potentielle_euros), 0);

  const top10Chauds = scorings
    .filter((s) => s.niveau_chaleur === "brulant" || s.niveau_chaleur === "chaud")
    .sort((a, b) => b.score_conversion - a.score_conversion)
    .slice(0, 10);

  const prioritesJour = scorings
    .filter((s) => (s.niveau_chaleur === "brulant" || s.niveau_chaleur === "chaud") && s.delai_optimal_relance !== null && s.delai_optimal_relance <= 3)
    .sort((a, b) => b.score_conversion - a.score_conversion)
    .slice(0, 5);

  const alertesCritiques = anomalies.length > 0
    ? anomalies.filter(a => a.severity === "critical" || a.severity === "high").slice(0, 5)
    : recommendations.filter((r) => r.priorite === "critique");

  if (!latestScore && !scoreLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Aucun scoring centre disponible</p>
        <p className="text-sm">Cliquez sur "Lancer l'analyse complète" pour générer le premier snapshot</p>
      </div>
    );
  }

  // Top 3 actions recommandées basées sur priority_score
  const top3Actions = anomalies
    .filter(a => a.status === "open" || !a.status)
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ── View Mode Toggle ── */}
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant={viewMode === "executive" ? "default" : "outline"}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setViewMode("executive")}
        >
          <Eye className="h-3.5 w-3.5" />
          Exécutif
        </Button>
        <Button
          variant={viewMode === "analytical" ? "default" : "outline"}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setViewMode("analytical")}
        >
          <LineChart className="h-3.5 w-3.5" />
          Analytique
        </Button>
      </div>

      {/* ── Financial Projections ── */}
      <FinancialProjectionsCard data={projectionData} isLoading={projLoading} viewMode={viewMode} />
      {top3Actions.length > 0 && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              Top 3 actions recommandées aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {top3Actions.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => onSelectAnomaly?.(a)}
                >
                  <span className="text-lg font-bold text-primary w-7 text-center">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">{a.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-foreground">{a.priority_score}</span>
                    <p className="text-[10px] text-muted-foreground">Priorité</p>
                  </div>
                  {a.impact_estime_euros > 0 && (
                    <span className="text-xs font-semibold text-foreground shrink-0">
                      {a.impact_estime_euros.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAnomaly?.(a);
                    }}
                  >
                    <Target className="h-3 w-3" />
                    Agir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* ── Row 1: Score Global + CA Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-primary/20 lg:col-span-2">
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
                  </>
                )}
              </div>
            </div>
            {latestScore && <Progress value={latestScore.score_global} className="mt-4 h-3" />}
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              CA Potentiel Pipeline
            </div>
            <span className="text-4xl font-bold text-foreground">
              {pipelineCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {scorings.length} prospect(s) scoré(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: 5 Sub-scores ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {scoreConfig.map(({ key, label, icon: Icon, description }) => {
          const value = latestScore ? (latestScore as any)[key] ?? 0 : 0;
          const detail = latestScore?.details?.[key.replace("score_", "")] || {};
          return (
            <Card key={key} className="group hover:shadow-md transition-all">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-4 pb-4">
                <div className="flex items-end gap-1">
                  <span className={cn("text-2xl font-bold", getScoreColor(value))}>{value}</span>
                  <span className="text-muted-foreground text-xs mb-0.5">/100</span>
                </div>
                <Progress value={value} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
                {Object.entries(detail).slice(0, 2).map(([dk, dv]) => (
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

      {/* ── Row 3: Alertes Critiques + Priorités du Jour ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alertes critiques */}
        <Card className={cn("border", alertesCritiques.length > 0 ? "border-destructive/30" : "")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className={cn("h-4 w-4", alertesCritiques.length > 0 ? "text-destructive" : "text-muted-foreground")} />
              Alertes Critiques
              {alertesCritiques.length > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs">{alertesCritiques.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertesCritiques.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune alerte critique</p>
            ) : (
              <div className="space-y-2">
                {alertesCritiques.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                    <p className="text-xs font-medium text-foreground">{a.title || a.action_recommandee}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{a.description || a.justification}</p>
                    {(a.impact_estime_euros > 0) && (
                      <span className="text-[10px] font-semibold text-destructive mt-1 inline-block">
                        Impact : {a.impact_estime_euros.toLocaleString("fr-FR")}€
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priorités du jour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Priorités du Jour
              <Badge variant="outline" className="ml-auto text-xs">{prioritesJour.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prioritesJour.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune priorité urgente</p>
            ) : (
              <div className="space-y-2">
                {prioritesJour.map((s, i) => {
                  const prospect = prospectMap.get(s.prospect_id);
                  const cfg = chaleurConfig[s.niveau_chaleur];
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {prospect ? `${prospect.prenom} ${prospect.nom}` : "Inconnu"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Relance dans {s.delai_optimal_relance}j
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", cfg.bg, cfg.color, cfg.border)}>
                        {s.score_conversion}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">
                        {Number(s.valeur_potentielle_euros).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {viewMode === "analytical" && (
      /* ── Row 4: Top 10 Prospects Chauds ── */
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Top 10 Prospects Chauds
            <span className="text-muted-foreground font-normal ml-1">({top10Chauds.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {top10Chauds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun prospect chaud/brûlant</p>
          ) : (
            <ScrollArea className="max-h-[380px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2.5 pl-4 font-medium text-muted-foreground text-xs">#</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Prospect</th>
                    <th className="text-center p-2.5 font-medium text-muted-foreground text-xs">Score</th>
                    <th className="text-center p-2.5 font-medium text-muted-foreground text-xs">Chaleur</th>
                    <th className="text-right p-2.5 font-medium text-muted-foreground text-xs">Valeur</th>
                    <th className="text-center p-2.5 pr-4 font-medium text-muted-foreground text-xs">Relance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {top10Chauds.map((s, i) => {
                    const prospect = prospectMap.get(s.prospect_id);
                    const cfg = chaleurConfig[s.niveau_chaleur];
                    const Icon = cfg.icon;
                    return (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 pl-4 text-muted-foreground font-medium">{i + 1}</td>
                        <td className="p-2.5">
                          <p className="font-medium text-foreground text-xs">
                            {prospect ? `${prospect.prenom} ${prospect.nom}` : "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{prospect?.formation_souhaitee || ""}</p>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <Progress value={s.score_conversion} className="w-12 h-1.5" />
                            <span className="font-semibold text-foreground text-xs">{s.score_conversion}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge variant="outline" className={cn("gap-1 text-[10px]", cfg.bg, cfg.color, cfg.border)}>
                            <Icon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-semibold text-foreground text-xs">
                          {Number(s.valeur_potentielle_euros).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                        </td>
                        <td className="p-2.5 pr-4 text-center text-muted-foreground text-xs">{s.delai_optimal_relance}j</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      )}

      {/* ── Row 5: Trend Chart ── */}
      {viewMode === "analytical" && chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Évolution des scores (30 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
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
    </div>
  );
}
