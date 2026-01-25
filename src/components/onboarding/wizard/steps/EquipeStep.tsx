import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, ArrowRight, ArrowLeft, Plus, X, UserPlus } from "lucide-react";
import { OnboardingData } from "../OnboardingWizard";

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function EquipeStep({ data, updateData, onNext, onPrev }: StepProps) {
  const [newFormateur, setNewFormateur] = useState({ nom: "", email: "" });

  const addFormateur = () => {
    if (newFormateur.nom.trim() && newFormateur.email.trim()) {
      updateData({
        formateurs: [...data.formateurs, { ...newFormateur }],
      });
      setNewFormateur({ nom: "", email: "" });
    }
  };

  const removeFormateur = (index: number) => {
    updateData({
      formateurs: data.formateurs.filter((_, i) => i !== index),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newFormateur.nom.trim() && newFormateur.email.trim()) {
      e.preventDefault();
      addFormateur();
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Qui forme dans votre centre ?</h2>
        <p className="text-muted-foreground">
          Ajoutez vos formateurs. Ils recevront un email pour accéder à leur espace.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {/* Liste des formateurs ajoutés */}
        {data.formateurs.length > 0 && (
          <div className="space-y-2">
            {data.formateurs.map((formateur, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {formateur.nom.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{formateur.nom}</p>
                    <p className="text-xs text-muted-foreground">{formateur.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeFormateur(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Formulaire d'ajout */}
        <div className="p-4 rounded-xl border-2 border-dashed border-muted-foreground/25 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserPlus className="h-4 w-4" />
            <span>Ajouter un formateur</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="formateurNom" className="text-xs">Nom complet</Label>
              <Input
                id="formateurNom"
                placeholder="Jean Dupont"
                value={newFormateur.nom}
                onChange={(e) => setNewFormateur({ ...newFormateur, nom: e.target.value })}
                onKeyPress={handleKeyPress}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="formateurEmail" className="text-xs">Email</Label>
              <Input
                id="formateurEmail"
                type="email"
                placeholder="jean@centre.fr"
                value={newFormateur.email}
                onChange={(e) => setNewFormateur({ ...newFormateur, email: e.target.value })}
                onKeyPress={handleKeyPress}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addFormateur}
            disabled={!newFormateur.nom.trim() || !newFormateur.email.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Vous pourrez ajouter d'autres formateurs plus tard depuis les paramètres.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button onClick={onNext}>
          {data.formateurs.length === 0 ? "Passer cette étape" : "Continuer"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
