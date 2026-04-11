import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunicationsPage } from "@/components/communications/CommunicationsPage";
import { WorkflowsPage } from "@/components/workflows/WorkflowsPage";
import TemplateStudioPage from "@/components/template-studio/TemplateStudioPage";
import IADirectorPage from "@/components/ia-director/IADirectorPage";
import { Mail, Workflow, Palette, Zap } from "lucide-react";

export function AutomationsPage() {
  const [tab, setTab] = useState("communications");

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-display font-bold text-foreground">Automations</h1>
        <p className="text-sm text-muted-foreground">Communications, workflows et intelligence artificielle</p>
      </div>

      <div className="px-6 pb-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted/50 mb-5">
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
