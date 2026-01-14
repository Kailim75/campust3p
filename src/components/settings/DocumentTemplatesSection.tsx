import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  ChevronRight,
  FileSignature,
  Award,
  ScrollText,
  FileSpreadsheet,
  Mail,
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

// Icônes par type de document
const typeIcons: Record<string, React.ReactNode> = {
  convention: <ScrollText className="h-4 w-4" />,
  contrat: <FileSignature className="h-4 w-4" />,
  attestation: <Award className="h-4 w-4" />,
  convocation: <Mail className="h-4 w-4" />,
  reglement: <FileSpreadsheet className="h-4 w-4" />,
  facture: <FileText className="h-4 w-4" />,
  devis: <FileText className="h-4 w-4" />,
  autre: <FileText className="h-4 w-4" />,
};

export function DocumentTemplatesSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    formation: true,
    administratif: true,
    communication: true,
    comptabilite: true,
  });

  const { data: templates = [], isLoading } = useDocumentTemplates();
  const deleteTemplate = useDeleteDocumentTemplate();
  const createTemplate = useCreateDocumentTemplate();

  // Filtrer les templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch =
        t.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.type_document.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.categorie.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = filterCategory === "all" || t.categorie === filterCategory;
      const matchType = filterType === "all" || t.type_document === filterType;
      return matchSearch && matchCategory && matchType;
    });
  }, [templates, searchQuery, filterCategory, filterType]);

  // Grouper par catégorie puis par type
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Record<string, DocumentTemplate[]>> = {};
    
    filteredTemplates.forEach((template) => {
      if (!groups[template.categorie]) {
        groups[template.categorie] = {};
      }
      if (!groups[template.categorie][template.type_document]) {
        groups[template.categorie][template.type_document] = [];
      }
      groups[template.categorie][template.type_document].push(template);
    });

    return groups;
  }, [filteredTemplates]);

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

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Stats par type
  const statsByType = useMemo(() => {
    const stats: Record<string, number> = {};
    templates.forEach((t) => {
      stats[t.type_document] = (stats[t.type_document] || 0) + 1;
    });
    return stats;
  }, [templates]);

  // Stats par catégorie
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
          {/* Stats par type */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {documentTypes.slice(0, 6).map((type) => (
              <div
                key={type.value}
                className={`p-3 border rounded-lg text-center cursor-pointer transition-colors ${
                  filterType === type.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setFilterType(filterType === type.value ? "all" : type.value)}
              >
                <div className="flex justify-center mb-1 text-muted-foreground">
                  {typeIcons[type.value]}
                </div>
                <p className="text-lg font-bold">{statsByType[type.value] || 0}</p>
                <p className="text-xs text-muted-foreground truncate">{type.label}</p>
              </div>
            ))}
          </div>

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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label} ({statsByType[type.value] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Liste groupée */}
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
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {Object.entries(groupedTemplates).map(([category, typeGroups]) => (
                  <Collapsible
                    key={category}
                    open={openCategories[category]}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          {openCategories[category] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-semibold">{getCategoryLabel(category)}</span>
                          <Badge variant="secondary">
                            {Object.values(typeGroups).flat().length}
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-3">
                      {Object.entries(typeGroups).map(([type, templateList]) => (
                        <div key={type} className="ml-4">
                          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                            {typeIcons[type]}
                            <span className="font-medium">{getTypeLabel(type)}</span>
                            <Badge variant="outline" className="text-xs">
                              {templateList.length}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                            {templateList.map((template) => (
                              <div
                                key={template.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors group"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{template.nom}</span>
                                    {!template.actif && (
                                      <Badge variant="secondary" className="text-xs">
                                        Inactif
                                      </Badge>
                                    )}
                                  </div>
                                  {template.description && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {template.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {template.variables?.length || 0} variables •{" "}
                                    {format(new Date(template.updated_at), "dd MMM yyyy", { locale: fr })}
                                  </p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
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
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
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
