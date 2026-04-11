import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, ArrowLeft } from "lucide-react";
import { useTemplatesV2, type TemplateV2 } from "@/hooks/useTemplateStudioV2";
import GenerateDocumentModal from "./GenerateDocumentModal";

interface Props {
  preselectedTemplateId: string | null;
  onBack: () => void;
}

export default function GenerateScreen({ preselectedTemplateId, onBack }: Props) {
  const { data: templates, isLoading } = useTemplatesV2({});
  const [selectedId, setSelectedId] = useState<string | null>(preselectedTemplateId);

  const selectedTemplate: TemplateV2 | null = templates?.find((t) => t.id === selectedId) || null;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Choix du template source</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sélectionnez un modèle publié avant de lancer la génération. Cette étape permet d'éviter les erreurs de mauvais template.
              </p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2 text-xs">
              <p className="font-medium">Résumé rapide</p>
              <p className="text-muted-foreground">
                {templates?.length || 0} template{(templates?.length || 0) > 1 ? "s" : ""} disponible{(templates?.length || 0) > 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-muted-foreground">
                {selectedTemplate ? `Template choisi : ${selectedTemplate.name}` : "Aucun template sélectionné"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[11px]">Templates publiés</Badge>
            {selectedTemplate && (
              <>
                <Badge variant="outline" className="text-[11px]">{selectedTemplate.type}</Badge>
                <Badge variant="outline" className="text-[11px]">v{selectedTemplate.version}</Badge>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onBack} className="ml-auto gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à la bibliothèque
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Choisir un template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label>Template source</Label>
            <Select value={selectedId || ""} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez un template..." /></SelectTrigger>
              <SelectContent>
                {(templates || []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedTemplate && (
        <GenerateDocumentModal
          open={true}
          onOpenChange={(open) => { if (!open) setSelectedId(null); }}
          template={selectedTemplate}
          inline
        />
      )}
    </div>
  );
}
