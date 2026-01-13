import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { 
  useCreateEmailTemplate, 
  useUpdateEmailTemplate, 
  type EmailTemplate,
  type EmailTemplateInsert 
} from "@/hooks/useEmailTemplates";

interface EmailTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
}

const categories = [
  { value: "inscription", label: "Inscription" },
  { value: "convocation", label: "Convocation" },
  { value: "paiement", label: "Paiement" },
  { value: "examen", label: "Examen" },
  { value: "renouvellement", label: "Renouvellement" },
  { value: "prospection", label: "Prospection" },
  { value: "administratif", label: "Administratif" },
  { value: "modification", label: "Modification" },
  { value: "autre", label: "Autre" },
];

export function EmailTemplateFormDialog({
  open,
  onOpenChange,
  template,
}: EmailTemplateFormDialogProps) {
  const [nom, setNom] = useState("");
  const [sujet, setSujet] = useState("");
  const [contenu, setContenu] = useState("");
  const [categorie, setCategorie] = useState("autre");
  const [actif, setActif] = useState(true);
  const [variableInput, setVariableInput] = useState("");
  const [variables, setVariables] = useState<string[]>([]);

  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();

  const isEditing = template && template.id;

  useEffect(() => {
    if (template) {
      setNom(template.nom);
      setSujet(template.sujet);
      setContenu(template.contenu);
      setCategorie(template.categorie);
      setActif(template.actif);
      setVariables(template.variables || []);
    } else {
      resetForm();
    }
  }, [template, open]);

  const resetForm = () => {
    setNom("");
    setSujet("");
    setContenu("");
    setCategorie("autre");
    setActif(true);
    setVariables([]);
    setVariableInput("");
  };

  // Extraire automatiquement les variables du contenu
  useEffect(() => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = new Set<string>();
    let match;
    
    while ((match = regex.exec(sujet + " " + contenu)) !== null) {
      matches.add(match[1]);
    }
    
    setVariables(Array.from(matches));
  }, [sujet, contenu]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: EmailTemplateInsert = {
      nom: nom.trim(),
      sujet: sujet.trim(),
      contenu: contenu.trim(),
      categorie,
      actif,
      variables,
    };

    if (isEditing) {
      await updateTemplate.mutateAsync({ id: template.id, ...data });
    } else {
      await createTemplate.mutateAsync(data);
    }

    onOpenChange(false);
    resetForm();
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le modèle" : "Nouveau modèle d'email"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations du modèle"
              : "Créez un nouveau modèle d'email personnalisable"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du modèle *</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Confirmation inscription"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Select value={categorie} onValueChange={setCategorie}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sujet">Sujet de l'email *</Label>
            <Input
              id="sujet"
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              placeholder="Ex: Confirmation de votre inscription - Formation {{formation_type}}"
              required
            />
            <p className="text-xs text-muted-foreground">
              Utilisez {"{{variable}}"} pour insérer des données dynamiques
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenu">Contenu de l'email *</Label>
            <Textarea
              id="contenu"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Bonjour {{civilite}} {{nom}},&#10;&#10;Votre message ici..."
              rows={12}
              className="font-mono text-sm"
              required
            />
          </div>

          {variables.length > 0 && (
            <div className="space-y-2">
              <Label>Variables détectées</Label>
              <div className="flex flex-wrap gap-1">
                {variables.map((v) => (
                  <Badge key={v} variant="secondary" className="text-xs font-mono">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="actif" className="font-medium">Modèle actif</Label>
              <p className="text-xs text-muted-foreground">
                Les modèles inactifs ne peuvent pas être utilisés
              </p>
            </div>
            <Switch
              id="actif"
              checked={actif}
              onCheckedChange={setActif}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || !nom.trim() || !sujet.trim() || !contenu.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? "Modification..." : "Création..."}
                </>
              ) : isEditing ? (
                "Enregistrer"
              ) : (
                "Créer le modèle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
