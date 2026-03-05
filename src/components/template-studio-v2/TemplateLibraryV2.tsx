import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, FileText, Edit, Trash2, Search, Archive, Copy,
  CheckCircle2, Send, History, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTemplatesV2, useDeleteTemplateV2, useArchiveTemplateV2, useCreateTemplateV2,
  TEMPLATE_CATEGORIES, TRACK_SCOPES,
  type TemplateV2, type TrackScope, type TemplateCategory,
} from "@/hooks/useTemplateStudioV2";
import { TEMPLATE_TYPES, TEMPLATE_STATUSES } from "@/hooks/useTemplateStudio";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Props {
  onEdit: (id: string) => void;
  onCreate: () => void;
}

export function TemplateLibraryV2({ onEdit, onCreate }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates, isLoading } = useTemplatesV2({
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });
  const deleteTemplate = useDeleteTemplateV2();
  const archiveTemplate = useArchiveTemplateV2();
  const duplicateTemplate = useCreateTemplateV2();

  const filtered = (templates || []).filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (trackFilter !== "all" && t.track_scope !== trackFilter && t.track_scope !== "both") return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const cfg = TEMPLATE_STATUSES.find((s) => s.value === status);
    return <Badge variant="outline" className={cn("text-xs", cfg?.color)}>{cfg?.label || status}</Badge>;
  };

  const getTrackLabel = (scope: TrackScope) => {
    const t = TRACK_SCOPES.find((s) => s.value === scope);
    return t?.label || scope;
  };

  const handleDuplicate = async (tmpl: TemplateV2) => {
    await duplicateTemplate.mutateAsync({
      name: `${tmpl.name} (copie)`,
      type: tmpl.type as any,
      format: tmpl.format as any,
      template_body: tmpl.template_body,
      description: tmpl.description,
      track_scope: tmpl.track_scope,
      category: tmpl.category,
      applies_to: tmpl.applies_to,
      variables_schema: tmpl.variables_schema,
    });
    toast.success("Template dupliqué");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {TEMPLATE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {TEMPLATE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={trackFilter} onValueChange={setTrackFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Parcours" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous parcours</SelectItem>
            {TRACK_SCOPES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} template{filtered.length !== 1 ? "s" : ""}</span>
        <span>•</span>
        <span>{filtered.filter((t) => t.status === "published").length} publiés</span>
        <span>•</span>
        <span>{filtered.filter((t) => t.status === "draft").length} brouillons</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-muted-foreground">Aucun template trouvé</p>
            <Button onClick={onCreate} className="mt-4 gap-2">
              Créer un template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tmpl) => (
            <Card key={tmpl.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => onEdit(tmpl.id)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{tmpl.name}</h3>
                    {tmpl.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onEdit(tmpl.id)}>
                        <Edit className="h-4 w-4 mr-2" />Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(tmpl)}>
                        <Copy className="h-4 w-4 mr-2" />Dupliquer
                      </DropdownMenuItem>
                      {tmpl.status !== "archived" && (
                        <DropdownMenuItem onClick={() => archiveTemplate.mutate(tmpl.id)}>
                          <Archive className="h-4 w-4 mr-2" />Archiver
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(tmpl.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getStatusBadge(tmpl.status)}
                  <Badge variant="secondary" className="text-xs">
                    {TEMPLATE_TYPES.find((t) => t.value === tmpl.type)?.label || tmpl.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getTrackLabel(tmpl.track_scope)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>v{tmpl.version}</span>
                  <span>{new Date(tmpl.updated_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { if (deleteId) deleteTemplate.mutate(deleteId); setDeleteId(null); }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
