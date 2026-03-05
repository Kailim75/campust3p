import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  Plus, Search, Edit, Trash2, GraduationCap, Clock, Euro,
  LayoutGrid, List, Percent, Download, ArrowUpDown, Filter, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useCatalogueFormations, useDeleteCatalogueFormation, useRecalcTrackForCatalogue,
  type CatalogueFormation 
} from "@/hooks/useCatalogueFormations";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import { centreToCompanyInfo } from "@/lib/centre-to-company";
import { generateProgrammeStandalonePDF, downloadPDF } from "@/lib/pdf-generator";
import { type TypeFormation } from "@/constants/formations";
import { CatalogueFormDialog } from "./CatalogueFormDialog";
import { CatalogueStatsBar } from "./CatalogueStatsBar";
import { CatalogueArticleCard } from "./CatalogueArticleCard";
import { toast } from "sonner";

const typeLabels: Record<string, { label: string; class: string }> = {
  initiale: { label: "Initiale", class: "bg-primary/10 text-primary" },
  continue: { label: "Continue", class: "bg-warning/10 text-warning" },
  mobilite: { label: "Mobilité", class: "bg-info/10 text-info" },
  accompagnement: { label: "Accompagnement", class: "bg-success/10 text-success" },
  autre: { label: "Service", class: "bg-muted text-muted-foreground" },
};

type SortOption = "nom" | "prix-asc" | "prix-desc" | "duree" | "recent";

export function FormationsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingFormation, setEditingFormation] = useState<CatalogueFormation | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("nom");
  const [showInactive, setShowInactive] = useState(true);
  
  const { data: formations = [], isLoading } = useCatalogueFormations();
  const { centreFormation } = useCentreFormation();
  const deleteFormation = useDeleteCatalogueFormation();
  const recalcTrack = useRecalcTrackForCatalogue();

  const categories = useMemo(
    () => ["all", ...new Set(formations.map((f) => f.categorie))],
    [formations]
  );

  const filteredFormations = useMemo(() => {
    let result = formations.filter((f) => {
      const matchesSearch =
        f.intitule.toLowerCase().includes(search.toLowerCase()) ||
        f.code.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === "all" || f.categorie === activeTab;
      const matchesActive = showInactive || f.actif;
      return matchesSearch && matchesTab && matchesActive;
    });

    // Sort
    switch (sortBy) {
      case "prix-asc":
        result = [...result].sort((a, b) => a.prix_ht - b.prix_ht);
        break;
      case "prix-desc":
        result = [...result].sort((a, b) => b.prix_ht - a.prix_ht);
        break;
      case "duree":
        result = [...result].sort((a, b) => b.duree_heures - a.duree_heures);
        break;
      case "recent":
        result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "nom":
      default:
        result = [...result].sort((a, b) => a.intitule.localeCompare(b.intitule));
        break;
    }

    return result;
  }, [formations, search, activeTab, sortBy, showInactive]);

  const handleEdit = (formation: CatalogueFormation) => {
    setEditingFormation(formation);
    setFormDialogOpen(true);
  };

  const handleCloseForm = () => {
    setFormDialogOpen(false);
    setEditingFormation(null);
  };

  const formatPrix = (prix: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(prix);

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

  const handleRecalcTrack = (formation: CatalogueFormation) => {
    if (confirm(`Recalculer le parcours « ${formation.track === "initial" ? "Initial" : "Formation continue"} » pour toutes les sessions et inscriptions liées à "${formation.intitule}" ?`)) {
      recalcTrack.mutate({ catalogueId: formation.id });
    }
  };

  const inactiveCount = formations.filter(f => !f.actif).length;

  return (
    <div className="min-h-screen">
      <Header 
        title="Catalogue des formations" 
        subtitle="Gérez votre offre de formation et articles"
        addLabel="Nouvel article"
        onAddClick={() => setFormDialogOpen(true)}
      />

      <main className="p-6 animate-fade-in space-y-6">
        {/* Stats */}
        {!isLoading && formations.length > 0 && (
          <CatalogueStatsBar formations={formations} />
        )}

        {/* Toolbar — clean single-row */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Rechercher un article…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-card border-border/60 focus-visible:border-primary/30 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-9 w-[140px] text-xs bg-card border-border/60 rounded-lg">
                  <ArrowUpDown className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Trier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nom">Nom A→Z</SelectItem>
                  <SelectItem value="prix-asc">Prix croissant</SelectItem>
                  <SelectItem value="prix-desc">Prix décroissant</SelectItem>
                  <SelectItem value="duree">Durée</SelectItem>
                  <SelectItem value="recent">Plus récent</SelectItem>
                </SelectContent>
              </Select>

              {/* Toggle inactive */}
              {inactiveCount > 0 && (
                <Button
                  variant={showInactive ? "outline" : "secondary"}
                  size="sm"
                  className={cn(
                    "h-9 text-xs rounded-lg border-border/60",
                    !showInactive && "bg-warning/10 text-warning border-warning/20 hover:bg-warning/15"
                  )}
                  onClick={() => setShowInactive(!showInactive)}
                >
                  <EyeOff className="h-3 w-3 mr-1.5" />
                  {showInactive ? "Masquer inactifs" : "Voir inactifs"}
                  <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-[10px] px-1 rounded-full bg-muted">
                    {inactiveCount}
                  </Badge>
                </Button>
              )}

              {/* View mode toggle */}
              <div className="flex bg-card border border-border/60 rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-none",
                    viewMode === "cards" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-none",
                    viewMode === "table" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Category Tabs — pill style */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1.5 p-1.5 bg-muted/40 rounded-xl border border-border/30">
              {categories.map((cat) => {
                const count = formations.filter(
                  (f) => (cat === "all" || f.categorie === cat) && (showInactive || f.actif)
                ).length;
                return (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className={cn(
                      "text-xs px-3.5 py-2 rounded-lg font-medium",
                      "data-[state=active]:shadow-sm data-[state=active]:bg-card"
                    )}
                  >
                    {cat === "all" ? "Tous" : cat}
                    <Badge
                      variant="secondary"
                      className="ml-1.5 h-[18px] min-w-[18px] text-[10px] px-1 rounded-full bg-background/80 font-semibold"
                    >
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-56 rounded-xl" />
                ))}
              </div>
            ) : filteredFormations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border/60 bg-muted/20">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
                  <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-foreground font-semibold text-base">Aucun article trouvé</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
                  {search ? "Essayez un autre terme de recherche" : "Commencez par ajouter un article au catalogue"}
                </p>
                <Button
                  variant="outline"
                  className="mt-5 rounded-lg"
                  onClick={() => setFormDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un article
                </Button>
              </div>
            ) : viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {filteredFormations.map((formation) => (
                  <CatalogueArticleCard
                    key={formation.id}
                    formation={formation}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteFormation.mutate(id)}
                    onDownloadProgramme={handleDownloadProgramme}
                    canDownloadProgramme={!!getFormationType(formation)}
                    onRecalcTrack={handleRecalcTrack}
                    isRecalcPending={recalcTrack.isPending}
                  />
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead>Intitulé</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Durée</TableHead>
                      <TableHead className="text-right">Prix HT</TableHead>
                      <TableHead className="text-center">Remise</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFormations.map((formation) => (
                      <TableRow
                        key={formation.id}
                        className={cn(
                          "group",
                          !formation.actif && "opacity-50"
                        )}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formation.code}
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[250px] truncate">
                          {formation.intitule}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{formation.categorie}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px]", typeLabels[formation.type_formation]?.class || typeLabels.autre.class)}>
                            {typeLabels[formation.type_formation]?.label || formation.type_formation}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formation.duree_heures > 0 ? `${formation.duree_heures}h` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm tabular-nums">
                          {formatPrix(formation.prix_ht)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formation.remise_percent > 0 ? (
                            <Badge variant="secondary" className="text-[10px] bg-success/10 text-success">
                              -{formation.remise_percent}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={formation.actif ? "default" : "outline"} className={cn(
                            "text-[10px]",
                            formation.actif ? "bg-success/10 text-success border-success/20" : "text-muted-foreground"
                          )}>
                            {formation.actif ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            {getFormationType(formation) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDownloadProgramme(formation)}
                                title="Programme PDF"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(formation)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
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

            {/* Result count */}
            {!isLoading && filteredFormations.length > 0 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                {filteredFormations.length} article{filteredFormations.length > 1 ? "s" : ""} affiché{filteredFormations.length > 1 ? "s" : ""}
                {search && ` pour "${search}"`}
              </p>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </main>

      <CatalogueFormDialog
        open={formDialogOpen}
        onOpenChange={handleCloseForm}
        formation={editingFormation}
      />
    </div>
  );
}
