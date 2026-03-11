import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, FileText } from "lucide-react";
import { useTemplatesV2, type TemplateV2 } from "@/hooks/useTemplateStudioV2";
import GenerateDocumentModal from "./GenerateDocumentModal";

interface Props {
  preselectedTemplateId: string | null;
  onBack: () => void;
}

export default function GenerateScreen({ preselectedTemplateId, onBack }: Props) {
  const { data: templates, isLoading } = useStudioTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(preselectedTemplateId);

  const selectedTemplate = templates?.find((t) => t.id === selectedId) || null;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
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
