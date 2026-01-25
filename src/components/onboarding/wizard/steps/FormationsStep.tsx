import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, ArrowLeft, Check, Car, Bike } from "lucide-react";
import { OnboardingData } from "../OnboardingWizard";
import { cn } from "@/lib/utils";

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const FORMATIONS = [
  {
    id: "taxi",
    label: "Taxi",
    description: "Formation initiale et continue pour chauffeurs de taxi",
    icon: Car,
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  {
    id: "vtc",
    label: "VTC",
    description: "Formation initiale et continue pour chauffeurs VTC",
    icon: Car,
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  {
    id: "vmdtr",
    label: "VMDTR",
    description: "Véhicule motorisé à deux ou trois roues (moto-taxi)",
    icon: Bike,
    color: "bg-green-500/10 text-green-600 border-green-200",
  },
];

export function FormationsStep({ data, updateData, onNext, onPrev }: StepProps) {
  const toggleFormation = (formationId: string) => {
    const current = data.formations;
    const updated = current.includes(formationId)
      ? current.filter((f) => f !== formationId)
      : [...current, formationId];
    updateData({ formations: updated });
  };

  const isValid = data.formations.length > 0;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Quelles formations proposez-vous ?</h2>
        <p className="text-muted-foreground">
          Sélectionnez une ou plusieurs formations. Le programme commun sera 
          automatiquement configuré avec les spécificités de chaque métier.
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {FORMATIONS.map((formation) => {
          const isSelected = data.formations.includes(formation.id);
          const Icon = formation.icon;
          
          return (
            <button
              key={formation.id}
              onClick={() => toggleFormation(formation.id)}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                "hover:shadow-md",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn("p-2 rounded-lg", formation.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{formation.label}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formation.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {data.formations.length > 1 && (
        <p className="text-center text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg max-w-md mx-auto">
          💡 Le tronc commun T3P sera partagé entre vos formations, 
          avec les modules spécifiques activés automatiquement.
        </p>
      )}

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
