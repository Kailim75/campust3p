import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Plus, Trash2, GripVertical, Loader2, ArrowLeft } from "lucide-react";
import {
  useDocumentPacks, useCreatePack, useAddPackItem, useRemovePackItem,
  useTemplatesV2,
  TRACK_SCOPES, APPLIES_TO_OPTIONS,
  type TrackScope, type TemplateAppliesTo, type DocumentPack,
} from "@/hooks/useTemplateStudioV2";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
}

export function PacksManager({ onBack }: Props) {
  const { data: packs, isLoading } = useDocumentPacks();
  const { data: templates } = useTemplatesV2({ status: "published" });
  const createPack = useCreatePack();
  const addItem = useAddPackItem();
  const removeItem = useRemovePackItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [newPackName, setNewPackName] = useState("");
  const [newPackTrack, setNewPackTrack] = useState<TrackScope>("both");
  const [newPackApplies, setNewPackApplies] = useState<TemplateAppliesTo>("session");

  const [addTemplatePackId, setAddTemplatePackId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const handleCreatePack = async () => {
    if (!newPackName.trim()) { toast.error("Nom requis"); return; }
    await createPack.mutateAsync({ name: newPackName, track_scope: newPackTrack, applies_to: newPackApplies, is_default: true });
    setCreateOpen(false);
    setNewPackName("");
  };

  const handleAddTemplate = async () => {
    if (!addTemplatePackId || !selectedTemplateId) return;
    const pack = packs?.find((p) => p.id === addTemplatePackId);
    const maxOrder = pack?.items?.reduce((max, i) => Math.max(max, i.sort_order), 0) ?? 0;
    await addItem.mutateAsync({ pack_id: addTemplatePackId, template_id: selectedTemplateId, sort_order: maxOrder + 1 });
    setAddTemplatePackId(null);
    setSelectedTemplateId("");
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Packs de documents recommandés</h2>
          <p className="text-sm text-muted-foreground">Organisez les templates par parcours (Initial / Formation Continue)</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau pack
        </Button>
      </div>

      {(!packs || packs.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-muted-foreground">Aucun pack configuré</p>
            <p className="text-sm text-muted-foreground mt-1">Créez un pack pour regrouper vos templates par parcours</p>
            <Button onClick={() => setCreateOpen(true)} className="mt-4 gap-2"><Plus className="h-4 w-4" />Créer un pack</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {packs.map((pack) => (
            <Card key={pack.id}>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">{pack.name}</CardTitle>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="outline" className="text-xs">{TRACK_SCOPES.find((s) => s.value === pack.track_scope)?.label}</Badge>
                    <Badge variant="secondary" className="text-xs">{pack.items?.length || 0} templates</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAddTemplatePackId(pack.id)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />Ajouter
                </Button>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {(!pack.items || pack.items.length === 0) ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun template dans ce pack</p>
                ) : (
                  <div className="space-y-2">
                    {pack.items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="text-sm flex-1 truncate">{item.template?.name || item.template_id}</span>
                        {item.is_required && <Badge variant="destructive" className="text-[10px]">Requis</Badge>}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem.mutate(item.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Pack Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau pack</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom</Label><Input value={newPackName} onChange={(e) => setNewPackName(e.target.value)} placeholder="Ex: Pack Initial (CMA)" /></div>
            <div>
              <Label>Parcours</Label>
              <Select value={newPackTrack} onValueChange={(v) => setNewPackTrack(v as TrackScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRACK_SCOPES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>S'applique à</Label>
              <Select value={newPackApplies} onValueChange={(v) => setNewPackApplies(v as TemplateAppliesTo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLIES_TO_OPTIONS.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreatePack} disabled={createPack.isPending}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Template to Pack Dialog */}
      <Dialog open={!!addTemplatePackId} onOpenChange={() => setAddTemplatePackId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un template au pack</DialogTitle></DialogHeader>
          <div>
            <Label>Template publié</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger><SelectValue placeholder="Choisir un template..." /></SelectTrigger>
              <SelectContent>
                {(templates || []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTemplatePackId(null)}>Annuler</Button>
            <Button onClick={handleAddTemplate} disabled={!selectedTemplateId}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
