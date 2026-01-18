import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContacts } from "@/hooks/useContacts";
import { useSessions } from "@/hooks/useSessions";
import { Loader2, Star, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

interface SatisfactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SatisfactionFormData) => void;
  isSubmitting?: boolean;
}

export interface SatisfactionFormData {
  contact_id?: string;
  session_id?: string;
  type_questionnaire?: string;
  note_globale?: number;
  note_formateur?: number;
  note_supports?: number;
  note_locaux?: number;
  nps_score?: number;
  objectifs_atteints?: string;
  commentaire?: string;
}

export function SatisfactionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: SatisfactionFormDialogProps) {
  const { data: contacts = [] } = useContacts();
  const { data: sessions = [] } = useSessions();

  const [formData, setFormData] = useState<SatisfactionFormData>({
    note_globale: 8,
    note_formateur: 8,
    note_supports: 8,
    note_locaux: 8,
    nps_score: 8,
    objectifs_atteints: "oui",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      note_globale: 8,
      note_formateur: 8,
      note_supports: 8,
      note_locaux: 8,
      nps_score: 8,
      objectifs_atteints: "oui",
    });
  };

  const getNPSLabel = (score: number) => {
    if (score >= 9) return { label: "Promoteur", icon: ThumbsUp, color: "text-green-600" };
    if (score >= 7) return { label: "Passif", icon: Minus, color: "text-yellow-600" };
    return { label: "Détracteur", icon: ThumbsDown, color: "text-red-600" };
  };

  const npsInfo = getNPSLabel(formData.nps_score || 0);
  const NPSIcon = npsInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Nouvelle réponse satisfaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stagiaire (optionnel)</Label>
              <Select
                value={formData.contact_id || ""}
                onValueChange={(v) => setFormData({ ...formData, contact_id: v || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.prenom} {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Session (optionnel)</Label>
              <Select
                value={formData.session_id || ""}
                onValueChange={(v) => setFormData({ ...formData, session_id: v || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type de questionnaire</Label>
            <Select
              value={formData.type_questionnaire || "fin_formation"}
              onValueChange={(v) => setFormData({ ...formData, type_questionnaire: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fin_formation">Fin de formation</SelectItem>
                <SelectItem value="a_chaud">À chaud</SelectItem>
                <SelectItem value="a_froid">À froid (3 mois)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm">Notes (1-10)</h4>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Note globale</Label>
                <span className="font-bold">{formData.note_globale}/10</span>
              </div>
              <Slider
                value={[formData.note_globale || 5]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => setFormData({ ...formData, note_globale: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Formateur</Label>
                <span className="font-bold">{formData.note_formateur}/10</span>
              </div>
              <Slider
                value={[formData.note_formateur || 5]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => setFormData({ ...formData, note_formateur: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Supports pédagogiques</Label>
                <span className="font-bold">{formData.note_supports}/10</span>
              </div>
              <Slider
                value={[formData.note_supports || 5]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => setFormData({ ...formData, note_supports: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Locaux</Label>
                <span className="font-bold">{formData.note_locaux}/10</span>
              </div>
              <Slider
                value={[formData.note_locaux || 5]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => setFormData({ ...formData, note_locaux: v })}
              />
            </div>
          </div>

          <div className="space-y-2 p-4 bg-primary/5 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <Label>Score NPS (0-10)</Label>
              <div className={`flex items-center gap-1 ${npsInfo.color}`}>
                <NPSIcon className="h-4 w-4" />
                <span className="font-bold">{formData.nps_score} - {npsInfo.label}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              "Recommanderiez-vous cette formation à un ami ?"
            </p>
            <Slider
              value={[formData.nps_score || 5]}
              min={0}
              max={10}
              step={1}
              onValueChange={([v]) => setFormData({ ...formData, nps_score: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>Objectifs atteints ?</Label>
            <Select
              value={formData.objectifs_atteints || "oui"}
              onValueChange={(v) => setFormData({ ...formData, objectifs_atteints: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oui">Oui, totalement</SelectItem>
                <SelectItem value="partiellement">Partiellement</SelectItem>
                <SelectItem value="non">Non</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Commentaires (optionnel)</Label>
            <Textarea
              value={formData.commentaire || ""}
              onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
              placeholder="Points forts, points d'amélioration..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}