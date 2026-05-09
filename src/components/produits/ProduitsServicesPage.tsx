import { useState } from "react";
import { Plus, Search, Copy, Edit, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ProduitService,
  ProduitStatut,
  PRODUIT_STATUT_LABELS,
  PRODUIT_TYPE_LABELS,
  useDeleteProduitService,
  useDuplicateProduitService,
  useProduitsServices,
  useProduitCategories,
} from "@/hooks/useProduitsServices";
import { ProduitServiceFormDialog } from "./ProduitServiceFormDialog";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const statutColor: Record<ProduitStatut, string> = {
  actif: "bg-success/10 text-success border-success/20",
  inactif: "bg-muted text-muted-foreground",
  brouillon: "bg-warning/10 text-warning border-warning/20",
  archive: "bg-muted text-muted-foreground line-through",
};

export function ProduitsServicesPage() {
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState<ProduitStatut | "all">("all");
  const [categorieId, setCategorieId] = useState<string>("all");
  const [editing, setEditing] = useState<ProduitService | null>(null);
  const [open, setOpen] = useState(false);

  const { data: produits = [], isLoading } = useProduitsServices({
    statut: statut === "all" ? undefined : statut,
    categorie_id: categorieId === "all" ? undefined : categorieId,
    search: search || undefined,
  });
  const { data: categories = [] } = useProduitCategories();
  const dupMut = useDuplicateProduitService();
  const delMut = useDeleteProduitService();

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (p: ProduitService) => { setEditing(p); setOpen(true); };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Produits & Services
          </h1>
          <p className="text-sm text-muted-foreground">
            Catalogue des produits et services annexes (location de salle, véhicules, supports, prestations)
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau produit
        </Button>
      </div>

      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un produit..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statut} onValueChange={(v) => setStatut(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(PRODUIT_STATUT_LABELS).map(([k, l]) => (
              <SelectItem key={k} value={k}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categorieId} onValueChange={setCategorieId}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Chargement...</div>
      ) : produits.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-lg font-medium">Aucun produit</p>
          <p className="text-sm text-muted-foreground mb-4">
            Créez votre premier produit ou service annexe
          </p>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {produits.map((p) => (
            <Card key={p.id} className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{p.nom}</h3>
                  {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>}
                </div>
                <Badge variant="outline" className={statutColor[p.statut]}>
                  {PRODUIT_STATUT_LABELS[p.statut]}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="secondary">{PRODUIT_TYPE_LABELS[p.type]}</Badge>
                {p.categorie && (
                  <Badge variant="outline" style={p.categorie.couleur ? { borderColor: p.categorie.couleur, color: p.categorie.couleur } : undefined}>
                    {p.categorie.nom}
                  </Badge>
                )}
              </div>

              {p.description_courte && (
                <p className="text-xs text-muted-foreground line-clamp-2">{p.description_courte}</p>
              )}

              <div className="flex items-baseline gap-2 mt-auto">
                <span className="text-lg font-bold">{fmt(p.prix_ht)}</span>
                <span className="text-xs text-muted-foreground">HT · TVA {p.tva_percent}%</span>
              </div>
              {p.unite && <p className="text-xs text-muted-foreground -mt-2">/ {p.unite}</p>}

              {p.gestion_stock && (
                <div className="text-xs">
                  Stock : <span className={p.stock_actuel != null && p.seuil_alerte != null && p.stock_actuel <= p.seuil_alerte ? "text-destructive font-semibold" : "font-semibold"}>{p.stock_actuel ?? "—"}</span>
                </div>
              )}

              <div className="flex gap-1 pt-2 border-t">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                  <Edit className="h-3.5 w-3.5 mr-1" />Modifier
                </Button>
                <Button variant="ghost" size="icon" onClick={() => dupMut.mutate(p)} title="Dupliquer">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{p.nom}" sera déplacé dans la corbeille.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => delMut.mutate(p.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <ProduitServiceFormDialog
          open={open}
          onOpenChange={setOpen}
          produit={editing}
        />
      )}
    </div>
  );
}
