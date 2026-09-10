import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigation } from "@/contexts/NavigationContext";
import { CommunicationsPage } from "@/components/communications/CommunicationsPage";
import { WorkflowsPage } from "@/components/workflows/WorkflowsPage";
import TemplateStudioPage from "@/components/template-studio/TemplateStudioPage";
import { Mail, Workflow, Palette } from "lucide-react";

const VALID_TABS = ["templates", "communications", "workflows"] as const;

type AutomationTab = (typeof VALID_TABS)[number];

// Les modèles de documents ouvrent en premier : c'est la destination de
// « Générer un document » (menu Créer) et l'usage quotidien de la page.
// Un appelant peut viser un autre onglet via onNavigateWithParams(…, { tab })
// — ex. l'étape d'onboarding « Personnaliser un email » → communications.
function resolveTab(input?: string | null): AutomationTab {
  if (input && (VALID_TABS as readonly string[]).includes(input)) return input as AutomationTab;
  return "templates";
}

export function AutomationsPage() {
  const { activeTab, setActiveTab } = useNavigation();
  const [tab, setTab] = useState<AutomationTab>(() => resolveTab(activeTab));

  // One-shot sync : accepter un deep-link arrivant après mount, puis le
  // consommer. `activeTab` vit dans l'état d'Index pour toute la session :
  // sans remise à zéro, chaque réouverture de la page rouvrirait l'onglet
  // du dernier deep-link au lieu de celui par défaut.
  useEffect(() => {
    if (!activeTab) return;
    setTab(resolveTab(activeTab));
    setActiveTab(undefined);
  }, [activeTab, setActiveTab]);

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-display font-bold text-foreground">Modèles & automatisations</h1>
        <p className="text-sm text-muted-foreground">Modèles de documents et d'emails, workflows</p>
      </div>

      <div className="px-6 pb-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as AutomationTab)}>
          <TabsList className="bg-muted/50 mb-5">
            <TabsTrigger value="templates" className="gap-1.5 text-xs">
              <Palette className="h-3.5 w-3.5" /> Modèles de documents
            </TabsTrigger>
            <TabsTrigger value="communications" className="gap-1.5 text-xs">
              <Mail className="h-3.5 w-3.5" /> Modèles d'emails
            </TabsTrigger>
            <TabsTrigger value="workflows" className="gap-1.5 text-xs">
              <Workflow className="h-3.5 w-3.5" /> Workflows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <TemplateStudioPage />
          </TabsContent>
          <TabsContent value="communications">
            <CommunicationsPage />
          </TabsContent>
          <TabsContent value="workflows">
            <WorkflowsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
