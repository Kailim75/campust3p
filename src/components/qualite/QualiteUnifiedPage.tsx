import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigation } from "@/contexts/NavigationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Star, BarChart3, ClipboardList, CheckSquare, Calendar, Target, Shield } from "lucide-react";
import QualiopiDashboard from "@/components/qualiopi/QualiopiDashboard";
import QualiopiCriteres from "@/components/qualiopi/QualiopiCriteres";
import QualiopiActions from "@/components/qualiopi/QualiopiActions";
import QualiopiAudits from "@/components/qualiopi/QualiopiAudits";
import QualiopiSimulation from "@/components/qualiopi/QualiopiSimulation";
import QualiteClientPage from "./QualiteClientPage";
import { useQualiopiIndicateurs } from "@/hooks/useQualiopiIndicateurs";
import { useQualiopiActions } from "@/hooks/useQualiopiActions";
import { useQualiopiCentreData } from "@/hooks/useQualiopiCentreData";

const TAB_CONFIG = [
  {
    value: "qualiopi",
    label: "Dashboard",
    mobileLabel: "Vue",
    description: "Vue d'ensemble de la conformité, des alertes et des sessions à surveiller.",
    icon: BarChart3,
  },
  {
    value: "criteres",
    label: "Critères",
    mobileLabel: "Crit.",
    description: "Pilotage détaillé des critères et indicateurs Qualiopi.",
    icon: ClipboardList,
  },
  {
    value: "actions",
    label: "Actions",
    mobileLabel: "Actions",
    description: "Plan de correction et tâches de mise en conformité en cours.",
    icon: CheckSquare,
  },
  {
    value: "audits",
    label: "Audits",
    mobileLabel: "Audits",
    description: "Suivi des audits, échéances et historiques de contrôle.",
    icon: Calendar,
  },
  {
    value: "simulation",
    label: "Prépa Audit",
    mobileLabel: "Prépa",
    description: "Préparation opérationnelle avant audit avec points faibles et risques.",
    icon: Target,
  },
  {
    value: "satisfaction",
    label: "Satisfaction",
    mobileLabel: "Satis.",
    description: "Suivi de la satisfaction client et des retours apprenants.",
    icon: Star,
  },
] as const;

type TabValue = (typeof TAB_CONFIG)[number]["value"];
const TABS = TAB_CONFIG.map((tab) => tab.value);

export function QualiteUnifiedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { indicateurs = [] } = useQualiopiIndicateurs();
  const { actions = [] } = useQualiopiActions();
  const { data: centreData } = useQualiopiCentreData();

  const tab = useMemo<TabValue>(() => {
    const t = searchParams.get('qtab') as TabValue | null;
    return t && TABS.includes(t) ? t : 'qualiopi';
  }, [searchParams]);

  const currentTab = useMemo(
    () => TAB_CONFIG.find((config) => config.value === tab) ?? TAB_CONFIG[0],
    [tab],
  );

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('qtab', value);
    if (value !== 'criteres') next.delete('qcrit');
    setSearchParams(next, { replace: true });
  };

  // Stats
  const conformeCount = indicateurs.filter(i => i.statut === 'conforme').length;
  const totalIndicateurs = indicateurs.length || 32;
  const conformiteRate = totalIndicateurs > 0 ? Math.round((conformeCount / totalIndicateurs) * 100) : 0;
  const actionsEnCours = actions.filter(a => a.statut !== 'terminee' && a.statut !== 'annulee').length;
  const scoreConformite = centreData?.scoreConformite || conformiteRate;
  const sessionsNonConformesCount = centreData?.sessionsNonConformes.length || 0;
  const topCritiquesCount = centreData?.topCritiques.length || 0;
  const avgSatisfaction = centreData?.avgSatisfaction || 0;
  const totalSatisfactionReponses = centreData?.totalSatisfactionReponses || 0;

  const { setActiveTab } = useNavigation();
  
  useEffect(() => {
    setActiveTab(tab);
  }, [tab, setActiveTab]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Centre Qualiopi" 
        subtitle={`${scoreConformite}% de conformité • ${actionsEnCours} action${actionsEnCours > 1 ? "s" : ""} en cours`}
      />

      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold">{currentTab.label}</p>
                <p className="text-xs text-muted-foreground">{currentTab.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={centreData?.isQualiopiReady ? "default" : "secondary"} className="gap-1 text-[11px]">
                  <Shield className="h-3 w-3" />
                  {centreData?.isQualiopiReady ? "Audit-ready" : "À renforcer"}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {actionsEnCours} action{actionsEnCours > 1 ? "s" : ""} ouverte{actionsEnCours > 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {sessionsNonConformesCount} session{sessionsNonConformesCount > 1 ? "s" : ""} à régulariser
                </Badge>
                {topCritiquesCount > 0 && (
                  <Badge variant="destructive" className="text-[11px]">
                    {topCritiquesCount} point{topCritiquesCount > 1 ? "s" : ""} critique{topCritiquesCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            <div className="rounded-lg border bg-background px-3 py-2 text-xs">
              <p className="font-medium">Repère rapide</p>
              <p className="text-muted-foreground">{conformeCount}/{totalIndicateurs} indicateurs conformes</p>
              <p className="mt-1 text-muted-foreground">
                Satisfaction moyenne : {avgSatisfaction}/5 sur {totalSatisfactionReponses} réponse{totalSatisfactionReponses > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Score conformité</p>
                </div>
                <p className="text-2xl font-bold">{scoreConformite}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {centreData?.isQualiopiReady ? "Niveau compatible audit" : "Des écarts restent à corriger"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckSquare className="h-4 w-4 text-amber-500" />
                  <p className="text-sm text-muted-foreground">Actions en cours</p>
                </div>
                <p className="text-2xl font-bold">{actionsEnCours}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Priorité à la clôture des actions critiques
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-muted-foreground">Indicateurs conformes</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{conformeCount}/{totalIndicateurs}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalIndicateurs - conformeCount} reste{totalIndicateurs - conformeCount > 1 ? "nt" : ""} à sécuriser
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm text-muted-foreground">Satisfaction</p>
                </div>
                <p className="text-2xl font-bold">{avgSatisfaction}/5</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalSatisfactionReponses} réponse{totalSatisfactionReponses > 1 ? "s" : ""} collectée{totalSatisfactionReponses > 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          {TAB_CONFIG.map(({ value, label, mobileLabel, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{mobileLabel}</span>
              {value === "actions" && actionsEnCours > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {actionsEnCours}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="qualiopi">
          <QualiopiDashboard />
        </TabsContent>

        <TabsContent value="criteres">
          <QualiopiCriteres />
        </TabsContent>

        <TabsContent value="actions">
          <QualiopiActions />
        </TabsContent>

        <TabsContent value="audits">
          <QualiopiAudits />
        </TabsContent>

        <TabsContent value="simulation">
          <QualiopiSimulation />
        </TabsContent>

        <TabsContent value="satisfaction">
          <QualiteClientPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
