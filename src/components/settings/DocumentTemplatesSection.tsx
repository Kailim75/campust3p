import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  Copy,
  Loader2,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useDocumentTemplates,
  useDeleteDocumentTemplate,
  useCreateDocumentTemplate,
  DocumentTemplate,
  documentTypes,
  documentCategories,
} from "@/hooks/useDocumentTemplates";
import { DocumentTemplateFormDialog } from "./DocumentTemplateFormDialog";
import { DocumentTemplatePreviewDialog } from "./DocumentTemplatePreviewDialog";
import { toast } from "sonner";

export function DocumentTemplatesSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);

  const { data: templates = [], isLoading } = useDocumentTemplates();
  const deleteTemplate = useDeleteDocumentTemplate();
  const createTemplate = useCreateDocumentTemplate();

  const filteredTemplates = templates.filter((t) =>
    t.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type_document.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.categorie.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setFormOpen(true);
  };

  const handlePreview = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleDelete = (template: DocumentTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleDuplicate = async (template: DocumentTemplate) => {
    await createTemplate.mutateAsync({
      nom: `${template.nom} (copie)`,
      type_document: template.type_document,
      categorie: template.categorie,
      contenu: template.contenu,
      variables: template.variables,
      actif: template.actif,
      description: template.description,
    });
    toast.success("Modèle dupliqué");
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormOpen(true);
  };

  const getTypeLabel = (value: string) =>
    documentTypes.find((t) => t.value === value)?.label || value;

  const getCategoryLabel = (value: string) =>
    documentCategories.find((c) => c.value === value)?.label || value;

  // Stats
  const stats = {
    total: templates.length,
    actifs: templates.filter((t) => t.actif).length,
    formation: templates.filter((t) => t.categorie === "formation").length,
    administratif: templates.filter((t) => t.categorie === "administratif").length,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Modèles de documents
              </CardTitle>
              <CardDescription>
                Créez et personnalisez vos modèles de contrats, conventions et attestations
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau modèle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 border rounded-lg text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <p className="text-2xl font-bold text-success">{stats.actifs}</p>
              <p className="text-xs text-muted-foreground">Actifs</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{stats.formation}</p>
              <p className="text-xs text-muted-foreground">Formation</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <p className="text-2xl font-bold text-secondary-foreground">{stats.administratif}</p>
              <p className="text-xs text-muted-foreground">Administratif</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun modèle trouvé</p>
              <Button variant="outline" className="mt-4" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un modèle
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Modifié le</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {template.nom}
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {template.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(template.type_document)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryLabel(template.categorie)}</Badge>
                      </TableCell>
                      <TableCell>
                        {template.variables && template.variables.length > 0 ? (
                          <span className="text-sm">{template.variables.length}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.actif ? "default" : "secondary"}>
                          {template.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(template.updated_at), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreview(template)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Prévisualiser
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Dupliquer
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DocumentTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={selectedTemplate}
      />

      <DocumentTemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={selectedTemplate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le modèle "{templateToDelete?.nom}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
