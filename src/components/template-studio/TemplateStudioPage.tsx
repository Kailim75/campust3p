import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Palette, List, History, Plus } from "lucide-react";
import TemplateListTab from "./TemplateListTab";
import TemplateEditorTab from "./TemplateEditorTab";
import TemplateHistoryTab from "./TemplateHistoryTab";

export default function TemplateStudioPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  const handleEdit = (id: string) => {
    setSelectedTemplateId(id);
    setIsCreating(false);
    setActiveTab("editor");
  };

  const handleCreate = () => {
    setSelectedTemplateId(null);
    setIsCreating(true);
    setActiveTab("editor");
  };

  const handleBackToList = () => {
    setSelectedTemplateId(null);
    setIsCreating(false);
    setActiveTab("list");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Palette className="h-6 w-6 text-primary" />
            </div>
            Template Studio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conception, validation et publication de templates conformes Qualiopi & DREETS
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2">
            <Palette className="h-4 w-4" />
            Éditeur
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <TemplateListTab onEdit={handleEdit} onCreate={handleCreate} />
        </TabsContent>

        <TabsContent value="editor">
          <TemplateEditorTab
            templateId={selectedTemplateId}
            isCreating={isCreating}
            onBack={handleBackToList}
          />
        </TabsContent>

        <TabsContent value="history">
          <TemplateHistoryTab templateId={selectedTemplateId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
