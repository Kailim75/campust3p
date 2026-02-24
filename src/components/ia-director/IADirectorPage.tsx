import { useState, useEffect } from "react";
import { useProspectScorings, useRunProspectScoring } from "@/hooks/useProspectScoring";
import { useLatestScoreHistory, useScoreHistoryTrend, useRunCentreScoring } from "@/hooks/useScoreHistory";
import { useProspects } from "@/hooks/useProspects";
import { useQuickAudit, useDeepAudit } from "@/hooks/useAuditEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Zap, RefreshCw, BarChart3, Search, History, AlertTriangle, Shield,
} from "lucide-react";
import { generateRecommendations } from "./recommendationEngine";
import IADirectorDashboard from "./IADirectorDashboard";
import AuditAnomaliesTab from "./AuditAnomaliesTab";
import ActionsHistoryTab from "./ActionsHistoryTab";
import { cn } from "@/lib/utils";

export default function IADirectorPage() {
  const { data: scorings, isLoading } = useProspectScorings();
  const { data: prospects } = useProspects();
  const { data: latestScore, isLoading: scoreLoading } = useLatestScoreHistory();
  const { data: trend } = useScoreHistoryTrend(30);
  const runScoring = useRunProspectScoring();
  const runCentreScoring = useRunCentreScoring();

  const quickAudit = useQuickAudit();
  const deepAudit = useDeepAudit();

  const prospectMap = new Map((prospects || []).map(p => [p.id, p]));

  const chartData = (trend || []).map(t => ({
    date: new Date(t.date_snapshot).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    global: t.score_global,
    sante: t.score_sante,
    commercial: t.score_commercial,
    financier: t.score_financier,
  }));

  const recommendations = generateRecommendations(scorings || [], latestScore || null);

  // Auto-run quick audit on mount
  useEffect(() => {
    if (!quickAudit.result && !quickAudit.isRunning) {
      quickAudit.run();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRunAll = async () => {
    runScoring.mutate();
    runCentreScoring.mutate(undefined);
    quickAudit.run();
  };

  const isRunning = runScoring.isPending || runCentreScoring.isPending;

  // Use deep audit results if available, fallback to quick
  const currentAudit = deepAudit.result || quickAudit.result;
  const anomalies = currentAudit?.anomalies || [];
  const totalImpact = currentAudit?.total_impact_euros || 0;
  const criticalCount = currentAudit?.scores_summary.critical || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            IA Director
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Moteur d'audit stratégique — Détection, impact & actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => deepAudit.run()}
            disabled={deepAudit.isRunning}
            className="gap-2"
          >
            {deepAudit.isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {deepAudit.isRunning ? "Audit en cours..." : "Audit approfondi"}
          </Button>
          <Button onClick={handleRunAll} disabled={isRunning} className="gap-2">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isRunning ? "Analyse..." : "Analyse rapide"}
          </Button>
        </div>
      </div>

      {/* Quick Impact Strip */}
      {currentAudit && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className={cn(totalImpact > 0 && "border-primary/20")}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {totalImpact.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
              </p>
              <p className="text-xs text-muted-foreground">Impact total estimé</p>
            </CardContent>
          </Card>
          <Card className={cn(criticalCount > 0 && "border-destructive/30")}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Critiques</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{currentAudit.scores_summary.high}</p>
              <p className="text-xs text-muted-foreground">Hautes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{anomalies.length}</p>
              <p className="text-xs text-muted-foreground">Total anomalies</p>
              <Badge variant="outline" className="text-[10px] mt-1">
                {currentAudit.mode === "deep" ? "Audit approfondi" : "Analyse rapide"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Search className="h-4 w-4" />
            Audit & Anomalies
            {criticalCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {criticalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <History className="h-4 w-4" />
            Actions exécutées
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          <IADirectorDashboard
            latestScore={latestScore || null}
            scoreLoading={scoreLoading}
            scorings={scorings || []}
            prospectMap={prospectMap}
            chartData={chartData}
            recommendations={recommendations}
            anomalies={anomalies}
          />
        </TabsContent>

        {/* TAB 2: AUDIT & ANOMALIES */}
        <TabsContent value="audit" className="space-y-6">
          <AuditAnomaliesTab
            anomalies={anomalies}
            isLoading={quickAudit.isRunning || deepAudit.isRunning}
          />
        </TabsContent>

        {/* TAB 3: ACTIONS HISTORY */}
        <TabsContent value="actions" className="space-y-6">
          <ActionsHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
