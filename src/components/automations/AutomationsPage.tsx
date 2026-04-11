import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunicationsPage } from "@/components/communications/CommunicationsPage";
import { WorkflowsPage } from "@/components/workflows/WorkflowsPage";
import TemplateStudioPage from "@/components/template-studio/TemplateStudioPage";
import IADirectorPage from "@/components/ia-director/IADirectorPage";
import { ArrowRight, Mail, Palette, Sparkles, Workflow, Zap } from "lucide-react";

const TAB_META = {
  communications: {
    icon: Mail,
    badge: "Relation client",
    title: "Communications et relances",
    description: "Gardez les envois, réponses et relances dans un même espace lisible pour l'équipe.",
    helper: "À utiliser quand l'objectif est de faire partir quelque chose, répondre, ou garder une trace côté CRM.",
  },
  workflows: {
    icon: Workflow,
    badge: "Moteur métier",
    title: "Déclencheurs, règles et supervision",
    description: "Surveillez les workflows actifs, les exécutions du jour et les automatisations à corriger.",
    helper: "C'est ici qu'on sécurise les déclencheurs automatiques et qu'on garde la maîtrise des incidents.",
  },
  templates: {
    icon: Palette,
    badge: "Production documentaire",
    title: "Templates et génération",
    description: "Structurez les modèles et la génération documentaire sans multiplier les chemins parallèles.",
    helper: "Utile pour harmoniser les contrats, programmes et documents générés avec la bonne logique métier.",
  },
  ia: {
    icon: Sparkles,
    badge: "Assistance IA",
    title: "Aides intelligentes et copilotes",
    description: "Regroupez les usages IA réellement utiles au quotidien au lieu d'ajouter des outils dispersés.",
    helper: "À réserver aux gains rapides : aide au contenu, génération guidée et accélération des tâches répétitives.",
  },
} as const;

export function AutomationsPage() {
  const [tab, setTab] = useState<keyof typeof TAB_META>("communications");
  const activeTab = TAB_META[tab];
  const ActiveTabIcon = activeTab.icon;

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Automations</h1>
            <p className="text-sm text-muted-foreground">
              Communications, workflows, templates et IA dans une vue plus claire pour le pilotage quotidien.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <Workflow className="h-3.5 w-3.5" />
              Automatisation métier
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Mail className="h-3.5 w-3.5" />
              Communications
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Assistance IA
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <Tabs value={tab} onValueChange={(value) => setTab(value as keyof typeof TAB_META)}>
          <Card className="mb-5 border-dashed bg-muted/20">
            <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <Badge variant="secondary" className="w-fit gap-1.5">
                  <ActiveTabIcon className="h-3.5 w-3.5" />
                  {activeTab.badge}
                </Badge>
                <div>
                  <h2 className="text-base font-semibold text-foreground">{activeTab.title}</h2>
                  <p className="text-sm text-muted-foreground">{activeTab.description}</p>
                </div>
              </div>
              <div className="flex max-w-md items-start gap-2 rounded-lg border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>{activeTab.helper}</span>
              </div>
            </CardContent>
          </Card>

          <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-2 bg-muted/50 p-1 lg:grid-cols-4">
            <TabsTrigger value="communications" className="gap-1.5 text-xs">
              <Mail className="h-3.5 w-3.5" /> Communications
            </TabsTrigger>
            <TabsTrigger value="workflows" className="gap-1.5 text-xs">
              <Workflow className="h-3.5 w-3.5" /> Workflows
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 text-xs">
              <Palette className="h-3.5 w-3.5" /> Templates
            </TabsTrigger>
            <TabsTrigger value="ia" className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" /> IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="communications">
            <CommunicationsPage />
          </TabsContent>
          <TabsContent value="workflows">
            <WorkflowsPage />
          </TabsContent>
          <TabsContent value="templates">
            <TemplateStudioPage />
          </TabsContent>
          <TabsContent value="ia">
            <IADirectorPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
