// ═══════════════════════════════════════════════════════════════
// Session Documents Tab — Pack-aware generation + batch + anti-duplicate
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText, Download, Loader2, CheckCircle2, XCircle, RefreshCw, Package, MoreVertical, Clock, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useDocumentPacks, useGeneratedDocuments, useGenerateDocument,
  useGeneratePackDocuments, useDownloadGeneratedDoc, useRetryFailedDocuments,
  buildVariablesForGeneration, DOC_FILTER_OPTIONS,
  type TrackScope, type GeneratedDocument, type DocFilterStatus,
} from "@/hooks/useTemplateStudioV2";
import { MissingFieldsDialog, findMissingVariables } from "@/components/template-studio-v2/MissingFieldsDialog";
import { toast } from "sonner";

interface Props {
  sessionId: string;
  sessionTrack?: string;
  contactId?: string;
}

export function SessionDocumentsTab({ sessionId, sessionTrack, contactId }: Props) {
  const trackScope: TrackScope = sessionTrack === "continuing" ? "continuing" : "initial";
  const [filter, setFilter] = useState<DocFilterStatus>("all");
  const [missingFieldsState, setMissingFieldsState] = useState<{
    open: boolean; fields: string[]; templateName: string; onConfirm: () => void;
  } | null>(null);

  const { data: packs } = useDocumentPacks(trackScope);
  const { data: generatedDocs } = useGeneratedDocuments({ sessionId, contactId });
  const generateDoc = useGenerateDocument();
  const generatePack = useGeneratePackDocuments();
  const downloadDoc = useDownloadGeneratedDoc();
  const retryFailed = useRetryFailedDocuments();
  const [generating, setGenerating] = useState<string | null>(null);

  const activePack = packs?.find((p) => p.is_default && (p.track_scope === trackScope || p.track_scope === "both"));
  const packTemplates = activePack?.items?.filter((i) => i.template?.status === "published") || [];

  const ungeneratedCount = packTemplates.filter((item) => {
    const existing = generatedDocs?.find((d) => d.template_id === item.template_id && d.status === "generated");
    return !existing;
  }).length;

  const failedCount = generatedDocs?.filter((d) => d.status === "failed").length || 0;

  const filteredDocs = useMemo(() => {
    if (!generatedDocs) return [];
    if (filter === "all") return generatedDocs;
    return generatedDocs.filter((d) => d.status === filter);
  }, [generatedDocs, filter]);

  const handleGenerate = async (templateId: string, templateBody?: string, templateName?: string) => {
    setGenerating(templateId);
    try {
      const variables = await buildVariablesForGeneration({
        contactId: contactId || undefined,
        sessionId,
      });

      if (templateBody) {
        const missing = findMissingVariables(templateBody, variables);
        if (missing.length > 0) {
          setGenerating(null);
          setMissingFieldsState({
            open: true,
            fields: missing,
            templateName: templateName || "Document",
            onConfirm: async () => {
              await generateDoc.mutateAsync({ templateId, sessionId, contactId, variables, missingFields: missing });
              toast.success("Document généré");
            },
          });
          return;
        }
      }

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
    await generatePack.mutateAsync({ pack: activePack, contactId, sessionId });
  };

  const handleRetryAll = async () => {
    await retryFailed.mutateAsync({ sessionId, contactId });
  };

  return (
    <div className="space-y-4">
      {missingFieldsState && (
        <MissingFieldsDialog
          open={missingFieldsState.open}
          onOpenChange={(open) => { if (!open) setMissingFieldsState(null); }}
          missingFields={missingFieldsState.fields}
          templateName={missingFieldsState.templateName}
          onConfirm={missingFieldsState.onConfirm}
          onCancel={() => setMissingFieldsState(null)}
        />
      )}

      {/* Pack Info + Generate All + Retry All */}
      {activePack && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{activePack.name}</span>
            <Badge variant="outline" className="text-xs">
              {trackScope === "initial" ? "Parcours Initial" : "Formation Continue"}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {failedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={retryFailed.isPending}
                onClick={handleRetryAll}
              >
                {retryFailed.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Relancer échecs ({failedCount})
              </Button>
            )}
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
        </div>
      )}

      {(generatePack.isPending || retryFailed.isPending) && (
        <div className="space-y-1">
          <Progress value={undefined} className="h-1.5 animate-pulse" />
          <p className="text-xs text-muted-foreground text-center">
            {retryFailed.isPending ? "Relance des échecs…" : "Génération en cours…"}
          </p>
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
                              <DropdownMenuItem onClick={() => handleGenerate(tmpl.id, tmpl.template_body, tmpl.name)} disabled={isGenerating}>
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
                          onClick={() => handleGenerate(tmpl.id, tmpl.template_body, tmpl.name)}
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

      {/* Generated docs history with filter chips */}
      {generatedDocs && generatedDocs.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Historique ({filteredDocs.length})</CardTitle>
              <div className="flex gap-1">
                {DOC_FILTER_OPTIONS.map((opt) => {
                  const count = opt.value === "all"
                    ? generatedDocs.length
                    : generatedDocs.filter((d) => d.status === opt.value).length;
                  if (opt.value !== "all" && count === 0) return null;
                  return (
                    <Button
                      key={opt.value}
                      variant={filter === opt.value ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setFilter(opt.value)}
                    >
                      {opt.label}
                      {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[300px]">
              <div className="divide-y">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{doc.file_name || (doc as any).template?.name || "Document"}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleString("fr-FR")}</p>
                        {doc.status === "failed" && doc.error_message && (
                          <span className="text-[10px] text-destructive truncate max-w-[200px]">{doc.error_message}</span>
                        )}
                      </div>
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
