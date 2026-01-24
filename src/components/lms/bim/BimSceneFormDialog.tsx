import { useState } from "react";
import { Json } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BimScene,
  BimSceneInsert,
  QuestionContextuelle,
  useCreateBimScene,
  useUpdateBimScene,
} from "@/hooks/useBimScenes";
import { Badge } from "@/components/ui/badge";
import { Plus, X, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const THEMES_T3P = [
  "REGLEMENTATION",
  "SECURITE_ROUTIERE",
  "GESTION_COMMERCIALE",
  "FRANCAIS",
  "ANGLAIS",
  "SPECIFICITE_TAXI",
  "SPECIFICITE_VTC",
];

interface BimSceneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projetId: string;
  scene?: BimScene | null;
  nextOrdre?: number;
}

export function BimSceneFormDialog({
  open,
  onOpenChange,
  projetId,
  scene,
  nextOrdre = 1,
}: BimSceneFormDialogProps) {
  const isEditing = !!scene;
  const createScene = useCreateBimScene();
  const updateScene = useUpdateBimScene();

  const [formData, setFormData] = useState<BimSceneInsert>({
    projet_id: projetId,
    titre: scene?.titre || "",
    description: scene?.description || "",
    ordre: scene?.ordre || nextOrdre,
    fichier_3d_url: scene?.fichier_3d_url || "",
    fichier_3d_format: scene?.fichier_3d_format || "gltf",
    thumbnail_url: scene?.thumbnail_url || "",
    consignes: scene?.consignes || "",
    duree_estimee_min: scene?.duree_estimee_min || 10,
    actif: scene?.actif ?? true,
    questions_contextuelles: scene?.questions_contextuelles || null,
  });

  const questions = Array.isArray(formData.questions_contextuelles)
    ? (formData.questions_contextuelles as unknown as QuestionContextuelle[])
    : [];

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<QuestionContextuelle>>({
    question: "",
    options: ["", "", "", ""],
    reponse_correcte: 0,
    explication: "",
    points: 1,
    theme_t3p: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && scene) {
      await updateScene.mutateAsync({ id: scene.id, ...formData });
    } else {
      await createScene.mutateAsync(formData);
    }

    onOpenChange(false);
  };

  const handleAddQuestion = () => {
    if (!newQuestion.question) return;

    const question: QuestionContextuelle = {
      id: crypto.randomUUID(),
      question: newQuestion.question || "",
      options: newQuestion.options?.filter((o) => o.trim()) || [],
      reponse_correcte: newQuestion.reponse_correcte || 0,
      explication: newQuestion.explication,
      points: newQuestion.points || 1,
      theme_t3p: newQuestion.theme_t3p,
    };

    setFormData({
      ...formData,
      questions_contextuelles: [...questions, question] as unknown as Json,
    });

    setNewQuestion({
      question: "",
      options: ["", "", "", ""],
      reponse_correcte: 0,
      explication: "",
      points: 1,
      theme_t3p: "",
    });
    setShowQuestionForm(false);
  };

  const handleRemoveQuestion = (id: string) => {
    setFormData({
      ...formData,
      questions_contextuelles: questions.filter((q) => q.id !== id) as unknown as Json,
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(newQuestion.options || [])];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la scène BIM" : "Nouvelle scène BIM"}
          </DialogTitle>
          <DialogDescription>
            Configurez une scène 3D avec ses questions contextuelles
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titre">Titre de la scène *</Label>
              <Input
                id="titre"
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                placeholder="Vue extérieure - Entrée gare"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ordre">Ordre</Label>
              <Input
                id="ordre"
                type="number"
                min={1}
                value={formData.ordre}
                onChange={(e) =>
                  setFormData({ ...formData, ordre: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contexte de la scène..."
              rows={2}
            />
          </div>

          {/* 3D File */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="fichier_3d_url">URL du fichier 3D</Label>
              <Input
                id="fichier_3d_url"
                value={formData.fichier_3d_url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, fichier_3d_url: e.target.value })
                }
                placeholder="https://storage.../scene.gltf"
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={formData.fichier_3d_format || "gltf"}
                onValueChange={(v) => setFormData({ ...formData, fichier_3d_format: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gltf">glTF / GLB</SelectItem>
                  <SelectItem value="ifc">IFC</SelectItem>
                  <SelectItem value="obj">OBJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">URL miniature (optionnel)</Label>
            <Input
              id="thumbnail"
              value={formData.thumbnail_url || ""}
              onChange={(e) =>
                setFormData({ ...formData, thumbnail_url: e.target.value })
              }
              placeholder="https://storage.../thumbnail.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consignes">Consignes pour l'apprenant</Label>
            <Textarea
              id="consignes"
              value={formData.consignes || ""}
              onChange={(e) => setFormData({ ...formData, consignes: e.target.value })}
              placeholder="Explorez la scène et identifiez les éléments clés..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duree">Durée estimée (min)</Label>
              <Input
                id="duree"
                type="number"
                min={1}
                value={formData.duree_estimee_min || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duree_estimee_min: parseInt(e.target.value) || null,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="actif"
                checked={formData.actif}
                onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
              />
              <Label htmlFor="actif">Scène active</Label>
            </div>
          </div>

          {/* Contextual Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Questions contextuelles ({questions.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQuestionForm(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>

            {questions.length > 0 && (
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <Card key={q.id} className="bg-muted/30">
                    <CardContent className="py-3 flex items-start gap-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Q{idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{q.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {q.theme_t3p && (
                            <Badge variant="outline" className="text-xs">
                              {q.theme_t3p}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {q.points} pt{(q.points || 1) > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleRemoveQuestion(q.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {showQuestionForm && (
              <Card className="border-primary/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Nouvelle question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question *</Label>
                    <Input
                      value={newQuestion.question}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, question: e.target.value })
                      }
                      placeholder="Quelle signalétique identifie la station taxi ?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Options de réponse</Label>
                    {newQuestion.options?.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct"
                          checked={newQuestion.reponse_correcte === idx}
                          onChange={() =>
                            setNewQuestion({ ...newQuestion, reponse_correcte: idx })
                          }
                        />
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez la réponse correcte
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Thème T3P</Label>
                      <Select
                        value={newQuestion.theme_t3p || ""}
                        onValueChange={(v) =>
                          setNewQuestion({ ...newQuestion, theme_t3p: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {THEMES_T3P.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newQuestion.points || 1}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            points: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Explication (feedback)</Label>
                    <Textarea
                      value={newQuestion.explication || ""}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, explication: e.target.value })
                      }
                      placeholder="Explication affichée après la réponse..."
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQuestionForm(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="button" size="sm" onClick={handleAddQuestion}>
                      Ajouter la question
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createScene.isPending || updateScene.isPending}
            >
              {isEditing ? "Enregistrer" : "Créer la scène"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
