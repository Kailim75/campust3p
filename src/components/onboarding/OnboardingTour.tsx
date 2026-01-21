import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  LayoutDashboard, 
  Users, 
  Calendar,
  Keyboard,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  target?: string; // CSS selector for highlight
  position?: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Bienvenue sur votre CRM T3P !",
    description: "Découvrez les fonctionnalités clés en quelques étapes. Ce tour vous guidera à travers l'interface.",
    icon: Sparkles,
  },
  {
    id: "dashboard",
    title: "Tableau de bord actionnable",
    description: "Votre cockpit quotidien affiche les actions prioritaires, les tâches urgentes et les KPIs clés. Cliquez sur n'importe quel élément pour agir directement.",
    icon: LayoutDashboard,
  },
  {
    id: "quick-actions",
    title: "Actions rapides",
    description: "Le bouton + en bas à droite vous permet de créer rapidement un contact, une session ou d'enregistrer un paiement. Maximum 2 clics pour toute action !",
    icon: Users,
    target: "[data-quick-actions]",
  },
  {
    id: "sessions",
    title: "Gestion des sessions",
    description: "Visualisez vos formations en liste ou calendrier, suivez les inscriptions et gérez les émargements en temps réel.",
    icon: Calendar,
  },
  {
    id: "shortcuts",
    title: "Raccourcis clavier",
    description: "Gagnez du temps avec les raccourcis : Ctrl+N (nouveau contact), Ctrl+S (nouvelle session), Ctrl+K (recherche). Appuyez sur Shift+? pour voir tous les raccourcis.",
    icon: Keyboard,
  },
  {
    id: "complete",
    title: "Vous êtes prêt !",
    description: "Explorez librement l'application. L'icône d'aide est toujours disponible si vous avez des questions.",
    icon: CheckCircle2,
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  isOpen: boolean;
}

export function OnboardingTour({ onComplete, isOpen }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isOpen) return null;

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const isFirst = currentStep === 0;
  const isLast = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const Icon = step.icon;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleSkip}
        />
        
        {/* Tour Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <Card className="relative w-[90vw] max-w-md mx-4 shadow-2xl">
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Fermer le tour"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
            
            <CardContent className="pt-8 pb-6 px-6">
              {/* Progress */}
              <div className="mb-6">
                <Progress value={progress} className="h-1" />
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {currentStep + 1} / {tourSteps.length}
                </p>
              </div>
              
              {/* Icon */}
              <motion.div
                key={step.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex justify-center mb-6"
              >
                <div className="p-4 rounded-2xl bg-primary/10">
                  <Icon className="h-10 w-10 text-primary" />
                </div>
              </motion.div>
              
              {/* Content */}
              <motion.div
                key={`content-${step.id}`}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-8"
              >
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
              
              {/* Navigation */}
              <div className="flex items-center gap-3">
                {!isFirst && (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Précédent
                  </Button>
                )}
                
                {isFirst && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="flex-1"
                  >
                    Passer
                  </Button>
                )}
                
                <Button
                  onClick={handleNext}
                  className="flex-1"
                >
                  {isLast ? (
                    <>
                      Commencer
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
              
              {/* Step indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {tourSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentStep 
                        ? "bg-primary w-6" 
                        : "bg-muted hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Aller à l'étape ${index + 1}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    return localStorage.getItem("crm-onboarding-completed") === "true";
  });

  useEffect(() => {
    // Show tour for first-time users after a short delay
    if (!hasCompletedTour) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour]);

  const completeTour = () => {
    setShowTour(false);
    setHasCompletedTour(true);
    localStorage.setItem("crm-onboarding-completed", "true");
  };

  const restartTour = () => {
    setShowTour(true);
  };

  return {
    showTour,
    completeTour,
    restartTour,
    hasCompletedTour,
  };
}
