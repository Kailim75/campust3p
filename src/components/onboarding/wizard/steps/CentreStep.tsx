import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { OnboardingData } from "../OnboardingWizard";

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function CentreStep({ data, updateData, onNext, onPrev }: StepProps) {
  const isValid = data.nomCentre.trim() && data.ville.trim() && data.email.trim();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Parlons de votre centre</h2>
        <p className="text-muted-foreground">
          Ces informations apparaîtront sur vos documents officiels
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="nomCentre">Nom de votre centre de formation</Label>
          <Input
            id="nomCentre"
            placeholder="Ex : Centre de Formation T3P Paris"
            value={data.nomCentre}
            onChange={(e) => updateData({ nomCentre: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ville">Dans quelle ville êtes-vous ?</Label>
          <Input
            id="ville"
            placeholder="Ex : Paris"
            value={data.ville}
            onChange={(e) => updateData({ ville: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email de contact principal</Label>
          <Input
            id="email"
            type="email"
            placeholder="contact@votrecentre.fr"
            value={data.email}
            onChange={(e) => updateData({ email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telephone">Téléphone (optionnel)</Label>
          <Input
            id="telephone"
            type="tel"
            placeholder="01 23 45 67 89"
            value={data.telephone}
            onChange={(e) => updateData({ telephone: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Continuer
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
