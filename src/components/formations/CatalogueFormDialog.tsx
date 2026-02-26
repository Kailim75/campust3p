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
import { Loader2 } from "lucide-react";
import { 
  useCreateCatalogueFormation, 
  useUpdateCatalogueFormation,
  type CatalogueFormation,
  type CatalogueFormationInsert 
} from "@/hooks/useCatalogueFormations";

interface CatalogueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formation: CatalogueFormation | null;
}

const categories = ["Taxi", "VTC", "VMDTR", "Accompagnement", "Autre"];
const types = [
  { value: "initiale", label: "Formation initiale" },
  { value: "continue", label: "Formation continue" },
  { value: "mobilite", label: "Formation mobilité" },
  { value: "accompagnement", label: "Accompagnement" },
  { value: "autre", label: "Autre (frais, supports...)" },
];

export function CatalogueFormDialog({
  open,
  onOpenChange,
  formation,
}: CatalogueFormDialogProps) {
  const [code, setCode] = useState("");
  const [intitule, setIntitule] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("Autre");
  const [typeFormation, setTypeFormation] = useState("initiale");
  const [dureeHeures, setDureeHeures] = useState("14");
  const [prixHt, setPrixHt] = useState("0");
  const [tvaPercent, setTvaPercent] = useState("0");
  const [remisePercent, setRemisePercent] = useState("0");
  const [actif, setActif] = useState(true);
  const [prerequis, setPrerequis] = useState("");
  const [objectifs, setObjectifs] = useState("");

  const createFormation = useCreateCatalogueFormation();
  const updateFormation = useUpdateCatalogueFormation();

  const isEditing = !!formation?.id;

  useEffect(() => {
    if (formation) {
      setCode(formation.code);
      setIntitule(formation.intitule);
      setDescription(formation.description || "");
      setCategorie(formation.categorie);
      setTypeFormation(formation.type_formation);
      setDureeHeures(formation.duree_heures.toString());
      setPrixHt(formation.prix_ht.toString());
      setTvaPercent(formation.tva_percent.toString());
      setRemisePercent(formation.remise_percent?.toString() || "0");
      setActif(formation.actif);
      setPrerequis(formation.prerequis || "");
      setObjectifs(formation.objectifs || "");
    } else {
      resetForm();
    }
  }, [formation, open]);

  const resetForm = () => {
    setCode("");
    setIntitule("");
    setDescription("");
    setCategorie("Autre");
    setTypeFormation("initiale");
    setDureeHeures("14");
    setPrixHt("0");
    setTvaPercent("0");
    setRemisePercent("0");
    setActif(true);
    setPrerequis("");
    setObjectifs("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CatalogueFormationInsert = {
      code: code.trim().toUpperCase(),
      intitule: intitule.trim(),
      description: description.trim() || null,
      categorie,
      type_formation: typeFormation,
      duree_heures: parseInt(dureeHeures) || 0,
      prix_ht: parseFloat(prixHt) || 0,
      tva_percent: 0,
      remise_percent: Math.round(parseFloat(remisePercent) || 0),
      actif,
      prerequis: prerequis.trim() || null,
      objectifs: objectifs.trim() || null,
    };

    if (isEditing) {
      await updateFormation.mutateAsync({ id: formation.id, ...data });
    } else {
      await createFormation.mutateAsync(data);
    }

    onOpenChange(false);
    resetForm();
  };

  const isPending = createFormation.isPending || updateFormation.isPending;

  const remise = parseFloat(remisePercent) || 0;
  const prixBase = parseFloat(prixHt) || 0;
  const prixApresRemise = prixBase * (1 - remise / 100);
  const prixFinal = prixApresRemise;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'article" : "Nouvel article au catalogue"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations de cet article"
              : "Ajoutez une formation ou un article au catalogue"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code article *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: VTC-INIT"
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
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intitule">Intitulé *</Label>
            <Input
              id="intitule"
              value={intitule}
              onChange={(e) => setIntitule(e.target.value)}
              placeholder="Ex: Formation Initiale VTC"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de la formation ou de l'article..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="typeFormation">Type</Label>
              <Select value={typeFormation} onValueChange={setTypeFormation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dureeHeures">Durée (heures)</Label>
              <Input
                id="dureeHeures"
                type="number"
                min="0"
                value={dureeHeures}
                onChange={(e) => setDureeHeures(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prixHt">Prix (€)</Label>
              <Input
                id="prixHt"
                type="number"
                min="0"
                step="0.01"
                value={prixHt}
                onChange={(e) => setPrixHt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remisePercent">Remise (%)</Label>
              <Input
                id="remisePercent"
                type="number"
                min="0"
                max="100"
                step="1"
                value={remisePercent}
                onChange={(e) => setRemisePercent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Prix final</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm font-medium">
                {prixFinal.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </div>
              {remise > 0 && (
                <p className="text-xs text-success">Remise de {remise}% appliquée</p>
              )}
              <p className="text-xs text-muted-foreground">TVA non applicable — art. 261-4-4° et 293 B du CGI</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prerequis">Prérequis</Label>
              <Textarea
                id="prerequis"
                value={prerequis}
                onChange={(e) => setPrerequis(e.target.value)}
                placeholder="Permis B, 21 ans minimum..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectifs">Objectifs</Label>
              <Textarea
                id="objectifs"
                value={objectifs}
                onChange={(e) => setObjectifs(e.target.value)}
                placeholder="Obtention de la carte professionnelle..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="actif" className="font-medium">Article actif</Label>
              <p className="text-xs text-muted-foreground">
                Les articles inactifs ne sont pas proposés en facturation
              </p>
            </div>
            <Switch
              id="actif"
              checked={actif}
              onCheckedChange={setActif}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || !code.trim() || !intitule.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? "Modification..." : "Création..."}
                </>
              ) : isEditing ? (
                "Enregistrer"
              ) : (
                "Ajouter au catalogue"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
