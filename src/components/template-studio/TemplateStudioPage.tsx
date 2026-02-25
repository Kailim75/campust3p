import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette, Plus, ArrowLeft } from "lucide-react";
import TemplateLibrary from "./TemplateLibrary";
import TemplateEditorTab from "./TemplateEditorTab";
import GenerateScreen from "./GenerateScreen";

type Screen = "library" | "editor" | "generate";

export default function TemplateStudioPage() {
  const [screen, setScreen] = useState<Screen>("library");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleEdit = (id: string) => {
    setSelectedTemplateId(id);
    setIsCreating(false);
    setScreen("editor");
  };

  const handleCreate = (presetType?: string) => {
    setSelectedTemplateId(null);
    setIsCreating(true);
    setScreen("editor");
  };

  const handleGenerate = (templateId?: string) => {
    if (templateId) setSelectedTemplateId(templateId);
    setScreen("generate");
  };

  const handleBackToLibrary = () => {
    setSelectedTemplateId(null);
    setIsCreating(false);
    setScreen("library");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {screen !== "library" && (
            <Button variant="ghost" size="icon" onClick={handleBackToLibrary}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              Template Studio
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {screen === "library" && "Bibliothèque de templates conformes Qualiopi & DREETS"}
              {screen === "editor" && (isCreating ? "Création d'un nouveau template" : "Édition du template")}
              {screen === "generate" && "Génération de documents à partir de vos templates"}
            </p>
          </div>
        </div>
        {screen === "library" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleGenerate()} className="gap-2">
              <Palette className="h-4 w-4" />
              Générer un document
            </Button>
            <Button onClick={() => handleCreate()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau template
            </Button>
          </div>
        )}
      </div>

      {/* Screens */}
      {screen === "library" && (
        <TemplateLibrary
          onEdit={handleEdit}
          onCreate={handleCreate}
          onGenerate={handleGenerate}
        />
      )}
      {screen === "editor" && (
        <TemplateEditorTab
          templateId={selectedTemplateId}
          isCreating={isCreating}
          onBack={handleBackToLibrary}
          onGenerate={handleGenerate}
        />
      )}
      {screen === "generate" && (
        <GenerateScreen
          preselectedTemplateId={selectedTemplateId}
          onBack={handleBackToLibrary}
        />
      )}
    </div>
  );
}
