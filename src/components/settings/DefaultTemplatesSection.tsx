import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Star, FileText, File, FileSpreadsheet, Trash2, Settings2, Info } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useDocumentTemplateFiles,
  useSetDefaultTemplate,
  DocumentTemplateFile,
  formationTypes,
  templateDocumentTypes,
} from "@/hooks/useDocumentTemplateFiles";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DefaultTemplatesSection() {
  const { data: allTemplates = [], isLoading } = useDocumentTemplateFiles();
  const setDefaultTemplate = useSetDefaultTemplate();

  // Get all templates marked as default
  const defaultTemplates = useMemo(() => {
    return allTemplates.filter((t) => t.is_default);
  }, [allTemplates]);

  // Group by document type for display
  const groupedByDocType = useMemo(() => {
    const groups: Record<string, DocumentTemplateFile[]> = {};
    defaultTemplates.forEach((t) => {
      const key = t.type_document || "autre";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [defaultTemplates]);

  const getDocTypeLabel = (value: string | null) =>
    templateDocumentTypes.find((t) => t.value === value)?.label || value || "Autre";

  const getFormationLabel = (value: string | null) =>
    formationTypes.find((f) => f.value === value)?.label || "Toutes formations";

  const handleRemoveDefault = async (template: DocumentTemplateFile) => {
    await setDefaultTemplate.mutateAsync({ templateId: template.id, isDefault: false });
  };

  const FileIcon = ({ type }: { type: string }) => {
    if (type === "pdf") return <FileText className="h-5 w-5 text-destructive" />;
    if (type === "xlsx") return <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    return <File className="h-5 w-5 text-primary" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-warning fill-warning" />
          Modèles par défaut
        </CardTitle>
        <CardDescription>
          Les modèles de fichiers utilisés automatiquement pour générer les documents (attestations, émargements, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {defaultTemplates.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Aucun modèle par défaut configuré. Pour définir un modèle par défaut, allez dans la section 
              "Modèles de fichiers" et cliquez sur "Définir par défaut" dans le menu d'un modèle.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDocType).map(([docType, templates]) => (
              <div key={docType} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm font-medium">
                    {getDocTypeLabel(docType)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({templates.length} modèle{templates.length > 1 ? "s" : ""})
                  </span>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modèle</TableHead>
                        <TableHead>Formation</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Ajouté le</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <FileIcon type={template.type_fichier} />
                              <div>
                                <p className="font-medium">{template.nom}</p>
                                {template.description && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {template.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={template.formation_type ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {getFormationLabel(template.formation_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs uppercase">
                              {template.type_fichier}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(template.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  title="Retirer par défaut"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Retirer ce modèle par défaut ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Le modèle "{template.nom}" ne sera plus utilisé automatiquement 
                                    pour générer les {getDocTypeLabel(template.type_document).toLowerCase()}
                                    {template.formation_type ? ` pour les formations ${getFormationLabel(template.formation_type)}` : ""}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveDefault(template)}>
                                    Retirer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="pt-4 border-t">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Settings2 className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Comment ça fonctionne ?</p>
              <ul className="mt-1 space-y-1 list-disc list-inside text-xs">
                <li>
                  <strong>Modèle spécifique</strong> : Si un modèle par défaut est défini pour une formation précise 
                  (ex: VTC), il sera utilisé en priorité pour cette formation.
                </li>
                <li>
                  <strong>Modèle global</strong> : Si aucun modèle spécifique n'existe, le modèle global 
                  (sans formation associée) sera utilisé.
                </li>
                <li>
                  <strong>Fallback</strong> : Si aucun modèle par défaut n'est configuré, le système utilise 
                  le générateur PDF intégré.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
