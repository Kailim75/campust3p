import { useState } from "react";
import { useLmsFormations } from "@/hooks/useLmsFormations";
import { useLmsModules, useDeleteLmsModule, LmsModule } from "@/hooks/useLmsModules";
import { useLmsLessons, useDeleteLmsLesson, LmsLesson } from "@/hooks/useLmsLessons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Layers,
  FileText,
  Clock,
} from "lucide-react";
import { LmsModuleFormDialog } from "./LmsModuleFormDialog";
import { LmsLessonFormDialog } from "./LmsLessonFormDialog";
import { cn } from "@/lib/utils";

export function LmsContentTab() {
  const { data: formations, isLoading: loadingFormations } = useLmsFormations();
  const [selectedFormationId, setSelectedFormationId] = useState<string | null>(null);

  const { data: modules, isLoading: loadingModules } = useLmsModules(selectedFormationId);
  const { data: lessons } = useLmsLessons();
  const deleteModule = useDeleteLmsModule();
  const deleteLesson = useDeleteLmsLesson();

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Module dialogs
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<LmsModule | null>(null);
  const [deletingModule, setDeletingModule] = useState<LmsModule | null>(null);

  // Lesson dialogs
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LmsLesson | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<LmsLesson | null>(null);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleAddModule = () => {
    setEditingModule(null);
    setShowModuleDialog(true);
  };

  const handleEditModule = (module: LmsModule) => {
    setEditingModule(module);
    setShowModuleDialog(true);
  };

  const handleDeleteModule = async () => {
    if (deletingModule) {
      await deleteModule.mutateAsync(deletingModule.id);
      setDeletingModule(null);
    }
  };

  const handleAddLesson = (moduleId: string) => {
    setLessonModuleId(moduleId);
    setEditingLesson(null);
    setShowLessonDialog(true);
  };

  const handleEditLesson = (lesson: LmsLesson) => {
    setLessonModuleId(lesson.module_id);
    setEditingLesson(lesson);
    setShowLessonDialog(true);
  };

  const handleDeleteLesson = async () => {
    if (deletingLesson) {
      await deleteLesson.mutateAsync(deletingLesson.id);
      setDeletingLesson(null);
    }
  };

  const getLessonsForModule = (moduleId: string) => {
    return lessons?.filter((l) => l.module_id === moduleId) || [];
  };

  if (loadingFormations) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!formations?.length) {
    return (
      <EmptyState
        icon={Layers}
        title="Aucune formation disponible"
        description="Créez d'abord une formation dans l'onglet Formations"
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Formation selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sélectionner une formation</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedFormationId || ""}
              onValueChange={(v) => setSelectedFormationId(v || null)}
            >
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Choisir une formation..." />
              </SelectTrigger>
              <SelectContent>
                {formations.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="font-medium">{f.nom}</span>
                    <span className="text-muted-foreground ml-2">({f.code})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Modules & Lessons tree */}
        {selectedFormationId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Modules & Leçons</CardTitle>
              <Button onClick={handleAddModule} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un module
              </Button>
            </CardHeader>
            <CardContent>
              {loadingModules ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !modules?.length ? (
                <EmptyState
                  icon={Layers}
                  title="Aucun module"
                  description="Ajoutez des modules pour structurer votre formation"
                />
              ) : (
                <div className="space-y-2">
                  {modules.map((module) => {
                    const isExpanded = expandedModules.has(module.id);
                    const moduleLessons = getLessonsForModule(module.id);

                    return (
                      <Collapsible
                        key={module.id}
                        open={isExpanded}
                        onOpenChange={() => toggleModule(module.id)}
                      >
                        <div
                          className={cn(
                            "border rounded-lg",
                            isExpanded && "border-primary/50"
                          )}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                              <div className="text-muted-foreground">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>

                              <Layers className="h-5 w-5 text-primary" />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">
                                    {module.titre}
                                  </span>
                                  {module.obligatoire && (
                                    <Badge variant="outline" className="text-xs">
                                      Obligatoire
                                    </Badge>
                                  )}
                                  {!module.actif && (
                                    <Badge variant="secondary" className="text-xs">
                                      Inactif
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  <span>{moduleLessons.length} leçon(s)</span>
                                  {module.duree_estimee_min > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {module.duree_estimee_min} min
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
                                    handleEditModule(module);
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
                                    setDeletingModule(module);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t px-3 py-2 bg-muted/30">
                              {moduleLessons.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2 pl-8">
                                  Aucune leçon dans ce module
                                </p>
                              ) : (
                                <div className="space-y-1">
                                  {moduleLessons.map((lesson) => (
                                    <div
                                      key={lesson.id}
                                      className="flex items-center gap-3 p-2 pl-8 hover:bg-muted rounded-md transition-colors group"
                                    >
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm truncate block">
                                          {lesson.titre}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {lesson.niveau} • {lesson.duree_estimee_min} min
                                        </span>
                                      </div>
                                      {!lesson.actif && (
                                        <Badge variant="secondary" className="text-xs">
                                          Inactive
                                        </Badge>
                                      )}
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleEditLesson(lesson)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-destructive"
                                          onClick={() => setDeletingLesson(lesson)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 ml-6"
                                onClick={() => handleAddLesson(module.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Ajouter une leçon
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      {selectedFormationId && (
        <LmsModuleFormDialog
          open={showModuleDialog}
          onOpenChange={setShowModuleDialog}
          formationId={selectedFormationId}
          module={editingModule}
        />
      )}

      {lessonModuleId && (
        <LmsLessonFormDialog
          open={showLessonDialog}
          onOpenChange={setShowLessonDialog}
          moduleId={lessonModuleId}
          lesson={editingLesson}
        />
      )}

      {/* Delete confirmations */}
      <AlertDialog
        open={!!deletingModule}
        onOpenChange={(open) => !open && setDeletingModule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce module ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les leçons de ce module seront également supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingLesson}
        onOpenChange={(open) => !open && setDeletingLesson(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette leçon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLesson}
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
