import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  Formateur, 
  useCreateFormateur, 
  useUpdateFormateur 
} from "@/hooks/useFormateurs";

interface FormateurFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formateur?: Formateur | null;
}

const SPECIALITES_OPTIONS = [
  "TAXI",
  "VTC",
  "VMDTR",
  "ACC VTC",
  "ACC VTC 75",
  "Formation continue Taxi",
  "Formation continue VTC",
  "Mobilité Taxi",
];

export function FormateurFormDialog({ open, onOpenChange, formateur }: FormateurFormDialogProps) {
  const isEditing = !!formateur;
  const createFormateur = useCreateFormateur();
  const updateFormateur = useUpdateFormateur();

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    adresse: "",
    ville: "",
    code_postal: "",
    specialites: [] as string[],
    diplomes: [] as string[],
    numero_agrement: "",
    date_agrement: "",
    siret: "",
    taux_horaire: 0,
    rib: "",
    actif: true,
    notes: "",
  });

  const [newDiplome, setNewDiplome] = useState("");

  useEffect(() => {
    if (formateur) {
      setForm({
        nom: formateur.nom || "",
        prenom: formateur.prenom || "",
        email: formateur.email || "",
        telephone: formateur.telephone || "",
        adresse: formateur.adresse || "",
        ville: formateur.ville || "",
        code_postal: formateur.code_postal || "",
        specialites: formateur.specialites || [],
        diplomes: formateur.diplomes || [],
        numero_agrement: formateur.numero_agrement || "",
        date_agrement: formateur.date_agrement || "",
        siret: formateur.siret || "",
        taux_horaire: Number(formateur.taux_horaire) || 0,
        rib: formateur.rib || "",
        actif: formateur.actif ?? true,
        notes: formateur.notes || "",
      });
    } else {
      setForm({
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        adresse: "",
        ville: "",
        code_postal: "",
        specialites: [],
        diplomes: [],
        numero_agrement: "",
        date_agrement: "",
        siret: "",
        taux_horaire: 0,
        rib: "",
        actif: true,
        notes: "",
      });
    }
    setNewDiplome("");
  }, [formateur, open]);

  const toggleSpecialite = (spec: string) => {
    setForm((prev) => ({
      ...prev,
      specialites: prev.specialites.includes(spec)
        ? prev.specialites.filter((s) => s !== spec)
        : [...prev.specialites, spec],
    }));
  };

  const addDiplome = () => {
    if (newDiplome.trim() && !form.diplomes.includes(newDiplome.trim())) {
      setForm((prev) => ({
        ...prev,
        diplomes: [...prev.diplomes, newDiplome.trim()],
      }));
      setNewDiplome("");
    }
  };

  const removeDiplome = (diplome: string) => {
    setForm((prev) => ({
      ...prev,
      diplomes: prev.diplomes.filter((d) => d !== diplome),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nom.trim() || !form.prenom.trim()) {
      toast.error("Nom et prénom obligatoires");
      return;
    }

    try {
      if (isEditing && formateur) {
        await updateFormateur.mutateAsync({
          id: formateur.id,
          ...form,
          date_agrement: form.date_agrement || null,
        });
        toast.success("Formateur modifié");
      } else {
        await createFormateur.mutateAsync({
          ...form,
          date_agrement: form.date_agrement || null,
        });
        toast.success("Formateur créé");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const isLoading = createFormateur.isPending || updateFormateur.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le formateur" : "Nouveau formateur"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Dupont"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jean.dupont@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="123 rue de la Formation"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code_postal">Code postal</Label>
                <Input
                  id="code_postal"
                  value={form.code_postal}
                  onChange={(e) => setForm({ ...form, code_postal: e.target.value })}
                  placeholder="75001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  value={form.ville}
                  onChange={(e) => setForm({ ...form, ville: e.target.value })}
                  placeholder="Paris"
                />
              </div>
            </div>
          </div>

          {/* Spécialités */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Spécialités</h3>
            <div className="flex flex-wrap gap-2">
              {SPECIALITES_OPTIONS.map((spec) => (
                <Badge
                  key={spec}
                  variant={form.specialites.includes(spec) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSpecialite(spec)}
                >
                  {spec}
                </Badge>
              ))}
            </div>
          </div>

          {/* Diplômes */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Diplômes & Certifications</h3>
            <div className="flex gap-2">
              <Input
                value={newDiplome}
                onChange={(e) => setNewDiplome(e.target.value)}
                placeholder="Ex: BAFM, Titre Pro..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDiplome())}
              />
              <Button type="button" variant="outline" onClick={addDiplome}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.diplomes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.diplomes.map((diplome) => (
                  <Badge key={diplome} variant="secondary" className="gap-1">
                    {diplome}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeDiplome(diplome)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Agrément */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Agrément</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero_agrement">Numéro d'agrément</Label>
                <Input
                  id="numero_agrement"
                  value={form.numero_agrement}
                  onChange={(e) => setForm({ ...form, numero_agrement: e.target.value })}
                  placeholder="AG-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_agrement">Date d'agrément</Label>
                <Input
                  id="date_agrement"
                  type="date"
                  value={form.date_agrement}
                  onChange={(e) => setForm({ ...form, date_agrement: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Facturation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Informations de facturation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  value={form.siret}
                  onChange={(e) => setForm({ ...form, siret: e.target.value })}
                  placeholder="123 456 789 00012"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taux_horaire">Taux horaire (€)</Label>
                <Input
                  id="taux_horaire"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.taux_horaire}
                  onChange={(e) => setForm({ ...form, taux_horaire: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rib">RIB / IBAN</Label>
              <Input
                id="rib"
                value={form.rib}
                onChange={(e) => setForm({ ...form, rib: e.target.value })}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
              />
            </div>
          </div>

          {/* Statut et notes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="actif">Formateur actif</Label>
                <p className="text-xs text-muted-foreground">
                  Les formateurs inactifs ne sont pas proposés pour les nouvelles sessions
                </p>
              </div>
              <Switch
                id="actif"
                checked={form.actif}
                onCheckedChange={(checked) => setForm({ ...form, actif: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Remarques, disponibilités particulières..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
