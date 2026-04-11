// ═══════════════════════════════════════════════════════════════
// TemplateLibraryV2 — Template library using v2 hooks
// Replaces TemplateLibrary.tsx (v1) — Phase 7A
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, FileText, Edit, Trash2, CheckCircle2, Plus, Shield, Search,
  Wand2, BookOpen, Briefcase, CreditCard, GraduationCap, FileCheck, Rocket, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTemplatesV2,
  useDeleteTemplateV2,
  useCreateTemplateV2,
  type TemplateV2,
} from "@/hooks/useTemplateStudioV2";
import { TEMPLATE_TYPES, TEMPLATE_STATUSES } from "@/constants/templateConstants";
import { TEMPLATE_GENERATORS } from "@/lib/complianceEngine";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useCentreContext } from "@/contexts/CentreContext";

// Pre-built template catalog
const PREBUILT_TEMPLATES = [
  { type: "programme", label: "Programme de formation", icon: BookOpen, tags: ["Qualiopi", "DREETS"] },
  { type: "contrat", label: "Contrat de formation", icon: FileCheck, tags: ["Qualiopi", "DREETS"] },
  { type: "convention", label: "Convention de formation", icon: Briefcase, tags: ["Qualiopi"] },
  { type: "attestation", label: "Attestation de formation", icon: FileText, tags: ["Qualiopi"] },
  { type: "bulletin_inscription", label: "Bulletin d'inscription", icon: FileText, tags: ["Administratif"] },
  { type: "positionnement", label: "Test de positionnement", icon: GraduationCap, tags: ["Qualiopi"] },
  { type: "evaluation_chaud", label: "Évaluation à chaud", icon: GraduationCap, tags: ["Qualiopi"] },
  { type: "evaluation_froid", label: "Évaluation à froid (J+30)", icon: GraduationCap, tags: ["Qualiopi"] },
  { type: "emargement", label: "Feuille d'émargement", icon: FileCheck, tags: ["Qualiopi"] },
  { type: "invoice", label: "Facture standard", icon: CreditCard, tags: ["Financier"] },
  { type: "convocation", label: "Convocation session", icon: FileText, tags: ["Administratif"] },
  { type: "reglement_interieur", label: "Règlement intérieur", icon: Shield, tags: ["DREETS"] },
];

interface Props {
  onEdit: (id: string) => void;
  onCreate: (presetType?: string) => void;
  onGenerate: (templateId?: string) => void;
}

export default function TemplateLibraryV2({ onEdit, onCreate, onGenerate }: Props) {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const { data: templates, isLoading } = useTemplatesV2({
    type: filterType !== "all" ? filterType : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });
  const deleteTemplate = useDeleteTemplateV2();
  const createTemplate = useCreateTemplateV2();
  const { currentCentre } = useCentreContext();
  const hasActiveFilters = filterType !== "all" || filterStatus !== "all" || searchQuery.trim().length > 0;

  const filtered = useMemo(
    () =>
      (templates || []).filter((t) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q) || t.type.toLowerCase().includes(q);
      }),
    [searchQuery, templates],
  );

  const templateStats = useMemo(
    () => ({
      total: templates?.length || 0,
      active: (templates || []).filter((template) => template.is_active).length,
      published: (templates || []).filter((template) => template.status === "published").length,
      drafts: (templates || []).filter((template) => template.status === "draft").length,
    }),
    [templates],
  );

  const catalogStats = useMemo(
    () => ({
      total: PREBUILT_TEMPLATES.length,
      qualiopi: PREBUILT_TEMPLATES.filter((template) => template.tags.includes("Qualiopi")).length,
      dreets: PREBUILT_TEMPLATES.filter((template) => template.tags.includes("DREETS")).length,
      administratif: PREBUILT_TEMPLATES.filter((template) => template.tags.includes("Administratif")).length,
    }),
    [],
  );

  const handleResetFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setSearchQuery("");
  };

  const handleDelete = () => {
    if (deleteId) { deleteTemplate.mutate(deleteId); setDeleteId(null); }
  };

  const handleCreateFromCatalog = async (prebuilt: typeof PREBUILT_TEMPLATES[0]) => {
    const gen = TEMPLATE_GENERATORS[prebuilt.type];
    if (!gen) { onCreate(prebuilt.type); return; }
    if (!currentCentre?.id) { toast.error("Aucun centre sélectionné"); return; }

    try {
      const result = await createTemplate.mutateAsync({
        name: prebuilt.label,
        type: prebuilt.type,
        format: "html",
        template_body: gen.generator(),
        centre_id: currentCentre.id,
      } satisfies Partial<TemplateV2>);
      if (result) {
        toast.success(`Template "${prebuilt.label}" créé — personnalisez-le`);
        onEdit(result.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "inconnue";
      toast.error("Erreur : " + message);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold">
                {showCatalog ? "Catalogue prêt à l'emploi" : "Bibliothèque active des templates"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {showCatalog
                  ? "Partez de modèles prêts à personnaliser pour gagner du temps sans repartir d'une page vide."
                  : "Retrouvez rapidement les modèles publiés, actifs ou encore en brouillon avant génération."}
              </p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2 text-xs">
              <p className="font-medium">Résumé rapide</p>
              {showCatalog ? (
                <>
                  <p className="text-muted-foreground">{catalogStats.total} modèle{catalogStats.total > 1 ? "s" : ""} prêt{catalogStats.total > 1 ? "s" : ""} à créer</p>
                  <p className="mt-1 text-muted-foreground">{catalogStats.qualiopi} Qualiopi · {catalogStats.dreets} DREETS</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">{filtered.length} template{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</p>
                  <p className="mt-1 text-muted-foreground">{templateStats.published} publié{templateStats.published > 1 ? "s" : ""} · {templateStats.drafts} brouillon{templateStats.drafts > 1 ? "s" : ""}</p>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {showCatalog ? (
              <>
                <Badge variant="outline" className="text-[11px]">{catalogStats.total} entrées</Badge>
                <Badge variant="outline" className="text-[11px]">{catalogStats.administratif} administratives</Badge>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-[11px]">{templateStats.active} actifs</Badge>
                <Badge variant="outline" className="text-[11px]">{templateStats.published} publiés</Badge>
                {templateStats.drafts > 0 && (
                  <Badge variant="outline" className="text-[11px]">{templateStats.drafts} brouillon{templateStats.drafts > 1 ? "s" : ""}</Badge>
                )}
              </>
            )}
            {hasActiveFilters && !showCatalog && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="ml-auto gap-1">
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher un template..." className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {TEMPLATE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {TEMPLATE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setShowCatalog(!showCatalog)} className="gap-2 ml-auto">
          <Wand2 className="h-4 w-4" />
          {showCatalog ? "Mes templates" : "Catalogue"}
        </Button>
      </div>

      {showCatalog ? (
        <div className="space-y-6">
          <div className="text-center py-4">
            <h2 className="text-lg font-semibold text-foreground">Catalogue de Templates Prêts à l'emploi</h2>
            <p className="text-sm text-muted-foreground mt-1">Design professionnel, conformes Qualiopi & DREETS. Cliquez pour créer.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PREBUILT_TEMPLATES.map((pb) => {
              const Icon = pb.icon;
              return (
                <Card
                  key={pb.type}
                  className="hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-primary/20"
                  onClick={() => handleCreateFromCatalog(pb)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">{pb.label}</p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {pb.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className={cn(
                              "text-[10px]",
                              tag === "Qualiopi" && "border-blue-500/30 text-blue-600 bg-blue-500/5",
                              tag === "DREETS" && "border-amber-500/30 text-amber-600 bg-amber-500/5",
                              tag === "Administratif" && "border-muted text-muted-foreground",
                              tag === "Financier" && "border-green-500/30 text-green-600 bg-green-500/5",
                            )}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {filtered.length} template{filtered.length > 1 ? "s" : ""}{hasActiveFilters ? ` sur ${templateStats.total}` : ""}{searchQuery ? ` pour “${searchQuery}”` : ""}
          </p>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucun template trouvé</p>
                <p className="text-sm mb-4">Créez votre premier template ou explorez le catalogue</p>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => onCreate()} className="gap-2"><Plus className="h-4 w-4" />Nouveau</Button>
                  <Button variant="outline" onClick={() => setShowCatalog(true)} className="gap-2"><Wand2 className="h-4 w-4" />Catalogue</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((t) => {
                  const typeCfg = TEMPLATE_TYPES.find((tt) => tt.value === t.type);
                  const statusCfg = TEMPLATE_STATUSES.find((s) => s.value === t.status);
                  return (
                    <Card
                      key={t.id}
                      className={cn(
                        "hover:shadow-lg transition-all cursor-pointer group",
                        t.is_active && "border-green-500/30 shadow-green-500/5",
                      )}
                      onClick={() => onEdit(t.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground text-sm truncate">{t.name}</p>
                              {t.is_active && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description || "Pas de description"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-3">
                          <Badge variant="outline" className="text-[10px]">{typeCfg?.label || t.type}</Badge>
                          <Badge variant="outline" className={cn("text-[10px]", statusCfg?.color)}>{statusCfg?.label || t.status}</Badge>
                          <Badge variant="outline" className="text-[10px]">v{t.version}</Badge>
                          {t.compliance_score != null && (
                            <Badge variant="outline" className={cn("text-[10px] gap-1",
                              t.compliance_score >= 80 ? "text-green-600" :
                              t.compliance_score >= 50 ? "text-yellow-600" : "text-red-600"
                            )}>
                              <Shield className="h-3 w-3" />{t.compliance_score}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); onEdit(t.id); }}>
                            <Edit className="h-3 w-3" />Éditer
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); onGenerate(t.id); }}>
                            <Rocket className="h-3 w-3" />Générer
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
