import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  GraduationCap,
  Clock,
  Euro,
  LayoutGrid,
  List,
  Percent,
  Download,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useCatalogueFormations, 
  useDeleteCatalogueFormation,
  type CatalogueFormation 
} from "@/hooks/useCatalogueFormations";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import { centreToCompanyInfo } from "@/lib/centre-to-company";
import { generateProgrammeStandalonePDF, downloadPDF } from "@/lib/pdf-generator";
import { type TypeFormation } from "@/constants/formations";
import { CatalogueFormDialog } from "./CatalogueFormDialog";
import { FormationCard } from "./FormationCard";
import { toast } from "sonner";

const typeLabels: Record<string, { label: string; class: string }> = {
  initiale: { label: "Initiale", class: "bg-primary/10 text-primary" },
  continue: { label: "Continue", class: "bg-warning/10 text-warning" },
  mobilite: { label: "Mobilité", class: "bg-info/10 text-info" },
  accompagnement: { label: "Accompagnement", class: "bg-success/10 text-success" },
  autre: { label: "Autre", class: "bg-muted text-muted-foreground" },
};

export function FormationsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingFormation, setEditingFormation] = useState<CatalogueFormation | null>(null);
  
  const { data: formations = [], isLoading } = useCatalogueFormations();
  const { centreFormation } = useCentreFormation();
  const deleteFormation = useDeleteCatalogueFormation();

  const categories = ["all", ...new Set(formations.map((f) => f.categorie))];

  const filteredFormations = formations.filter((f) => {
    const matchesSearch = 
      f.intitule.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || f.categorie === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleEdit = (formation: CatalogueFormation) => {
    setEditingFormation(formation);
    setFormDialogOpen(true);
  };

  const handleCloseForm = () => {
    setFormDialogOpen(false);
    setEditingFormation(null);
  };

  const formatPrix = (prix: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(prix);
  };

  // Map categorie to TypeFormation for PDF generation
  const getFormationType = (formation: CatalogueFormation): TypeFormation | null => {
    const cat = formation.categorie.toUpperCase();
    if (cat === "VTC") return "VTC";
    if (cat === "TAXI" && formation.intitule.toLowerCase().includes("75")) return "TAXI-75";
    if (cat === "TAXI" && formation.intitule.toLowerCase().includes("paris")) return "TAXI-75";
    if (cat === "TAXI") return "TAXI";
    if (cat === "VMDTR") return "VMDTR";
    return null;
  };

  const handleDownloadProgramme = (formation: CatalogueFormation) => {
    const formationType = getFormationType(formation);
    if (!formationType) {
      toast.error("Programme non disponible pour cette catégorie");
      return;
    }
    
    const company = centreToCompanyInfo(centreFormation);
    const doc = generateProgrammeStandalonePDF(formationType, company);
    const filename = `Programme-${formationType}-${formation.duree_heures}h.pdf`;
    downloadPDF(doc, filename);
    toast.success("Programme téléchargé avec succès");
  };

  // Transformer les données pour FormationCard
  const formationsForCards = filteredFormations.map((f) => ({
    id: f.id,
    intitule: f.intitule,
    type: f.type_formation as "initiale" | "continue" | "mobilite",
    categorie: f.categorie as "Taxi" | "VTC" | "VMDTR" | "Accompagnement",
    duree: `${f.duree_heures}h`,
    prix: f.prix_ht,
    places: 10,
    prochaineSessions: 0,
  }));

  return (
    <div className="min-h-screen">
      <Header 
        title="Catalogue des formations" 
        subtitle="Gérez votre offre de formation et articles"
        addLabel="Nouvel article"
        onAddClick={() => setFormDialogOpen(true)}
      />

      <main className="p-6 animate-fade-in space-y-6">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par code ou intitulé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === "cards" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "table" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            {categories.map((cat) => {
              const count = formations.filter(f => cat === "all" || f.categorie === cat).length;
              return (
                <TabsTrigger key={cat} value={cat} className="text-xs">
                  {cat === "all" ? "Tous" : cat} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredFormations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Aucun article trouvé</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setFormDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un article
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredFormations.map((formation) => (
                  <Card 
                    key={formation.id} 
                    className={cn(
                      "group hover:shadow-md transition-shadow",
                      !formation.actif && "opacity-60"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="text-xs font-mono mb-2">
                            {formation.code}
                          </Badge>
                          <CardTitle className="text-base">{formation.intitule}</CardTitle>
                        </div>
                        <Badge className={cn("text-xs", typeLabels[formation.type_formation]?.class || typeLabels.autre.class)}>
                          {typeLabels[formation.type_formation]?.label || formation.type_formation}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formation.duree_heures}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro className="h-3.5 w-3.5" />
                          <span className="font-semibold text-foreground">
                            {formatPrix(formation.prix_ht)}
                          </span>
                        </span>
                        {formation.remise_percent > 0 && (
                          <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                            <Percent className="h-3 w-3 mr-1" />
                            -{formation.remise_percent}%
                          </Badge>
                        )}
                      </div>
                      
                      {formation.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {formation.description}
                        </p>
                      )}

                      <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {getFormationType(formation) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadProgramme(formation)}
                            title="Télécharger le programme PDF"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Programme
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleEdit(formation)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Modifier
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                L'article "{formation.intitule}" sera définitivement supprimé du catalogue.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteFormation.mutate(formation.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Intitulé</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Durée</TableHead>
                      <TableHead className="text-right">Prix HT</TableHead>
                      <TableHead className="text-center">Remise</TableHead>
                      <TableHead className="text-center">Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFormations.map((formation) => (
                      <TableRow key={formation.id} className={cn(!formation.actif && "opacity-60")}>
                        <TableCell className="font-mono text-xs">{formation.code}</TableCell>
                        <TableCell className="font-medium">{formation.intitule}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formation.categorie}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", typeLabels[formation.type_formation]?.class || typeLabels.autre.class)}>
                            {typeLabels[formation.type_formation]?.label || formation.type_formation}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formation.duree_heures}h</TableCell>
                        <TableCell className="text-right font-medium">{formatPrix(formation.prix_ht)}</TableCell>
                        <TableCell className="text-center">
                          {formation.remise_percent > 0 ? (
                            <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                              -{formation.remise_percent}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {formation.actif ? "✓" : "✗"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {getFormationType(formation) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary"
                                onClick={() => handleDownloadProgramme(formation)}
                                title="Télécharger le programme PDF"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleEdit(formation)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    L'article "{formation.intitule}" sera définitivement supprimé.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteFormation.mutate(formation.id)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <CatalogueFormDialog
        open={formDialogOpen}
        onOpenChange={handleCloseForm}
        formation={editingFormation}
      />
    </div>
  );
}
