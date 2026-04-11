import { useState } from "react";
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
  AlertTriangle,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailTemplates, useDeleteEmailTemplate, type EmailTemplate } from "@/hooks/useEmailTemplates";
import { EmailTemplateFormDialog } from "./EmailTemplateFormDialog";
import { EmailTemplatePreviewDialog } from "./EmailTemplatePreviewDialog";
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
  const activeTemplates = templates.filter((template) => template.actif).length;
  const inactiveTemplates = templates.length - activeTemplates;
  const hasFilters = search.length > 0 || selectedCategorie !== "all";

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

  const resetFilters = () => {
    setSearch("");
    setSelectedCategorie("all");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Modèles et envois
            </Badge>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Gardez vos modèles utiles, lisibles et faciles à retrouver.</h2>
              <p className="text-sm text-muted-foreground">
                Ici, le plus important est de piloter les modèles actifs, repérer les catégories utiles et éviter que la bibliothèque devienne un catalogue brouillon.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background/80 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bibliothèque</p>
              <p className="text-lg font-semibold">{templates.length}</p>
              <p className="text-xs text-muted-foreground">Modèles disponibles</p>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Actifs</p>
              <p className="text-lg font-semibold">{activeTemplates}</p>
              <p className="text-xs text-muted-foreground">{inactiveTemplates} inactif{inactiveTemplates > 1 ? "s" : ""} en réserve</p>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Affichés</p>
              <p className="text-lg font-semibold">{filteredTemplates.length}</p>
              <p className="text-xs text-muted-foreground">Après recherche et filtres</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <main className="space-y-6">
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

        <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">
              {filteredTemplates.length} modèle{filteredTemplates.length > 1 ? "s" : ""} visible{filteredTemplates.length > 1 ? "s" : ""}
            </span>
            {hasFilters ? (
              <>
                <Badge variant="outline">Filtres actifs</Badge>
                {selectedCategorie !== "all" && (
                  <Badge variant="secondary">{categorieConfig[selectedCategorie]?.label || selectedCategorie}</Badge>
                )}
                {search && <Badge variant="secondary">Recherche</Badge>}
              </>
            ) : (
              <span>Vue complète de la bibliothèque d'emails.</span>
            )}
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-2 self-start sm:self-auto" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser
            </Button>
          )}
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
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="font-medium text-foreground">Aucun modèle trouvé</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasFilters
                      ? "Essayez d'élargir vos filtres ou votre recherche."
                      : "Commencez par créer un modèle utile au quotidien pour l'équipe."}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setFormDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un modèle
                  </Button>
                </CardContent>
              </Card>
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
                        <div className="flex gap-1 pt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Le modèle "{template.nom}" sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTemplate.mutate(template.id)}
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>
                  Utilisez ces variables dans le sujet ou dans le contenu pour garder des modèles réutilisables sans ressaisie manuelle.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["civilite", "nom", "prenom", "email", "telephone", "formation_type", "date_debut", "date_fin", "lieu", "formateur", "numero_facture", "montant"].map((v) => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
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
