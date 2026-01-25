import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WelcomeStep } from "./steps/WelcomeStep";
import { CentreStep } from "./steps/CentreStep";
import { FormationsStep } from "./steps/FormationsStep";
import { EquipeStep } from "./steps/EquipeStep";
import { DocumentsStep } from "./steps/DocumentsStep";
import { ReadyStep } from "./steps/ReadyStep";
import { useOnboardingSubmit } from "./useOnboardingSubmit";

export interface OnboardingData {
  // Centre
  nomCentre: string;
  ville: string;
  email: string;
  telephone: string;
  
  // Formations
  formations: string[];
  
  // Équipe
  formateurs: { nom: string; email: string }[];
  
  // Documents
  documentsMode: "standards" | "personnalises";
}

const STEPS = [
  { id: "bienvenue", label: "Bienvenue" },
  { id: "centre", label: "Votre centre" },
  { id: "formations", label: "Vos formations" },
  { id: "equipe", label: "Votre équipe" },
  { id: "documents", label: "Vos documents" },
  { id: "pret", label: "Prêt !" },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    nomCentre: "",
    ville: "",
    email: "",
    telephone: "",
    formations: [],
    formateurs: [],
    documentsMode: "standards",
  });

  const { submit, isSubmitting, centreId } = useOnboardingSubmit();

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    await submit(data);
  };

  const stepProps = {
    data,
    updateData,
    onNext: nextStep,
    onPrev: prevStep,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardContent className="p-0">
          {/* Header avec progression */}
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">C</span>
                </div>
                <span className="font-semibold text-lg">CampusT3P</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Étape {currentStep + 1} sur {STEPS.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2">
              {STEPS.map((step, index) => (
                <span
                  key={step.id}
                  className={`text-xs transition-colors ${
                    index <= currentStep
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {index <= currentStep ? step.label : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Contenu de l'étape */}
          <div className="p-8 min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 0 && <WelcomeStep {...stepProps} />}
                {currentStep === 1 && <CentreStep {...stepProps} />}
                {currentStep === 2 && <FormationsStep {...stepProps} />}
                {currentStep === 3 && <EquipeStep {...stepProps} />}
                {currentStep === 4 && <DocumentsStep {...stepProps} />}
                {currentStep === 5 && (
                  <ReadyStep
                    {...stepProps}
                    onComplete={handleComplete}
                    isSubmitting={isSubmitting}
                    centreId={centreId}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
