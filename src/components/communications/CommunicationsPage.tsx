import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  FileText,
  Send,
  UserPlus,
  Calendar,
  CreditCard,
  Award,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailTemplates, useDeleteEmailTemplate, type EmailTemplate } from "@/hooks/useEmailTemplates";
import { EmailTemplateFormDialog } from "./EmailTemplateFormDialog";
import { EmailTemplatePreviewDialog } from "./EmailTemplatePreviewDialog";
import { RelancesAutoPanel } from "./RelancesAutoPanel";
import { EmptyState } from "@/components/ui/empty-state";
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

const categorieConfig: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  inscription: { label: "Inscription", icon: UserPlus, class: "bg-success/10 text-success border-success/20" },
  convocation: { label: "Convocation", icon: Calendar, class: "bg-primary/10 text-primary border-primary/20" },
  paiement: { label: "Paiement", icon: CreditCard, class: "bg-warning/10 text-warning border-warning/20" },
  examen: { label: "Examen", icon: Award, class: "bg-info/10 text-info border-info/20" },
  renouvellement: { label: "Renouvellement", icon: RefreshCw, class: "bg-destructive/10 text-destructive border-destructive/20" },
  prospection: { label: "Prospection", icon: Send, class: "bg-secondary/50 text-secondary-foreground border-secondary/20" },
  administratif: { label: "Administratif", icon: FileText, class: "bg-muted text-muted-foreground border-muted-foreground/20" },
  modification: { label: "Modification", icon: AlertTriangle, class: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  autre: { label: "Autre", icon: Mail, class: "bg-muted text-muted-foreground border-muted-foreground/20" },
};

export function CommunicationsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategorie, setSelectedCategorie] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  
  const { data: templates = [], isLoading } = useEmailTemplates();
  const deleteTemplate = useDeleteEmailTemplate();

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = 
      t.nom.toLowerCase().includes(search.toLowerCase()) ||
      t.sujet.toLowerCase().includes(search.toLowerCase());
    const matchesCategorie = selectedCategorie === "all" || t.categorie === selectedCategorie;
    return matchesSearch && matchesCategorie;
  });

  const categories = ["all", ...new Set(templates.map((t) => t.categorie))];

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormDialogOpen(true);
  };

  const handleDuplicate = (template: EmailTemplate) => {
    setEditingTemplate({
      ...template,
      id: "",
      nom: `${template.nom} (copie)`,
    });
    setFormDialogOpen(true);
  };

  const handleCloseForm = () => {
    setFormDialogOpen(false);
    setEditingTemplate(null);
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Communications" 
        subtitle="Modèles d'emails personnalisables"
      />

      <main className="p-6 space-y-6 animate-fade-in">
        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">Modèles d'emails</TabsTrigger>
            <TabsTrigger value="relances">Relances automatiques</TabsTrigger>
          </TabsList>

          <TabsContent value="relances" className="mt-4">
            <RelancesAutoPanel />
          </TabsContent>

          <TabsContent value="templates" className="mt-4 space-y-6">
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un modèle..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setFormDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau modèle
              </Button>
            </div>

        {/* Tabs par catégorie */}
        <Tabs value={selectedCategorie} onValueChange={setSelectedCategorie}>
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="text-xs">
              Tous ({templates.length})
            </TabsTrigger>
            {categories.filter(c => c !== "all").map((cat) => {
              const config = categorieConfig[cat] || categorieConfig.autre;
              const count = templates.filter(t => t.categorie === cat).length;
              return (
                <TabsTrigger key={cat} value={cat} className="text-xs">
                  {config.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedCategorie} className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              search ? (
                <EmptyState
                  variant="search"
                  searchQuery={search}
                  onReset={() => setSearch("")}
                />
              ) : selectedCategorie !== "all" ? (
                <EmptyState
                  variant="filter"
                  description="Aucun modèle dans cette catégorie."
                  onReset={() => setSelectedCategorie("all")}
                />
              ) : (
                <EmptyState
                  icon={Mail}
                  title="Aucun modèle d'email"
                  description="Créez votre premier modèle pour standardiser vos communications (convocations, rappels, factures…)."
                  action={{ label: "Créer un template", onClick: () => setFormDialogOpen(true), icon: Plus }}
                />
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => {
                  const config = categorieConfig[template.categorie] || categorieConfig.autre;
                  const Icon = config.icon;
                  
                  return (
                    <Card key={template.id} className="group hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-2 rounded-md", config.class)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-medium line-clamp-1">
                                {template.nom}
                              </CardTitle>
                              <Badge variant="outline" className={cn("text-xs mt-1", config.class)}>
                                {config.label}
                              </Badge>
                            </div>
                          </div>
                          {!template.actif && (
                            <Badge variant="secondary" className="text-xs">
                              Inactif
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sujet</p>
                          <p className="text-sm line-clamp-1">{template.sujet}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Aperçu</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.contenu.substring(0, 100)}...
                          </p>
                        </div>

                        {template.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.variables.slice(0, 4).map((v) => (
                              <Badge key={v} variant="secondary" className="text-xs">
                                {`{{${v}}}`}
                              </Badge>
                            ))}
                            {template.variables.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{template.variables.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setPreviewTemplate(template)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Aperçu
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Modifier
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDuplicate(template)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteTemplate.mutate(template.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info variables */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Variables disponibles</CardTitle>
            <CardDescription className="text-xs">
              Utilisez ces variables dans vos modèles, elles seront remplacées automatiquement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {["civilite", "nom", "prenom", "email", "telephone", "formation_type", "date_debut", "date_fin", "lieu", "formateur", "numero_facture", "montant"].map((v) => (
                <Badge key={v} variant="outline" className="text-xs font-mono">
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <EmailTemplateFormDialog
        open={formDialogOpen}
        onOpenChange={handleCloseForm}
        template={editingTemplate}
      />

      <EmailTemplatePreviewDialog
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={() => setPreviewTemplate(null)}
      />
    </div>
  );
}
