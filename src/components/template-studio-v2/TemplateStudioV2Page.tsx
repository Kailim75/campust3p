import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette, Plus, ArrowLeft, Package, History } from "lucide-react";
import { TemplateLibraryV2 } from "./TemplateLibraryV2";
import { TemplateEditorV2 } from "./TemplateEditorV2";
import { PacksManager } from "./PacksManager";

type Screen = "library" | "editor" | "packs";

export default function TemplateStudioV2Page() {
  const [screen, setScreen] = useState<Screen>("library");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleEdit = (id: string) => {
    setSelectedTemplateId(id);
    setIsCreating(false);
    setScreen("editor");
  };

  const handleCreate = () => {
    setSelectedTemplateId(null);
    setIsCreating(true);
    setScreen("editor");
  };

  const handleBack = () => {
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
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              Template Studio V2
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {screen === "library" && "Bibliothèque de templates avec versioning et packs"}
              {screen === "editor" && (isCreating ? "Création d'un nouveau template" : "Édition du template")}
              {screen === "packs" && "Gestion des packs de documents recommandés"}
            </p>
          </div>
        </div>
        {screen === "library" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setScreen("packs")} className="gap-2">
              <Package className="h-4 w-4" />
              Packs recommandés
            </Button>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau template
            </Button>
          </div>
        )}
      </div>

      {/* Screens */}
      {screen === "library" && (
        <TemplateLibraryV2 onEdit={handleEdit} onCreate={handleCreate} />
      )}
      {screen === "editor" && (
        <TemplateEditorV2
          templateId={selectedTemplateId}
          isCreating={isCreating}
          onBack={handleBack}
        />
      )}
      {screen === "packs" && (
        <PacksManager onBack={handleBack} />
      )}
    </div>
  );
}
