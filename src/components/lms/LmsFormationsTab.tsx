import { useState } from "react";
import { useLmsFormations, useDeleteLmsFormation, LmsFormation } from "@/hooks/useLmsFormations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MoreHorizontal, Edit, Trash2, BookOpen, Clock, Target } from "lucide-react";
import { LmsFormationFormDialog } from "./LmsFormationFormDialog";

export function LmsFormationsTab() {
  const { data: formations, isLoading } = useLmsFormations();
  const deleteFormation = useDeleteLmsFormation();

  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingFormation, setEditingFormation] = useState<LmsFormation | null>(null);
  const [deletingFormation, setDeletingFormation] = useState<LmsFormation | null>(null);

  const handleEdit = (formation: LmsFormation) => {
    setEditingFormation(formation);
    setShowFormDialog(true);
  };

  const handleDelete = async () => {
    if (deletingFormation) {
      await deleteFormation.mutateAsync(deletingFormation.id);
      setDeletingFormation(null);
    }
  };

  const handleCloseFormDialog = (open: boolean) => {
    setShowFormDialog(open);
    if (!open) setEditingFormation(null);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!formations?.length) {
    return (
      <>
        <EmptyState
          icon={BookOpen}
          title="Aucune formation"
          description="Créez votre première formation pour commencer"
        />
        <div className="flex justify-center mt-4">
          <Button onClick={() => setShowFormDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle formation
          </Button>
        </div>
        <LmsFormationFormDialog
          open={showFormDialog}
          onOpenChange={handleCloseFormDialog}
          formation={editingFormation}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          {formations.length} formation{formations.length > 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowFormDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle formation
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {formations.map((formation) => (
          <Card key={formation.id} className="group">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <Badge
                  variant={formation.actif ? "default" : "secondary"}
                  className="mb-2"
                >
                  {formation.type_formation}
                </Badge>
                <CardTitle className="text-lg">{formation.nom}</CardTitle>
                <p className="text-xs text-muted-foreground font-mono">
                  {formation.code}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(formation)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeletingFormation(formation)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>

            <CardContent>
              {formation.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {formation.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formation.duree_heures}h
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {formation.seuil_reussite_pct}%
                </div>
              </div>

              {!formation.actif && (
                <Badge variant="outline" className="mt-3">
                  Inactive
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <LmsFormationFormDialog
        open={showFormDialog}
        onOpenChange={handleCloseFormDialog}
        formation={editingFormation}
      />

      <AlertDialog
        open={!!deletingFormation}
        onOpenChange={(open) => !open && setDeletingFormation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette formation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les modules et leçons associés
              seront également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
