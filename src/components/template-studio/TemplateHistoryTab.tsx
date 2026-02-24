import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2, RotateCcw, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useApprovalLogs,
  useTemplateVersions,
  useStudioTemplate,
  useTemplateWorkflow,
  TEMPLATE_STATUSES,
  type TemplateVersion,
} from "@/hooks/useTemplateStudio";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const actionLabels: Record<string, string> = {
  submit_review: "Soumis en révision",
  approve: "Approuvé",
  publish: "Publié",
  rollback: "Rollback",
  reject: "Rejeté",
};

interface Props {
  templateId: string | null;
}

export default function TemplateHistoryTab({ templateId }: Props) {
  const { data: logs, isLoading: logsLoading } = useApprovalLogs(templateId);
  const { data: versions, isLoading: versionsLoading } = useTemplateVersions(templateId);
  const { data: template } = useStudioTemplate(templateId);
  const workflow = useTemplateWorkflow();
  const [rollbackVersion, setRollbackVersion] = useState<TemplateVersion | null>(null);

  const handleRollback = async () => {
    if (!template || !rollbackVersion) return;
    await workflow.rollback(template, rollbackVersion);
    setRollbackVersion(null);
  };

  if (!templateId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sélectionnez un template</p>
          <p className="text-sm">L'historique et les versions apparaîtront ici</p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = logsLoading || versionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Versions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Versions
            <Badge variant="outline" className="ml-auto text-xs">{versions?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!versions || versions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune version sauvegardée</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 p-4">
                {versions.map((v) => {
                  const statusCfg = TEMPLATE_STATUSES.find((s) => s.value === v.status);
                  return (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                      <div>
                        <p className="text-sm font-medium">Version {v.version}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                        <Badge variant="outline" className={cn("text-[10px] mt-1", statusCfg?.color)}>
                          {statusCfg?.label || v.status}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setRollbackVersion(v)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restaurer
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Approval Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Journal d'approbation
            <Badge variant="outline" className="ml-auto text-xs">{logs?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!logs || logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune action enregistrée</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 p-4">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {actionLabels[log.action] || log.action}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">v{log.version}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {log.comment && (
                      <p className="text-xs text-foreground mt-1 italic">"{log.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Rollback Confirmation */}
      <AlertDialog open={!!rollbackVersion} onOpenChange={() => setRollbackVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurer la version {rollbackVersion?.version} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le contenu actuel sera remplacé par celui de la version {rollbackVersion?.version}.
              Une nouvelle version sera créée et le template passera en brouillon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback}>Restaurer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
