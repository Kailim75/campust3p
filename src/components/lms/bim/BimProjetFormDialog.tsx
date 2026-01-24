import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLmsModules } from "@/hooks/useLmsModules";
import { useLmsLessons } from "@/hooks/useLmsLessons";
import {
  BimProjet,
  BimProjetInsert,
  useCreateBimProjet,
  useUpdateBimProjet,
} from "@/hooks/useBimProjets";
import { X } from "lucide-react";

const FORMATION_TYPES = [
  { value: "taxi", label: "TAXI" },
  { value: "vtc", label: "VTC" },
  { value: "commun", label: "Commun (VMDTR)" },
];

const STATUT_OPTIONS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "publie", label: "Publié" },
  { value: "archive", label: "Archivé" },
];

const COMPETENCES_T3P = [
  "REGLEMENTATION",
  "SECURITE_ROUTIERE",
  "GESTION_COMMERCIALE",
  "FRANCAIS",
  "ANGLAIS",
  "SPECIFICITE_TAXI",
  "SPECIFICITE_VTC",
];

interface BimProjetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projet?: BimProjet | null;
}

export function BimProjetFormDialog({
  open,
  onOpenChange,
  projet,
}: BimProjetFormDialogProps) {
  const isEditing = !!projet;
  const createProjet = useCreateBimProjet();
  const updateProjet = useUpdateBimProjet();

  const { data: modules = [] } = useLmsModules();
  const { data: lessons = [] } = useLmsLessons();

  const [formData, setFormData] = useState<BimProjetInsert>({
    code: projet?.code || "",
    titre: projet?.titre || "",
    description: projet?.description || "",
    type_formation: projet?.type_formation || "commun",
    module_id: projet?.module_id || null,
    lesson_id: projet?.lesson_id || null,
    objectifs_pedagogiques: projet?.objectifs_pedagogiques || "",
    competences_cibles: projet?.competences_cibles || [],
    seuil_validation_pct: projet?.seuil_validation_pct || 70,
    duree_estimee_min: projet?.duree_estimee_min || 30,
    statut: projet?.statut || "brouillon",
  });

  const [newCompetence, setNewCompetence] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && projet) {
      await updateProjet.mutateAsync({ id: projet.id, ...formData });
    } else {
      await createProjet.mutateAsync(formData);
    }

    onOpenChange(false);
  };

  const handleAddCompetence = (competence: string) => {
    if (competence && !formData.competences_cibles?.includes(competence)) {
      setFormData({
        ...formData,
        competences_cibles: [...(formData.competences_cibles || []), competence],
      });
    }
    setNewCompetence("");
  };

  const handleRemoveCompetence = (competence: string) => {
    setFormData({
      ...formData,
      competences_cibles: formData.competences_cibles?.filter((c) => c !== competence) || [],
    });
  };

  // Filter lessons by selected module
  const filteredLessons = formData.module_id
    ? lessons.filter((l) => l.module_id === formData.module_id)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le projet BIM" : "Nouveau projet BIM pédagogique"}
          </DialogTitle>
          <DialogDescription>
            Créez un projet BIM pour contextualiser les apprentissages T3P
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code projet *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="BIM-TAXI-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type_formation">Type formation *</Label>
              <Select
                value={formData.type_formation}
                onValueChange={(v) =>
                  setFormData({ ...formData, type_formation: v as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              placeholder="Station de taxi - Gare de Lyon"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contexte pédagogique du projet BIM..."
              rows={3}
            />
          </div>

          {/* LMS Link */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lier au module (optionnel)</Label>
              <Select
                value={formData.module_id || "none"}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    module_id: v === "none" ? null : v,
                    lesson_id: null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun module</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lier à la leçon (optionnel)</Label>
              <Select
                value={formData.lesson_id || "none"}
                onValueChange={(v) =>
                  setFormData({ ...formData, lesson_id: v === "none" ? null : v })
                }
                disabled={!formData.module_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune leçon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune leçon</SelectItem>
                  {filteredLessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pedagogical settings */}
          <div className="space-y-2">
            <Label htmlFor="objectifs">Objectifs pédagogiques</Label>
            <Textarea
              id="objectifs"
              value={formData.objectifs_pedagogiques || ""}
              onChange={(e) =>
                setFormData({ ...formData, objectifs_pedagogiques: e.target.value })
              }
              placeholder="À l'issue de ce projet, l'apprenant sera capable de..."
              rows={3}
            />
          </div>

          {/* Competences */}
          <div className="space-y-2">
            <Label>Compétences T3P cibles</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.competences_cibles?.map((c) => (
                <Badge key={c} variant="secondary" className="gap-1">
                  {c}
                  <button
                    type="button"
                    onClick={() => handleRemoveCompetence(c)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Select value={newCompetence} onValueChange={handleAddCompetence}>
              <SelectTrigger>
                <SelectValue placeholder="Ajouter une compétence..." />
              </SelectTrigger>
              <SelectContent>
                {COMPETENCES_T3P.filter(
                  (c) => !formData.competences_cibles?.includes(c)
                ).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seuil">Seuil validation (%)</Label>
              <Input
                id="seuil"
                type="number"
                min={0}
                max={100}
                value={formData.seuil_validation_pct || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    seuil_validation_pct: parseInt(e.target.value) || null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duree">Durée estimée (min)</Label>
              <Input
                id="duree"
                type="number"
                min={0}
                value={formData.duree_estimee_min || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duree_estimee_min: parseInt(e.target.value) || null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(v) => setFormData({ ...formData, statut: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUT_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createProjet.isPending || updateProjet.isPending}
            >
              {isEditing ? "Enregistrer" : "Créer le projet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
