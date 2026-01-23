import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Award, Star, BarChart3, ClipboardList, CheckSquare, Calendar } from "lucide-react";
import QualiopiDashboard from "@/components/qualiopi/QualiopiDashboard";
import QualiopiCriteres from "@/components/qualiopi/QualiopiCriteres";
import QualiopiActions from "@/components/qualiopi/QualiopiActions";
import QualiopiAudits from "@/components/qualiopi/QualiopiAudits";
import QualiteClientPage from "./QualiteClientPage";
import { useQualiopiIndicateurs } from "@/hooks/useQualiopiIndicateurs";
import { useQualiopiActions } from "@/hooks/useQualiopiActions";

const TABS = ['qualiopi', 'criteres', 'actions', 'audits', 'satisfaction'] as const;
type TabValue = (typeof TABS)[number];

export function QualiteUnifiedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { indicateurs = [] } = useQualiopiIndicateurs();
  const { actions = [] } = useQualiopiActions();

  const tab = useMemo<TabValue>(() => {
    const t = searchParams.get('qtab') as TabValue | null;
    return t && TABS.includes(t) ? t : 'qualiopi';
  }, [searchParams]);

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

  return (
    <div className="space-y-6">
      <Header 
        title="Qualité & Conformité" 
        subtitle={`${conformiteRate}% de conformité QUALIOPI • ${actionsEnCours} actions en cours`}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-elevated p-4 border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">Conformité QUALIOPI</p>
          </div>
          <p className="text-2xl font-bold">{conformiteRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {conformeCount}/{totalIndicateurs} indicateurs
          </p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">Actions en cours</p>
          <p className="text-2xl font-bold">{actionsEnCours}</p>
        </div>
        <div className="card-elevated p-4 border-success/20">
          <p className="text-sm text-muted-foreground">Indicateurs conformes</p>
          <p className="text-2xl font-bold text-success">{conformeCount}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">Non conformes</p>
          <p className="text-2xl font-bold text-warning">
            {indicateurs.filter(i => i.statut === 'non_conforme').length}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="qualiopi" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="criteres" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Critères</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Actions</span>
            {actionsEnCours > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {actionsEnCours}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audits" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Audits</span>
          </TabsTrigger>
          <TabsTrigger value="satisfaction" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Satisfaction</span>
          </TabsTrigger>
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

        <TabsContent value="satisfaction">
          <QualiteClientPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
