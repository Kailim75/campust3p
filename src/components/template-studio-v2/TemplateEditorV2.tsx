import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Save, Send, Eye, Code, History, Loader2, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTemplateV2, useCreateTemplateV2, useUpdateTemplateV2, usePublishTemplateV2,
  useTemplateVersionsV2, useRollbackTemplateV2,
  TEMPLATE_CATEGORIES, TRACK_SCOPES, APPLIES_TO_OPTIONS,
  type TemplateV2, type TrackScope, type TemplateCategory, type TemplateAppliesTo,
} from "@/hooks/useTemplateStudioV2";
import { TEMPLATE_TYPES } from "@/hooks/useTemplateStudio";
import TemplatePreview from "@/components/template-studio/TemplatePreview";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Variable categories for click-to-insert
const VARIABLE_GROUPS = [
  {
    label: "Contact",
    vars: ["nom", "prenom", "email", "telephone", "civilite", "date_naissance", "adresse", "ville", "code_postal", "rue", "ville_naissance", "pays_naissance"],
  },
  {
    label: "Session",
    vars: ["session_nom", "session_date_debut", "session_date_fin", "duree_heures", "formation_type", "lieu", "formateur_nom", "horaires"],
  },
  {
    label: "Centre",
    vars: ["centre_nom", "centre_nom_legal", "centre_siret", "centre_nda", "centre_adresse", "centre_email", "centre_telephone", "centre_forme_juridique", "responsable_nom", "responsable_fonction"],
  },
  {
    label: "Document",
    vars: ["date_jour", "numero_facture", "montant_total", "prix_total"],
  },
];

interface Props {
  templateId: string | null;
  isCreating: boolean;
  onBack: () => void;
}

export function TemplateEditorV2({ templateId, isCreating, onBack }: Props) {
  const { data: template, isLoading } = useTemplateV2(templateId);
  const { data: versions } = useTemplateVersionsV2(templateId);
  const createTemplate = useCreateTemplateV2();
  const updateTemplate = useUpdateTemplateV2();
  const publishTemplate = usePublishTemplateV2();
  const rollback = useRollbackTemplateV2();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("autre");
  const [body, setBody] = useState("");
  const [trackScope, setTrackScope] = useState<TrackScope>("both");
  const [category, setCategory] = useState<TemplateCategory>("formation");
  const [appliesTo, setAppliesTo] = useState<TemplateAppliesTo>("contact");
  const [editorTab, setEditorTab] = useState("edit");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setType(template.type);
      setBody(template.template_body);
      setTrackScope(template.track_scope || "both");
      setCategory(template.category || "formation");
      setAppliesTo(template.applies_to || "contact");
    }
  }, [template]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Le nom est requis"); return; }
    setSaving(true);
    try {
      if (isCreating) {
        const created = await createTemplate.mutateAsync({
          name, description, type: type as any, format: "html" as any,
          template_body: body, track_scope: trackScope, category, applies_to: appliesTo,
        });
        onBack();
      } else if (templateId) {
        await updateTemplate.mutateAsync({
          id: templateId, name, description, template_body: body,
          type: type as any, track_scope: trackScope, category, applies_to: appliesTo,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!templateId || !template) return;
    // Save first
    await updateTemplate.mutateAsync({
      id: templateId, name, description, template_body: body,
      type: type as any, track_scope: trackScope, category, applies_to: appliesTo,
    });
    await publishTemplate.mutateAsync({ template: { ...template, template_body: body, name }, changelog });
    setPublishDialogOpen(false);
    setChangelog("");
  };

  const insertVariable = (varName: string) => {
    setBody((prev) => prev + `{{${varName}}}`);
  };

  if (isLoading && !isCreating) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Metadata Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Nom du template</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Convention de formation" />
            </div>
            <div>
              <Label>Type de document</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parcours</Label>
              <Select value={trackScope} onValueChange={(v) => setTrackScope(v as TrackScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRACK_SCOPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description courte..." />
          </div>
        </CardContent>
      </Card>

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Editor Panel (2/3) */}
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <Tabs value={editorTab} onValueChange={setEditorTab}>
                <TabsList>
                  <TabsTrigger value="edit" className="gap-1.5"><Code className="h-3.5 w-3.5" />Éditeur</TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Aperçu</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-2">
                {templateId && !isCreating && (
                  <Button variant="outline" size="sm" onClick={() => setVersionsOpen(true)} className="gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    Versions {versions?.length ? `(${versions.length})` : ""}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Enregistrer
                </Button>
                {templateId && !isCreating && (
                  <Button size="sm" onClick={() => setPublishDialogOpen(true)} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Publier
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {editorTab === "edit" ? (
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[500px] border-0 rounded-none font-mono text-sm resize-none focus-visible:ring-0"
                  placeholder="<h1>{{centre_nom}}</h1>&#10;&#10;<p>Convention de formation entre...</p>"
                />
              ) : (
                <div className="p-4">
                  <TemplatePreview body={body} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Variables Panel (1/3) */}
        <div>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Variables disponibles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                <div className="px-4 pb-4 space-y-4">
                  {VARIABLE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.vars.map((v) => (
                          <button
                            key={v}
                            onClick={() => insertVariable(v)}
                            className="text-xs px-2 py-1 rounded-md bg-primary/5 hover:bg-primary/15 text-primary border border-primary/10 hover:border-primary/30 transition-colors font-mono"
                          >
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publier le template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La publication crée une nouvelle version figée. Seuls les templates publiés sont utilisables pour la génération de documents.
            </p>
            <div>
              <Label>Changelog (optionnel)</Label>
              <Textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="Décrivez les modifications..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>Annuler</Button>
            <Button onClick={handlePublish} disabled={publishTemplate.isPending} className="gap-1.5">
              {publishTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publier v{template ? template.version + 1 : 1}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions Dialog */}
      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Historique des versions</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {(versions || []).map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={v.is_published ? "default" : "outline"} className="text-xs">
                        v{v.version}
                      </Badge>
                      {v.is_published && <Badge className="text-xs bg-green-500/10 text-green-600">Actif</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(v.created_at).toLocaleString("fr-FR")}
                    </p>
                    {v.changelog && <p className="text-xs mt-1">{v.changelog}</p>}
                  </div>
                  {!v.is_published && templateId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        rollback.mutate({ templateId, versionId: v.id });
                        setVersionsOpen(false);
                      }}
                    >
                      Restaurer
                    </Button>
                  )}
                </div>
              ))}
              {(!versions || versions.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune version enregistrée</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
