import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Box,
  Play,
  CheckCircle2,
  Clock,
  Target,
  Layers,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { BimViewer } from "@/components/lms/bim/BimViewer";
import { BimScene } from "@/hooks/useBimScenes";
import { BimProjet } from "@/hooks/useBimProjets";
import { BimProgression } from "@/hooks/useBimProgressions";
import {
  useLearnerBimProjets,
  useStartBimInteraction,
  useCompleteBimScene,
} from "@/hooks/useLearnerBim";
import { toast } from "sonner";

interface LearnerBimSectionProps {
  contactId: string;
}

interface BimProjetWithScenes extends BimProjet {
  scenes: BimScene[];
  progression?: BimProgression;
}

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  non_commence: { label: "Non commencé", color: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", color: "bg-warning/20 text-warning" },
  valide: { label: "Validé", color: "bg-success/20 text-success" },
  a_reprendre: { label: "À reprendre", color: "bg-destructive/20 text-destructive" },
};

export function LearnerBimSection({ contactId }: LearnerBimSectionProps) {
  const { data: projets, isLoading, refetch } = useLearnerBimProjets(contactId);
  const startInteraction = useStartBimInteraction();
  const completeScene = useCompleteBimScene();

  const [selectedProjet, setSelectedProjet] = useState<BimProjetWithScenes | null>(null);
  const [selectedScene, setSelectedScene] = useState<BimScene | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleStartScene = async (projet: BimProjetWithScenes, scene: BimScene) => {
    try {
      const id = await startInteraction(contactId, projet.id, scene.id);
      setInteractionId(id);
      setSelectedProjet(projet);
      setSelectedScene(scene);
      setShowViewer(true);
      startTimeRef.current = Date.now();
    } catch (error) {
      toast.error("Erreur lors du démarrage de la scène");
    }
  };

  const handleSceneComplete = async (scorePct: number, answers: Record<string, number>) => {
    if (!selectedProjet || !selectedScene || !interactionId) return;

    const tempsPasse = Math.round((Date.now() - startTimeRef.current) / 1000);
    const seuil = selectedProjet.seuil_validation_pct || 70;

    try {
      await completeScene(
        interactionId,
        contactId,
        selectedProjet.id,
        selectedScene.id,
        scorePct,
        seuil,
        answers,
        tempsPasse
      );

      toast.success(
        scorePct >= seuil
          ? `Scène validée ! Score: ${scorePct}%`
          : `Score: ${scorePct}% - Seuil requis: ${seuil}%`
      );

      refetch();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedScene(null);
    setSelectedProjet(null);
    setInteractionId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!projets?.length) {
    return (
      <EmptyState
        icon={Box}
        title="Aucun projet BIM disponible"
        description="Votre centre de formation n'a pas encore ajouté de projets BIM."
      />
    );
  }

  // Calculate global BIM progress
  const totalScenes = projets.reduce((acc, p) => acc + p.scenes.length, 0);
  const completedScenes = projets.reduce(
    (acc, p) => acc + (p.progression?.scenes_completees || 0),
    0
  );
  const globalProgress = totalScenes > 0 ? Math.round((completedScenes / totalScenes) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* BIM Progress Overview */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Box className="h-5 w-5 text-primary" />
            Projets BIM 3D
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {completedScenes} / {totalScenes} scènes complétées
            </span>
            <span className="text-xl font-bold text-primary">{globalProgress}%</span>
          </div>
          <Progress value={globalProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Projects list */}
      <div className="grid gap-4 md:grid-cols-2">
        {projets.map((projet) => {
          const statut = projet.progression?.statut || "non_commence";
          const statutInfo = STATUT_LABELS[statut];
          const progressPct = projet.progression?.progression_pct || 0;

          return (
            <Card key={projet.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Box className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{projet.titre}</CardTitle>
                  </div>
                  <Badge className={statutInfo.color}>{statutInfo.label}</Badge>
                </div>
                {projet.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {projet.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project info */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    {projet.scenes.length} scène{projet.scenes.length > 1 ? "s" : ""}
                  </span>
                  {projet.duree_estimee_min && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {projet.duree_estimee_min} min
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    Seuil: {projet.seuil_validation_pct || 70}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="font-medium">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>

                {/* Scenes list */}
                <div className="space-y-2">
                  {projet.scenes.map((scene, idx) => (
                    <div
                      key={scene.id}
                      className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs font-medium text-muted-foreground w-5">
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{scene.titre}</p>
                        {scene.duree_estimee_min && (
                          <p className="text-xs text-muted-foreground">
                            ~{scene.duree_estimee_min} min
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => handleStartScene(projet, scene)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Ouvrir
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* BIM Viewer Dialog */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              {selectedScene?.titre}
            </DialogTitle>
            <DialogDescription>
              {selectedProjet?.titre} - Seuil de validation: {selectedProjet?.seuil_validation_pct || 70}%
            </DialogDescription>
          </DialogHeader>
          {selectedScene && (
            <BimViewer
              scene={selectedScene}
              onComplete={handleSceneComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
