import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Edit, Trash2, CheckCircle2, Plus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useStudioTemplates,
  useDeleteTemplate,
} from "@/hooks/useTemplateStudio";
import { TEMPLATE_TYPES, TEMPLATE_STATUSES } from "@/constants/templateConstants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  onEdit: (id: string) => void;
  onCreate: () => void;
}

export default function TemplateListTab({ onEdit, onCreate }: Props) {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates, isLoading } = useStudioTemplates({
    type: filterType,
    status: filterStatus,
  });
  const deleteTemplate = useDeleteTemplate();

  const handleDelete = () => {
    if (deleteId) {
      deleteTemplate.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {TEMPLATE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {TEMPLATE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {templates?.length || 0} template(s)
        </span>
      </div>

      {!templates || templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucun template</p>
            <p className="text-sm mb-4">Créez votre premier template conforme</p>
            <Button onClick={onCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {templates.map((t) => {
              const typeCfg = TEMPLATE_TYPES.find((tt) => tt.value === t.type);
              const statusCfg = TEMPLATE_STATUSES.find((s) => s.value === t.status);
              return (
                <Card key={t.id} className={cn(
                  "hover:shadow-md transition-all cursor-pointer",
                  t.is_active && "border-green-500/30",
                )} onClick={() => onEdit(t.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground text-sm truncate">{t.name}</p>
                          {t.is_active && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.description || "Pas de description"}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {typeCfg?.label || t.type}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px]", statusCfg?.color)}>
                            {statusCfg?.label || t.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            v{t.version}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {t.format}
                          </Badge>
                          {(t as any).compliance_score != null && (
                            <Badge variant="outline" className={cn(
                              "text-[10px] gap-1",
                              (t as any).compliance_score >= 80 ? "text-green-600" :
                              (t as any).compliance_score >= 50 ? "text-yellow-600" : "text-red-600"
                            )}>
                              <Shield className="h-3 w-3" />
                              {(t as any).compliance_score}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(t.id); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les versions seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
