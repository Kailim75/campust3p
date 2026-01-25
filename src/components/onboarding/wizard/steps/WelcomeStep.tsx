import { Button } from "@/components/ui/button";
import { Sparkles, Clock, Shield, Rocket } from "lucide-react";
import { OnboardingData } from "../OnboardingWizard";

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function WelcomeStep({ onNext }: StepProps) {
  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">
          Bienvenue sur CampusT3P
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          En quelques minutes, votre centre de formation sera prêt à accueillir 
          et former vos premiers apprenants.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        <div className="p-4 rounded-xl bg-muted/50 space-y-2">
          <Clock className="h-6 w-6 text-primary mx-auto" />
          <p className="text-sm font-medium">5 minutes</p>
          <p className="text-xs text-muted-foreground">Configuration rapide</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50 space-y-2">
          <Shield className="h-6 w-6 text-primary mx-auto" />
          <p className="text-sm font-medium">Conforme</p>
          <p className="text-xs text-muted-foreground">Prêt pour Qualiopi</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50 space-y-2">
          <Rocket className="h-6 w-6 text-primary mx-auto" />
          <p className="text-sm font-medium">Opérationnel</p>
          <p className="text-xs text-muted-foreground">Dès la fin</p>
        </div>
      </div>

      <Button size="lg" onClick={onNext} className="px-8">
        Commencer la configuration
      </Button>
    </div>
  );
}
