import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, TrendingUp, TrendingDown, Minus, AlertCircle, Clock, Loader2, MessageSquare, Plus } from "lucide-react";
import { useQualiteClient } from "@/hooks/useQualiteClient";
import { SatisfactionFormDialog, type SatisfactionFormData } from "./SatisfactionFormDialog";
import { ReclamationFormDialog, type ReclamationFormData } from "./ReclamationFormDialog";
import { ReclamationsListSection } from "./ReclamationsListSection";

export default function QualiteClientPage() {
  const { 
    stats, 
    reclamations,
    isLoading, 
    creerReponse, 
    creerReclamation, 
    updateReclamation,
    isCreatingReponse,
    isCreatingReclamation,
    isUpdatingReclamation,
  } = useQualiteClient();

  const [satisfactionDialogOpen, setSatisfactionDialogOpen] = useState(false);
  const [reclamationDialogOpen, setReclamationDialogOpen] = useState(false);

  const handleSubmitSatisfaction = (data: SatisfactionFormData) => {
    creerReponse(data);
    setSatisfactionDialogOpen(false);
  };

  const handleSubmitReclamation = (data: ReclamationFormData) => {
    creerReclamation(data);
    setReclamationDialogOpen(false);
  };

  const handleUpdateReclamationStatus = (id: string, statut: string, resolution?: string) => {
    updateReclamation({ id, statut, resolution });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Déterminer label NPS
  const getNPSInfo = (score: number) => {
    if (score >= 50) return { label: 'Excellent', color: 'text-green-600', icon: TrendingUp, variant: 'default' as const };
    if (score >= 0) return { label: 'Bon', color: 'text-blue-600', icon: Minus, variant: 'secondary' as const };
    return { label: 'À améliorer', color: 'text-red-600', icon: TrendingDown, variant: 'destructive' as const };
  };

  const npsInfo = getNPSInfo(stats.nps);
  const NPSIcon = npsInfo.icon;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Qualité Client</h1>
          </div>
          <p className="text-muted-foreground">
            Suivi de la satisfaction et gestion des réclamations
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setSatisfactionDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter satisfaction
          </Button>
          <Button variant="outline" onClick={() => setReclamationDialogOpen(true)}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Nouvelle réclamation
          </Button>
        </div>
      </div>

      <Tabs defaultValue="indicateurs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="indicateurs">Indicateurs</TabsTrigger>
          <TabsTrigger value="reclamations">
            Réclamations ({stats.reclamationsNouv + stats.reclamationsEnCours})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicateurs" className="space-y-6">
          {/* Indicateurs principaux */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Satisfaction globale
                </CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.noteGlobaleMoyenne}/10</div>
                <Progress value={stats.noteGlobaleMoyenne * 10} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.nombreReponses} réponses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  NPS Score
                </CardTitle>
                <NPSIcon className={`h-4 w-4 ${npsInfo.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.nps}</div>
                <Badge variant={npsInfo.variant} className="mt-2">{npsInfo.label}</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Réclamations actives
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats.reclamationsNouv + stats.reclamationsEnCours}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.reclamationsNouv} nouvelles, {stats.reclamationsEnCours} en cours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Délai moyen
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.delaiMoyen}j</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.reclamationsResolues} résolues / {stats.reclamationsTotal} total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Répartition satisfaction */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des avis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Positifs (8-10)</span>
                    </div>
                    <span className="text-sm font-medium">
                      {stats.repartition.positives} 
                      {stats.nombreReponses > 0 && 
                        ` (${Math.round((stats.repartition.positives / stats.nombreReponses) * 100)}%)`
                      }
                    </span>
                  </div>
                  <Progress 
                    value={stats.nombreReponses > 0 ? (stats.repartition.positives / stats.nombreReponses) * 100 : 0}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm">Neutres (6-7)</span>
                    </div>
                    <span className="text-sm font-medium">
                      {stats.repartition.neutres}
                      {stats.nombreReponses > 0 && 
                        ` (${Math.round((stats.repartition.neutres / stats.nombreReponses) * 100)}%)`
                      }
                    </span>
                  </div>
                  <Progress 
                    value={stats.nombreReponses > 0 ? (stats.repartition.neutres / stats.nombreReponses) * 100 : 0}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">Négatifs (1-5)</span>
                    </div>
                    <span className="text-sm font-medium">
                      {stats.repartition.negatives}
                      {stats.nombreReponses > 0 && 
                        ` (${Math.round((stats.repartition.negatives / stats.nombreReponses) * 100)}%)`
                      }
                    </span>
                  </div>
                  <Progress 
                    value={stats.nombreReponses > 0 ? (stats.repartition.negatives / stats.nombreReponses) * 100 : 0}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message si aucune donnée */}
          {stats.nombreReponses === 0 && stats.reclamationsTotal === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Aucune donnée pour le moment</h3>
                <p className="text-muted-foreground text-center mt-2 max-w-md">
                  Les indicateurs de qualité apparaîtront ici une fois que vos stagiaires auront répondu aux questionnaires de satisfaction.
                </p>

                {/* Mini guide 3 étapes */}
                <div className="mt-6 w-full max-w-md space-y-3">
                  <p className="text-sm font-medium text-center text-muted-foreground">Comment démarrer ?</p>
                  <div className="grid gap-2">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</span>
                      <div>
                        <p className="text-sm font-medium">Envoyez un questionnaire</p>
                        <p className="text-xs text-muted-foreground">Distribuez le lien d'enquête à vos stagiaires en fin de session</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</span>
                      <div>
                        <p className="text-sm font-medium">Collectez les réponses</p>
                        <p className="text-xs text-muted-foreground">Les résultats s'agrègent automatiquement ici</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</span>
                      <div>
                        <p className="text-sm font-medium">Analysez et améliorez</p>
                        <p className="text-xs text-muted-foreground">Identifiez les axes d'amélioration pour vos formations</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="mt-6" onClick={() => setSatisfactionDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une réponse manuellement
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reclamations">
          <ReclamationsListSection
            reclamations={reclamations || []}
            onUpdateStatus={handleUpdateReclamationStatus}
            isUpdating={isUpdatingReclamation}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SatisfactionFormDialog
        open={satisfactionDialogOpen}
        onOpenChange={setSatisfactionDialogOpen}
        onSubmit={handleSubmitSatisfaction}
        isSubmitting={isCreatingReponse}
      />

      <ReclamationFormDialog
        open={reclamationDialogOpen}
        onOpenChange={setReclamationDialogOpen}
        onSubmit={handleSubmitReclamation}
        isSubmitting={isCreatingReclamation}
      />
    </div>
  );
}