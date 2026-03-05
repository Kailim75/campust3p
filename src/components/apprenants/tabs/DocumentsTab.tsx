import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText, Download, RefreshCw, FolderOpen, AlertCircle,
  CheckCircle2, Clock, XCircle, File, Loader2,
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
  useDownloadGeneratedDoc,
  useDocumentPacks,
  buildVariablesForGeneration,
  type GeneratedDocument,
  type TrackScope,
} from "@/hooks/useTemplateStudioV2";

// ── Document types for contact documents (unchanged) ──
const DOCUMENT_TYPES = [
  { value: "cni", label: "CNI" },
  { value: "permis", label: "Permis" },
  { value: "photo", label: "Photo" },
  { value: "justificatif_domicile", label: "Justificatif domicile" },
  { value: "assr", label: "ASSR" },
  { value: "attestation", label: "Attestation" },
  { value: "autre", label: "Autre" },
];

// ── Status config ──
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

  // Map FormationTrack → TrackScope
  const trackScope: TrackScope = enrollment?.track === "continuing" ? "continuing" : "initial";

  // Fetch generated documents for this contact
  const { data: generatedDocs = [], isLoading: loadingGenerated } = useGeneratedDocuments({ contactId });

  // Fetch packs matching track
  const { data: packs = [], isLoading: loadingPacks } = useDocumentPacks(trackScope);

  // Fetch contact documents (uploaded)
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
  const downloadDoc = useDownloadGeneratedDoc();

  // Get the default pack for this track
  const defaultPack = packs.find((p) => p.is_default) || packs[0];

  // Get available templates from pack
  const packTemplates = defaultPack?.items?.filter((i) => i.template?.status === "published") || [];

  const handleGenerate = async (templateId: string, sessionId?: string) => {
    try {
      const variables = await buildVariablesForGeneration({
        contactId,
        sessionId: sessionId || enrollment?.session_id,
      });
      await generateDoc.mutateAsync({
        templateId,
        contactId,
        sessionId: sessionId || enrollment?.session_id,
        inscriptionId: enrollment?.id,
        variables,
      });
    } catch {
      // error handled by mutation
    }
  };

  const handleDownload = async (doc: GeneratedDocument) => {
    await downloadDoc.mutateAsync(doc);
  };

  const handleRegenerate = async (doc: GeneratedDocument) => {
    await handleGenerate(doc.template_id);
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

        {/* ── Generated Documents ── */}
        <TabsContent value="generated" className="mt-4 space-y-4">
          {/* Pack info */}
          {defaultPack && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {trackScope === "initial" ? "Parcours Initial" : "Formation Continue"}
              </Badge>
              <span>Pack : {defaultPack.name}</span>
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
              {/* Templates available for generation */}
              {packTemplates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Templates disponibles
                  </p>
                  <div className="grid gap-2">
                    {packTemplates.map((item) => {
                      const tmpl = item.template!;
                      const existing = generatedDocs.filter((d) => d.template_id === tmpl.id);
                      const lastGenerated = existing[0];
                      const isGenerating = generateDoc.isPending;

                      return (
                        <Card key={item.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="p-1.5 rounded-md bg-primary/10">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{tmpl.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {lastGenerated ? (
                                      <>
                                        <StatusBadge status={lastGenerated.status} />
                                        <span>
                                          {format(new Date(lastGenerated.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="italic">Jamais généré</span>
                                    )}
                                    {item.is_required && (
                                      <Badge variant="outline" className="text-[10px] h-4">Requis</Badge>
                                    )}
                                  </div>
                                  {lastGenerated?.status === "failed" && lastGenerated.error_message && (
                                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {lastGenerated.error_message}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {lastGenerated?.status === "generated" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDownload(lastGenerated)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )
                                }
                                <Button
                                  variant={lastGenerated ? "ghost" : "outline"}
                                  size="sm"
                                  className="h-8 text-xs"
                                  disabled={isGenerating}
                                  onClick={() => handleGenerate(tmpl.id)}
                                >
                                  {isGenerating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : lastGenerated ? (
                                    <><RefreshCw className="h-3.5 w-3.5 mr-1" />Regénérer</>
                                  ) : (
                                    <>Générer</>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Generated docs history */}
              {generatedDocs.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Historique des documents ({generatedDocs.length})
                  </p>
                  <div className="grid gap-2">
                    {generatedDocs.map((doc) => (
                      <GeneratedDocRow
                        key={doc.id}
                        doc={doc}
                        onDownload={handleDownload}
                        onRegenerate={handleRegenerate}
                        isRegenerating={generateDoc.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {generatedDocs.length === 0 && packTemplates.length === 0 && (
                <EmptyGeneratedDocs />
              )}
            </>
          )}
        </TabsContent>

        {/* ── Uploaded Documents ── */}
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
  doc,
  onDownload,
  onRegenerate,
  isRegenerating,
}: {
  doc: GeneratedDocument;
  onDownload: (doc: GeneratedDocument) => void;
  onRegenerate: (doc: GeneratedDocument) => void;
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isRegenerating}
            onClick={() => onRegenerate(doc)}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")} />
          </Button>
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
