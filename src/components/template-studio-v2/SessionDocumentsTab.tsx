// ═══════════════════════════════════════════════════════════════
// Session Documents Tab — Shows pack-recommended templates + generation
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Download, Loader2, CheckCircle2, XCircle, RefreshCw, Package,
} from "lucide-react";
import {
  useDocumentPacks, useGeneratedDocuments, useGenerateDocument, useDownloadGeneratedDoc,
  useTemplatesV2, buildVariablesForGeneration,
  type TrackScope, type GeneratedDocument,
} from "@/hooks/useTemplateStudioV2";
import { toast } from "sonner";

interface Props {
  sessionId: string;
  sessionTrack?: string; // 'initial' | 'continuing'
  contactId?: string;
}

export function SessionDocumentsTab({ sessionId, sessionTrack, contactId }: Props) {
  const trackScope: TrackScope = sessionTrack === "continuing" ? "continuing" : "initial";
  const { data: packs } = useDocumentPacks(trackScope);
  const { data: generatedDocs } = useGeneratedDocuments({ sessionId, contactId });
  const { data: publishedTemplates } = useTemplatesV2({ status: "published" });
  const generateDoc = useGenerateDocument();
  const downloadDoc = useDownloadGeneratedDoc();
  const [generating, setGenerating] = useState<string | null>(null);

  // Get relevant pack
  const activePack = packs?.find((p) => p.is_default && (p.track_scope === trackScope || p.track_scope === "both"));

  // Build list of templates to show (from pack or fallback to published templates matching track)
  const packTemplates = activePack?.items?.map((i) => i.template).filter(Boolean) || [];
  const displayTemplates = packTemplates.length > 0
    ? packTemplates
    : (publishedTemplates || []).filter(
        (t) => t.track_scope === trackScope || t.track_scope === "both"
      );

  const getDocStatus = (templateId: string) => {
    return generatedDocs?.find((d) => d.template_id === templateId);
  };

  const handleGenerate = async (templateId: string) => {
    setGenerating(templateId);
    try {
      const variables = await buildVariablesForGeneration({
        contactId: contactId || undefined,
        sessionId,
      });
      await generateDoc.mutateAsync({ templateId, sessionId, contactId, variables });
    } catch (err) {
      // Error handled by mutation
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pack Info */}
      {activePack && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{activePack.name}</span>
          <Badge variant="outline" className="text-xs ml-auto">
            {trackScope === "initial" ? "Parcours Initial" : "Formation Continue"}
          </Badge>
        </div>
      )}

      {/* Template List with generation status */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Documents recommandés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            {displayTemplates.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun template recommandé pour ce parcours</p>
                <p className="text-xs text-muted-foreground mt-1">Publiez des templates et configurez un pack</p>
              </div>
            ) : (
              <div className="divide-y">
                {displayTemplates.map((tmpl: any) => {
                  const existing = getDocStatus(tmpl.id);
                  const isGenerating = generating === tmpl.id;
                  return (
                    <div key={tmpl.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tmpl.name}</p>
                        <p className="text-xs text-muted-foreground">{tmpl.type}</p>
                      </div>
                      {/* Status */}
                      {existing ? (
                        <div className="flex items-center gap-2">
                          {existing.status === "generated" ? (
                            <Badge className="text-xs bg-green-500/10 text-green-600 gap-1">
                              <CheckCircle2 className="h-3 w-3" />Généré
                            </Badge>
                          ) : existing.status === "failed" ? (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <XCircle className="h-3 w-3" />Erreur
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">En cours...</Badge>
                          )}
                          {existing.status === "generated" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDoc.mutate(existing)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => handleGenerate(tmpl.id)}
                            disabled={isGenerating}
                          >
                            <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
                            Regénérer
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5"
                          onClick={() => handleGenerate(tmpl.id)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                          Générer
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Previously Generated Documents */}
      {generatedDocs && generatedDocs.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Documents générés ({generatedDocs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[300px]">
              <div className="divide-y">
                {generatedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{doc.file_name || doc.template?.name || "Document"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleString("fr-FR")}</p>
                    </div>
                    <Badge
                      variant={doc.status === "generated" ? "default" : doc.status === "failed" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {doc.status === "generated" ? "OK" : doc.status === "failed" ? "Erreur" : "En cours"}
                    </Badge>
                    {doc.status === "generated" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDoc.mutate(doc)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
