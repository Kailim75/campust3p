import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, Plus, ArrowLeft, Sparkles, BookOpen, FilePenLine, Stamp, type LucideIcon } from "lucide-react";
import TemplateLibraryV2 from "./TemplateLibraryV2";
import TemplateEditorV2 from "./TemplateEditorV2";
import GenerateScreen from "./GenerateScreen";
import AIGenerateTemplateModal from "./AIGenerateTemplateModal";

type Screen = "library" | "editor" | "generate";

const screenConfig: Record<Screen, { title: string; description: string; icon: LucideIcon; badges: string[] }> = {
  library: {
    title: "Bibliothèque de templates",
    description: "Centralisez les modèles actifs, retrouvez rapidement les bons formats et partez soit d'un template existant, soit du catalogue.",
    icon: BookOpen,
    badges: ["Bibliothèque", "Catalogue", "Qualiopi"],
  },
  editor: {
    title: "Édition de template",
    description: "Travaillez le contenu, la conformité et la structure du modèle avant publication ou génération.",
    icon: FilePenLine,
    badges: ["Édition", "Versioning", "Conformité"],
  },
  generate: {
    title: "Génération de document",
    description: "Choisissez un template publié puis lancez la génération avec un parcours plus guidé et lisible.",
    icon: Stamp,
    badges: ["Génération", "Publié", "Production"],
  },
};

export default function TemplateStudioPage() {
  const [screen, setScreen] = useState<Screen>("library");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrefilledBody, setAiPrefilledBody] = useState<string | null>(null);
  const [aiPrefilledType, setAiPrefilledType] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setSelectedTemplateId(id);
    setIsCreating(false);
    setAiPrefilledBody(null);
    setAiPrefilledType(null);
    setScreen("editor");
  };

  const handleCreate = (presetType?: string) => {
    setSelectedTemplateId(null);
    setIsCreating(true);
    setAiPrefilledBody(null);
    setAiPrefilledType(null);
    setScreen("editor");
  };

  const handleGenerate = (templateId?: string) => {
    if (templateId) setSelectedTemplateId(templateId);
    setScreen("generate");
  };

  const handleBackToLibrary = () => {
    setSelectedTemplateId(null);
    setIsCreating(false);
    setAiPrefilledBody(null);
    setAiPrefilledType(null);
    setScreen("library");
  };

  const handleAIUseTemplate = (html: string, type: string) => {
    setSelectedTemplateId(null);
    setIsCreating(true);
    setAiPrefilledBody(html);
    setAiPrefilledType(type);
    setScreen("editor");
  };

  const activeScreen = screenConfig[screen];
  const ActiveScreenIcon = activeScreen.icon;

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
            <p className="text-muted-foreground text-sm mt-1">{screen === "editor" && isCreating ? "Création d'un nouveau template" : activeScreen.description}</p>
          </div>
        </div>
        {screen === "library" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAiModalOpen(true)} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
              <Sparkles className="h-4 w-4" />
              Générer avec IA
            </Button>
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

      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ActiveScreenIcon className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{screen === "editor" && isCreating ? "Création de template" : activeScreen.title}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{activeScreen.description}</p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2 text-xs">
              <p className="font-medium">Étape actuelle</p>
              <p className="text-muted-foreground">
                {screen === "library" && "Choisir, filtrer ou partir du catalogue"}
                {screen === "editor" && (isCreating ? "Créer et structurer un nouveau modèle" : "Modifier un modèle existant")}
                {screen === "generate" && "Sélectionner un template publié puis générer"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {screen === "library" && "Point d'entrée du module"}
                {screen === "editor" && (isCreating ? "Mode création" : "Mode édition")}
                {screen === "generate" && "Parcours de production"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeScreen.badges.map((badge) => (
              <Badge key={badge} variant="outline" className="text-[11px]">
                {badge}
              </Badge>
            ))}
            {screen === "library" && (
              <>
                <Badge variant="outline" className="text-[11px]">IA disponible</Badge>
                <Badge variant="outline" className="text-[11px]">Génération manuelle</Badge>
              </>
            )}
            {screen === "editor" && isCreating && (
              <Badge variant="outline" className="text-[11px]">Nouveau modèle</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Screens */}
      {screen === "library" && (
        <TemplateLibraryV2
          onEdit={handleEdit}
          onCreate={handleCreate}
          onGenerate={handleGenerate}
        />
      )}
      {screen === "editor" && (
        <TemplateEditorV2
          templateId={selectedTemplateId}
          isCreating={isCreating}
          onBack={handleBackToLibrary}
          onGenerate={handleGenerate}
          aiPrefilledBody={aiPrefilledBody}
          aiPrefilledType={aiPrefilledType}
        />
      )}
      {screen === "generate" && (
        <GenerateScreen
          preselectedTemplateId={selectedTemplateId}
          onBack={handleBackToLibrary}
        />
      )}

      <AIGenerateTemplateModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onUseTemplate={handleAIUseTemplate}
      />
    </div>
  );
}
