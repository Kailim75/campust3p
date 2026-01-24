import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Box,
  Layers,
  Clock,
  Target,
  Eye,
  FileText,
} from "lucide-react";
import {
  useBimProjets,
  useDeleteBimProjet,
  BimProjet,
} from "@/hooks/useBimProjets";
import { useBimScenes, useDeleteBimScene, BimScene } from "@/hooks/useBimScenes";
import { BimProjetFormDialog } from "./BimProjetFormDialog";
import { BimSceneFormDialog } from "./BimSceneFormDialog";
import { BimQualiopiProofsDialog } from "./BimQualiopiProofsDialog";
import { cn } from "@/lib/utils";

const STATUT_COLORS: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  publie: "bg-success/20 text-success",
  archive: "bg-secondary text-secondary-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  taxi: "TAXI",
  vtc: "VTC",
  vmdtr: "Commun",
};

export function BimProjetsTab() {
  const { data: projets, isLoading } = useBimProjets();
  const { data: allScenes = [] } = useBimScenes();
  const deleteProjet = useDeleteBimProjet();
  const deleteScene = useDeleteBimScene();

  const [expandedProjets, setExpandedProjets] = useState<Set<string>>(new Set());

  // Dialogs
  const [showProjetDialog, setShowProjetDialog] = useState(false);
  const [editingProjet, setEditingProjet] = useState<BimProjet | null>(null);
  const [deletingProjet, setDeletingProjet] = useState<BimProjet | null>(null);

  const [showSceneDialog, setShowSceneDialog] = useState(false);
  const [sceneProjetId, setSceneProjetId] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<BimScene | null>(null);
  const [deletingScene, setDeletingScene] = useState<BimScene | null>(null);

  const [showProofsDialog, setShowProofsDialog] = useState(false);

  const toggleProjet = (projetId: string) => {
    setExpandedProjets((prev) => {
      const next = new Set(prev);
      if (next.has(projetId)) {
        next.delete(projetId);
      } else {
        next.add(projetId);
      }
      return next;
    });
  };

  const getScenesForProjet = (projetId: string) =>
    allScenes.filter((s) => s.projet_id === projetId);

  const handleAddProjet = () => {
    setEditingProjet(null);
    setShowProjetDialog(true);
  };

  const handleEditProjet = (projet: BimProjet) => {
    setEditingProjet(projet);
    setShowProjetDialog(true);
  };

  const handleDeleteProjet = async () => {
    if (deletingProjet) {
      await deleteProjet.mutateAsync(deletingProjet.id);
      setDeletingProjet(null);
    }
  };

  const handleAddScene = (projetId: string) => {
    setSceneProjetId(projetId);
    setEditingScene(null);
    setShowSceneDialog(true);
  };

  const handleEditScene = (scene: BimScene) => {
    setSceneProjetId(scene.projet_id);
    setEditingScene(scene);
    setShowSceneDialog(true);
  };

  const handleDeleteScene = async () => {
    if (deletingScene) {
      await deleteScene.mutateAsync(deletingScene.id);
      setDeletingScene(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Projets BIM pédagogiques</h2>
            <p className="text-sm text-muted-foreground">
              Gérez les scénarios 3D pour contextualiser les formations T3P
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowProofsDialog(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Preuves Qualiopi
          </Button>
          <Button onClick={handleAddProjet}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau projet
          </Button>
        </div>

        {!projets?.length ? (
          <EmptyState
            icon={Box}
            title="Aucun projet BIM"
            description="Créez votre premier projet BIM pédagogique"
          />
        ) : (
          <div className="space-y-3">
            {projets.map((projet) => {
              const isExpanded = expandedProjets.has(projet.id);
              const scenes = getScenesForProjet(projet.id);

              return (
                <Collapsible
                  key={projet.id}
                  open={isExpanded}
                  onOpenChange={() => toggleProjet(projet.id)}
                >
                  <Card className={cn(isExpanded && "border-primary/50")}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>

                          <Box className="h-6 w-6 text-primary" />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base truncate">
                                {projet.titre}
                              </CardTitle>
                              <Badge variant="outline" className="text-xs">
                                {projet.code}
                              </Badge>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  STATUT_COLORS[projet.statut]
                                )}
                              >
                                {projet.statut}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {TYPE_LABELS[projet.type_formation]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                {scenes.length} scène{scenes.length > 1 ? "s" : ""}
                              </span>
                              {projet.duree_estimee_min && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {projet.duree_estimee_min} min
                                </span>
                              )}
                              {projet.seuil_validation_pct && (
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  Seuil: {projet.seuil_validation_pct}%
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProjet(projet);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingProjet(projet);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="border-t pt-4 bg-muted/20">
                        {projet.description && (
                          <p className="text-sm text-muted-foreground mb-4">
                            {projet.description}
                          </p>
                        )}

                        {projet.competences_cibles?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {projet.competences_cibles.map((c) => (
                              <Badge key={c} variant="outline" className="text-xs">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Scènes 3D</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddScene(projet.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Ajouter
                            </Button>
                          </div>

                          {scenes.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                              Aucune scène dans ce projet
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {scenes.map((scene) => (
                                <div
                                  key={scene.id}
                                  className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors group"
                                >
                                  <span className="text-sm font-medium text-muted-foreground w-6">
                                    #{scene.ordre}
                                  </span>
                                  {scene.thumbnail_url ? (
                                    <img
                                      src={scene.thumbnail_url}
                                      alt={scene.titre}
                                      className="w-12 h-12 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                      <Eye className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {scene.titre}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      {scene.fichier_3d_format && (
                                        <Badge variant="secondary" className="text-xs">
                                          {scene.fichier_3d_format.toUpperCase()}
                                        </Badge>
                                      )}
                                      {scene.duree_estimee_min && (
                                        <span>{scene.duree_estimee_min} min</span>
                                      )}
                                      {!scene.actif && (
                                        <Badge variant="outline" className="text-xs">
                                          Inactive
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleEditScene(scene)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => setDeletingScene(scene)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <BimProjetFormDialog
        open={showProjetDialog}
        onOpenChange={setShowProjetDialog}
        projet={editingProjet}
      />

      {sceneProjetId && (
        <BimSceneFormDialog
          open={showSceneDialog}
          onOpenChange={setShowSceneDialog}
          projetId={sceneProjetId}
          scene={editingScene}
          nextOrdre={getScenesForProjet(sceneProjetId).length + 1}
        />
      )}

      <BimQualiopiProofsDialog
        open={showProofsDialog}
        onOpenChange={setShowProofsDialog}
      />

      {/* Delete confirmations */}
      <AlertDialog
        open={!!deletingProjet}
        onOpenChange={(open) => !open && setDeletingProjet(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce projet BIM ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les scènes et données de progression associées seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProjet}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingScene}
        onOpenChange={(open) => !open && setDeletingScene(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette scène ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScene}
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
