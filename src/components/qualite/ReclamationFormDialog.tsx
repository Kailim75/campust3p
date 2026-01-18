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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContacts } from "@/hooks/useContacts";
import { useSessions } from "@/hooks/useSessions";
import { Loader2, AlertCircle } from "lucide-react";

interface ReclamationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReclamationFormData) => void;
  isSubmitting?: boolean;
}

export interface ReclamationFormData {
  contact_id: string;
  session_id?: string;
  titre: string;
  description: string;
  categorie?: string;
  priorite?: string;
}

const categories = [
  { value: "formation", label: "Contenu de la formation" },
  { value: "formateur", label: "Formateur" },
  { value: "organisation", label: "Organisation / Logistique" },
  { value: "administratif", label: "Administratif / Facturation" },
  { value: "locaux", label: "Locaux / Équipements" },
  { value: "autre", label: "Autre" },
];

const priorites = [
  { value: "basse", label: "Basse", color: "text-muted-foreground" },
  { value: "normale", label: "Normale", color: "text-info" },
  { value: "haute", label: "Haute", color: "text-warning" },
  { value: "urgente", label: "Urgente", color: "text-destructive" },
];

export function ReclamationFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: ReclamationFormDialogProps) {
  const { data: contacts = [] } = useContacts();
  const { data: sessions = [] } = useSessions();

  const [formData, setFormData] = useState<ReclamationFormData>({
    contact_id: "",
    titre: "",
    description: "",
    categorie: "autre",
    priorite: "normale",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ReclamationFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ReclamationFormData, string>> = {};

    if (!formData.contact_id) {
      newErrors.contact_id = "Le stagiaire est obligatoire";
    }
    if (!formData.titre.trim()) {
      newErrors.titre = "L'objet est obligatoire";
    }
    if (!formData.description.trim()) {
      newErrors.description = "La description est obligatoire";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit(formData);
    setFormData({
      contact_id: "",
      titre: "",
      description: "",
      categorie: "autre",
      priorite: "normale",
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Nouvelle réclamation
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>
              Stagiaire <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.contact_id}
              onValueChange={(v) => {
                setFormData({ ...formData, contact_id: v });
                setErrors({ ...errors, contact_id: undefined });
              }}
            >
              <SelectTrigger className={errors.contact_id ? "border-destructive" : ""}>
                <SelectValue placeholder="Sélectionner le stagiaire..." />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.contact_id && (
              <p className="text-xs text-destructive">{errors.contact_id}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Session concernée (optionnel)</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={formData.categorie || "autre"}
                onValueChange={(v) => setFormData({ ...formData, categorie: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                value={formData.priorite || "normale"}
                onValueChange={(v) => setFormData({ ...formData, priorite: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorites.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={p.color}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Objet <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.titre}
              onChange={(e) => {
                setFormData({ ...formData, titre: e.target.value });
                setErrors({ ...errors, titre: undefined });
              }}
              placeholder="Résumé court de la réclamation"
              className={errors.titre ? "border-destructive" : ""}
            />
            {errors.titre && (
              <p className="text-xs text-destructive">{errors.titre}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                setErrors({ ...errors, description: undefined });
              }}
              placeholder="Décrivez la réclamation en détail..."
              rows={4}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer la réclamation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}