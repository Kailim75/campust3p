// ═══════════════════════════════════════════════════════════════
// Session Documents Tab — Pack-aware generation + batch + anti-duplicate
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText, Download, Loader2, CheckCircle2, XCircle, RefreshCw, Package, MoreVertical, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useDocumentPacks, useGeneratedDocuments, useGenerateDocument,
  useGeneratePackDocuments, useDownloadGeneratedDoc,
  buildVariablesForGeneration,
  type TrackScope, type GeneratedDocument,
} from "@/hooks/useTemplateStudioV2";
import { toast } from "sonner";

interface Props {
  sessionId: string;
  sessionTrack?: string;
  contactId?: string;
}

export function SessionDocumentsTab({ sessionId, sessionTrack, contactId }: Props) {
  const trackScope: TrackScope = sessionTrack === "continuing" ? "continuing" : "initial";
  const { data: packs } = useDocumentPacks(trackScope);
  const { data: generatedDocs } = useGeneratedDocuments({ sessionId, contactId });
  const generateDoc = useGenerateDocument();
  const generatePack = useGeneratePackDocuments();
  const downloadDoc = useDownloadGeneratedDoc();
  const [generating, setGenerating] = useState<string | null>(null);

  const activePack = packs?.find((p) => p.is_default && (p.track_scope === trackScope || p.track_scope === "both"));
  const packTemplates = activePack?.items?.filter((i) => i.template?.status === "published") || [];

  const ungeneratedCount = packTemplates.filter((item) => {
    const existing = generatedDocs?.find((d) => d.template_id === item.template_id && d.status === "generated");
    return !existing;
  }).length;

  const handleGenerate = async (templateId: string) => {
    setGenerating(templateId);
    try {
      const variables = await buildVariablesForGeneration({
        contactId: contactId || undefined,
        sessionId,
      });
      await generateDoc.mutateAsync({ templateId, sessionId, contactId, variables });
      toast.success("Document généré");
    } catch {
      // handled
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!activePack) return;
    await generatePack.mutateAsync({
      pack: activePack,
      contactId,
      sessionId,
    });
  };

  return (
    <div className="space-y-4">
      {/* Pack Info + Generate All */}
      {activePack && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{activePack.name}</span>
            <Badge variant="outline" className="text-xs">
              {trackScope === "initial" ? "Parcours Initial" : "Formation Continue"}
            </Badge>
          </div>
          {packTemplates.length > 0 && (
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              disabled={generatePack.isPending || ungeneratedCount === 0}
              onClick={handleGenerateAll}
            >
              {generatePack.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Package className="h-3.5 w-3.5" />
              )}
              {ungeneratedCount === 0
                ? "Tout généré ✓"
                : `Générer tout (${ungeneratedCount})`}
            </Button>
          )}
        </div>
      )}

      {generatePack.isPending && (
        <div className="space-y-1">
          <Progress value={undefined} className="h-1.5 animate-pulse" />
          <p className="text-xs text-muted-foreground text-center">Génération en cours…</p>
        </div>
      )}

      {/* Template List */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Documents recommandés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            {packTemplates.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun template recommandé pour ce parcours</p>
                <p className="text-xs text-muted-foreground mt-1">Publiez des templates et configurez un pack</p>
              </div>
            ) : (
              <div className="divide-y">
                {packTemplates.map((item: any) => {
                  const tmpl = item.template!;
                  const existingGenerated = generatedDocs?.find(
                    (d) => d.template_id === tmpl.id && d.status === "generated"
                  );
                  const isAlreadyGenerated = !!existingGenerated;
                  const isGenerating = generating === tmpl.id;

                  return (
                    <div key={tmpl.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                      <div className={cn("p-1 rounded", isAlreadyGenerated ? "text-success" : "text-muted-foreground")}>
                        {isAlreadyGenerated ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tmpl.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{tmpl.type}</span>
                          {item.auto_generate && (
                            <Badge variant="outline" className="text-[10px] h-4 text-primary/60">Auto</Badge>
                          )}
                          {isAlreadyGenerated && (
                            <span className="text-success">
                              — {format(new Date(existingGenerated.created_at), "dd/MM/yyyy", { locale: fr })}
                            </span>
                          )}
                        </div>
                      </div>

                      {isAlreadyGenerated ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs text-success bg-success/10 border-success/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" />Déjà généré
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDoc.mutate(existingGenerated)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleGenerate(tmpl.id)} disabled={isGenerating}>
                                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                Regénérer (nouvelle version)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Generated docs history */}
      {generatedDocs && generatedDocs.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Historique ({generatedDocs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[300px]">
              <div className="divide-y">
                {generatedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{doc.file_name || (doc as any).template?.name || "Document"}</p>
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
