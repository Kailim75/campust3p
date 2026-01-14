import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Upload,
  Search,
  MoreHorizontal,
  Download,
  Trash2,
  Loader2,
  FileText,
  File,
  FolderOpen,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useDocumentTemplateFiles,
  useDeleteTemplateFile,
  downloadTemplateFile,
  DocumentTemplateFile,
} from "@/hooks/useDocumentTemplateFiles";
import { documentCategories } from "@/hooks/useDocumentTemplates";
import { TemplateFileUploadDialog } from "./TemplateFileUploadDialog";
import { toast } from "sonner";

export function TemplateFilesSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplateFile | null>(null);

  const { data: templates = [], isLoading } = useDocumentTemplateFiles();
  const deleteTemplate = useDeleteTemplateFile();

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch =
        t.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.categorie.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = filterCategory === "all" || t.categorie === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [templates, searchQuery, filterCategory]);

  const handleDelete = (template: DocumentTemplateFile) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate.mutateAsync(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleDownload = async (template: DocumentTemplateFile) => {
    try {
      const fileName = `${template.nom}.${template.type_fichier}`;
      await downloadTemplateFile(template.file_path, fileName);
      toast.success("Modèle téléchargé");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const getCategoryLabel = (value: string) =>
    documentCategories.find((c) => c.value === value)?.label || value;

  const statsByCategory = useMemo(() => {
    const stats: Record<string, number> = {};
    templates.forEach((t) => {
      stats[t.categorie] = (stats[t.categorie] || 0) + 1;
    });
    return stats;
  }, [templates]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Modèles de fichiers (PDF/DOCX)
              </CardTitle>
              <CardDescription>
                Importez vos modèles PDF ou Word avec des champs dynamiques {"{{variable}}"}
              </CardDescription>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer un modèle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un modèle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {documentCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label} ({statsByCategory[cat.value] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Liste des modèles */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun modèle de fichier importé</p>
              <Button variant="outline" className="mt-4" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importer un modèle
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {template.type_fichier === "pdf" ? (
                        <FileText className="h-8 w-8 text-red-500 shrink-0" />
                      ) : (
                        <File className="h-8 w-8 text-blue-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{template.nom}</span>
                          <Badge variant="outline" className="text-xs uppercase">
                            {template.type_fichier}
                          </Badge>
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(template.categorie)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {template.variables?.length || 0} variables
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {format(new Date(template.created_at), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(template)}>
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(template)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TemplateFileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fichier "{templateToDelete?.nom}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
