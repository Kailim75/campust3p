import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText, Download, RefreshCw, FolderOpen, AlertCircle,
  CheckCircle2, Clock, XCircle, File, Loader2, Package, MoreVertical,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useActiveEnrollment } from "@/hooks/useActiveEnrollment";
import { ContactDocumentsTab } from "@/components/contacts/detail/ContactDocumentsTab";
import {
  useGeneratedDocuments,
  useGenerateDocument,
  useGeneratePackDocuments,
  useDownloadGeneratedDoc,
  useDocumentPacks,
  buildVariablesForGeneration,
  type GeneratedDocument,
  type TrackScope,
} from "@/hooks/useTemplateStudioV2";

const DOCUMENT_TYPES = [
  { value: "cni", label: "CNI" },
  { value: "permis", label: "Permis" },
  { value: "photo", label: "Photo" },
  { value: "justificatif_domicile", label: "Justificatif domicile" },
  { value: "assr", label: "ASSR" },
  { value: "attestation", label: "Attestation" },
  { value: "autre", label: "Autre" },
];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  generated: { label: "Généré", icon: CheckCircle2, className: "text-success bg-success/10 border-success/20" },
  queued: { label: "En cours…", icon: Clock, className: "text-warning bg-warning/10 border-warning/20" },
  failed: { label: "Échec", icon: XCircle, className: "text-destructive bg-destructive/10 border-destructive/20" },
};

interface DocumentsTabProps {
  contactId: string;
  contactPrenom?: string;
  contactNom?: string;
  contactEmail?: string | null;
  contactFormation?: string | null;
}

export function DocumentsTab({ contactId }: DocumentsTabProps) {
  const [subTab, setSubTab] = useState("generated");
  const { data: enrollment } = useActiveEnrollment(contactId);
  const trackScope: TrackScope = enrollment?.track === "continuing" ? "continuing" : "initial";

  const { data: generatedDocs = [], isLoading: loadingGenerated } = useGeneratedDocuments({ contactId });
  const { data: packs = [], isLoading: loadingPacks } = useDocumentPacks(trackScope);
  const { data: uploadedDocs = [], isLoading: loadingUploaded } = useQuery({
    queryKey: ["contact-documents", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_documents")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  const generateDoc = useGenerateDocument();
  const generatePack = useGeneratePackDocuments();
  const downloadDoc = useDownloadGeneratedDoc();

  const defaultPack = packs.find((p) => p.is_default) || packs[0];
  const packTemplates = defaultPack?.items?.filter((i) => i.template?.status === "published") || [];

  // Count how many templates still need generation
  const ungeneratedCount = packTemplates.filter((item) => {
    const existing = generatedDocs.find((d) => d.template_id === item.template_id && d.status === "generated");
    return !existing;
  }).length;

  const handleGenerate = async (templateId: string) => {
    try {
      const variables = await buildVariablesForGeneration({
        contactId,
        sessionId: enrollment?.session_id,
      });
      await generateDoc.mutateAsync({
        templateId,
        contactId,
        sessionId: enrollment?.session_id,
        inscriptionId: enrollment?.id,
        variables,
      });
      toast.success("Document généré");
    } catch {
      // handled by mutation
    }
  };

  const handleGenerateAll = async () => {
    if (!defaultPack) return;
    await generatePack.mutateAsync({
      pack: defaultPack,
      contactId,
      sessionId: enrollment?.session_id,
      inscriptionId: enrollment?.id,
    });
  };

  const handleDownload = async (doc: GeneratedDocument) => {
    await downloadDoc.mutateAsync(doc);
  };

  const handleUploadDownload = async (filePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage.from("contact-documents").download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur de téléchargement");
    }
  };

  const handleDeleteDoc = async ({ id, filePath }: { id: string; filePath: string; contactId: string }) => {
    try {
      await supabase.storage.from("contact-documents").remove([filePath]);
      await supabase.from("contact_documents").delete().eq("id", id);
      toast.success("Document supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generated" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Documents générés
          </TabsTrigger>
          <TabsTrigger value="uploaded" className="gap-1.5 text-xs">
            <FolderOpen className="h-3.5 w-3.5" />
            Documents à fournir
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generated" className="mt-4 space-y-4">
          {/* Pack header with "Generate all" */}
          {defaultPack && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{defaultPack.name}</span>
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
                    : `Générer tout le pack (${ungeneratedCount})`}
                </Button>
              )}
            </div>
          )}

          {/* Progress bar during batch */}
          {generatePack.isPending && (
            <div className="space-y-1">
              <Progress value={undefined} className="h-1.5 animate-pulse" />
              <p className="text-xs text-muted-foreground text-center">Génération en cours…</p>
            </div>
          )}

          {loadingGenerated || loadingPacks ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {packTemplates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Templates disponibles
                  </p>
                  <div className="grid gap-2">
                    {packTemplates.map((item) => {
                      const tmpl = item.template!;
                      const existingGenerated = generatedDocs.find(
                        (d) => d.template_id === tmpl.id && d.status === "generated"
                      );
                      const existingAny = generatedDocs.filter((d) => d.template_id === tmpl.id);
                      const lastDoc = existingAny[0];
                      const isAlreadyGenerated = !!existingGenerated;
                      const isGenerating = generateDoc.isPending;

                      return (
                        <Card key={item.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className={cn(
                                  "p-1.5 rounded-md",
                                  isAlreadyGenerated ? "bg-success/10" : "bg-primary/10"
                                )}>
                                  {isAlreadyGenerated
                                    ? <CheckCircle2 className="h-4 w-4 text-success" />
                                    : <FileText className="h-4 w-4 text-primary" />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{tmpl.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {isAlreadyGenerated ? (
                                      <>
                                        <Badge variant="outline" className="text-[10px] h-4 gap-0.5 text-success bg-success/10 border-success/20">
                                          <CheckCircle2 className="h-2.5 w-2.5" />
                                          Déjà généré
                                        </Badge>
                                        <span>
                                          {format(new Date(existingGenerated.created_at), "dd MMM yyyy", { locale: fr })}
                                        </span>
                                      </>
                                    ) : lastDoc ? (
                                      <>
                                        <StatusBadge status={lastDoc.status} />
                                        <span>{format(new Date(lastDoc.created_at), "dd MMM yyyy", { locale: fr })}</span>
                                      </>
                                    ) : (
                                      <span className="italic">Jamais généré</span>
                                    )}
                                    {item.is_required && (
                                      <Badge variant="outline" className="text-[10px] h-4">Requis</Badge>
                                    )}
                                    {item.auto_generate && (
                                      <Badge variant="outline" className="text-[10px] h-4 text-primary/60">Auto</Badge>
                                    )}
                                  </div>
                                  {lastDoc?.status === "failed" && lastDoc.error_message && (
                                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {lastDoc.error_message}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {isAlreadyGenerated ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs gap-1"
                                      onClick={() => handleDownload(existingGenerated)}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      Télécharger
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleGenerate(tmpl.id)}
                                          disabled={isGenerating}
                                        >
                                          <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                          Regénérer (nouvelle version)
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={isGenerating}
                                    onClick={() => handleGenerate(tmpl.id)}
                                  >
                                    {isGenerating ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : lastDoc?.status === "failed" ? (
                                      <><RefreshCw className="h-3.5 w-3.5 mr-1" />Réessayer</>
                                    ) : (
                                      <>Générer</>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {generatedDocs.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Historique ({generatedDocs.length})
                  </p>
                  <div className="grid gap-2">
                    {generatedDocs.map((doc) => (
                      <GeneratedDocRow
                        key={doc.id}
                        doc={doc}
                        onDownload={handleDownload}
                        onRegenerate={() => handleGenerate(doc.template_id)}
                        isRegenerating={generateDoc.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {generatedDocs.length === 0 && packTemplates.length === 0 && (
                <EmptyGeneratedDocs />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="uploaded" className="mt-4">
          <ContactDocumentsTab
            documents={uploadedDocs as any}
            isLoading={loadingUploaded}
            documentTypes={DOCUMENT_TYPES}
            onUpload={() => toast.info("Upload via la section CMA/Dossier")}
            onDownload={handleUploadDownload}
            onDelete={handleDeleteDoc}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("text-[10px] h-4 gap-0.5", config.className)}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  );
}

function GeneratedDocRow({
  doc, onDownload, onRegenerate, isRegenerating,
}: {
  doc: GeneratedDocument;
  onDownload: (doc: GeneratedDocument) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const templateName = (doc as any).template?.name || doc.file_name || "Document";
  return (
    <div className="flex items-center justify-between p-2.5 border rounded-lg gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <File className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{templateName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge status={doc.status} />
            <span>{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
          </div>
          {doc.status === "failed" && doc.error_message && (
            <p className="text-xs text-destructive mt-0.5">{doc.error_message}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {doc.status === "generated" && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(doc)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
        {(doc.status === "failed" || doc.status === "generated") && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRegenerate} disabled={isRegenerating}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isRegenerating && "animate-spin")} />
                Regénérer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function EmptyGeneratedDocs() {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p className="font-medium text-sm">Aucun document généré</p>
      <p className="text-xs mt-1">
        Les documents seront disponibles une fois l'apprenant inscrit à une session.
      </p>
    </div>
  );
}
