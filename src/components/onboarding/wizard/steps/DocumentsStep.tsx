import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, ArrowLeft, Check, Sparkles, Upload } from "lucide-react";
import { OnboardingData } from "../OnboardingWizard";
import { cn } from "@/lib/utils";

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const OPTIONS = [
  {
    id: "standards" as const,
    label: "Utiliser les modèles recommandés",
    description: "Documents conformes et prêts à l'emploi : conventions, attestations, feuilles d'émargement...",
    icon: Sparkles,
    recommended: true,
  },
  {
    id: "personnalises" as const,
    label: "Utiliser mes propres documents",
    description: "Vous pourrez importer vos modèles personnalisés après la configuration.",
    icon: Upload,
    recommended: false,
  },
];

export function DocumentsStep({ data, updateData, onNext, onPrev }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Et pour vos documents ?</h2>
        <p className="text-muted-foreground">
          Choisissez comment gérer vos documents de formation
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {OPTIONS.map((option) => {
          const isSelected = data.documentsMode === option.id;
          const Icon = option.icon;
          
          return (
            <button
              key={option.id}
              onClick={() => updateData({ documentsMode: option.id })}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                "hover:shadow-md relative",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              )}
            >
              {option.recommended && (
                <span className="absolute -top-2 right-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  Recommandé
                </span>
              )}
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{option.label}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {data.documentsMode === "standards" && (
        <div className="bg-muted/50 p-4 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Documents inclus :</span>
            {" "}Convention de formation, Attestation de fin de formation, 
            Feuille d'émargement, Programme de formation, Règlement intérieur.
          </p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button onClick={onNext}>
          Continuer
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
