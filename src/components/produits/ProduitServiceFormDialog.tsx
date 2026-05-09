import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ProduitService,
  ProduitStatut,
  ProduitType,
  PRODUIT_STATUT_LABELS,
  PRODUIT_TYPE_LABELS,
  useProduitCategories,
  useUpsertProduitService,
} from "@/hooks/useProduitsServices";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produit?: ProduitService | null;
}

const TVA_RATES = [0, 5.5, 10, 20];

export function ProduitServiceFormDialog({ open, onOpenChange, produit }: Props) {
  const { data: categories = [] } = useProduitCategories();
  const upsert = useUpsertProduitService();

  const [form, setForm] = useState<any>(() => ({
    nom: produit?.nom ?? "",
    sku: produit?.sku ?? "",
    description_courte: produit?.description_courte ?? "",
    description_longue: produit?.description_longue ?? "",
    categorie_id: produit?.categorie_id ?? null,
    type: (produit?.type ?? "unitaire") as ProduitType,
    unite: produit?.unite ?? "",
    prix_ht: produit?.prix_ht ?? 0,
    tva_percent: produit?.tva_percent ?? 20,
    statut: (produit?.statut ?? "brouillon") as ProduitStatut,
    gestion_stock: produit?.gestion_stock ?? false,
    stock_actuel: produit?.stock_actuel ?? null,
    seuil_alerte: produit?.seuil_alerte ?? null,
    caution_montant: produit?.caution_montant ?? null,
    duree_minutes: produit?.duree_minutes ?? null,
    tags: produit?.tags ?? [],
    photos: produit?.photos ?? [],
  }));

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nom?.trim()) return;
    await upsert.mutateAsync({ id: produit?.id, ...form });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produit ? "Modifier" : "Nouveau"} produit / service</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="tarif">Tarif & TVA</TabsTrigger>
            <TabsTrigger value="stock">Stock & Caution</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom *</Label>
                <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} />
              </div>
              <div>
                <Label>Référence (SKU)</Label>
                <Input value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.categorie_id ?? "none"} onValueChange={(v) => set("categorie_id", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucune —</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v as ProduitType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRODUIT_TYPE_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => set("statut", v as ProduitStatut)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRODUIT_STATUT_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unité (ex: heure, jour, pièce)</Label>
                <Input value={form.unite ?? ""} onChange={(e) => set("unite", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Description courte</Label>
                <Input value={form.description_courte ?? ""} onChange={(e) => set("description_courte", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Description détaillée</Label>
                <Textarea rows={4} value={form.description_longue ?? ""} onChange={(e) => set("description_longue", e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tarif" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prix HT (€)</Label>
                <Input type="number" step="0.01" value={form.prix_ht}
                  onChange={(e) => set("prix_ht", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>TVA</Label>
                <Select value={String(form.tva_percent)} onValueChange={(v) => set("tva_percent", parseFloat(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TVA_RATES.map((r) => (
                      <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">
                Prix TTC : <span className="font-semibold">{(form.prix_ht * (1 + form.tva_percent / 100)).toFixed(2)} €</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.gestion_stock} onCheckedChange={(v) => set("gestion_stock", v)} />
              <Label>Activer la gestion de stock</Label>
            </div>
            {form.gestion_stock && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stock actuel</Label>
                  <Input type="number" value={form.stock_actuel ?? ""}
                    onChange={(e) => set("stock_actuel", e.target.value ? parseInt(e.target.value) : null)} />
                </div>
                <div>
                  <Label>Seuil d'alerte</Label>
                  <Input type="number" value={form.seuil_alerte ?? ""}
                    onChange={(e) => set("seuil_alerte", e.target.value ? parseInt(e.target.value) : null)} />
                </div>
              </div>
            )}
            <div>
              <Label>Caution (€) — pour location</Label>
              <Input type="number" step="0.01" value={form.caution_montant ?? ""}
                onChange={(e) => set("caution_montant", e.target.value ? parseFloat(e.target.value) : null)} />
            </div>
            <div>
              <Label>Durée par défaut (minutes) — pour réservations</Label>
              <Input type="number" value={form.duree_minutes ?? ""}
                onChange={(e) => set("duree_minutes", e.target.value ? parseInt(e.target.value) : null)} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={upsert.isPending || !form.nom?.trim()}>
            {produit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
