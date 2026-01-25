import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Rocket, 
  ArrowLeft, 
  Check, 
  Loader2, 
  UserPlus, 
  Calendar,
  PartyPopper
} from "lucide-react";
import { OnboardingData } from "../OnboardingWizard";
import { cn } from "@/lib/utils";

interface ReadyStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => Promise<void>;
  isSubmitting: boolean;
  centreId: string | null;
}

type QuickAction = "apprenant" | "session" | null;

export function ReadyStep({ 
  data, 
  onPrev, 
  onComplete, 
  isSubmitting,
  centreId 
}: ReadyStepProps) {
  const navigate = useNavigate();
  const [isCompleted, setIsCompleted] = useState(false);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);

  const handleComplete = async () => {
    await onComplete();
    setIsCompleted(true);
  };

  const handleQuickAction = (action: QuickAction) => {
    setQuickAction(action);
  };

  const handleGoToDashboard = () => {
    // Navigate based on quick action selection
    if (quickAction === "apprenant") {
      navigate("/?section=contacts");
    } else if (quickAction === "session") {
      navigate("/?section=sessions");
    } else {
      navigate("/");
    }
  };

  // Summary of configuration
  const formationsLabel = data.formations
    .map((f) => f.toUpperCase())
    .join(", ");

  if (isCompleted) {
    return (
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <PartyPopper className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-primary">
            Votre centre est prêt !
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            <strong>{data.nomCentre}</strong> est maintenant configuré 
            et prêt à former et inscrire des apprenants.
          </p>
        </div>

        {/* Quick action selection */}
        <div className="space-y-4 max-w-md mx-auto">
          <p className="text-sm font-medium">Que souhaitez-vous faire en premier ?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickAction("apprenant")}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all",
                quickAction === "apprenant"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <UserPlus className="h-6 w-6 mx-auto mb-2 text-primary" />
              <span className="text-sm font-medium">Inscrire un apprenant</span>
            </button>
            <button
              onClick={() => handleQuickAction("session")}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all",
                quickAction === "session"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <span className="text-sm font-medium">Créer une session</span>
            </button>
          </div>
        </div>

        <Button size="lg" onClick={handleGoToDashboard} className="px-8">
          {quickAction ? "C'est parti !" : "Accéder au tableau de bord"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Tout est prêt !</h2>
        <p className="text-muted-foreground">
          Vérifiez le récapitulatif et lancez la configuration de votre centre
        </p>
      </div>

      {/* Récapitulatif */}
      <div className="space-y-3 max-w-md mx-auto">
        <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Centre</span>
            <span className="font-medium">{data.nomCentre}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ville</span>
            <span className="font-medium">{data.ville}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Formations</span>
            <span className="font-medium">{formationsLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Formateurs</span>
            <span className="font-medium">
              {data.formateurs.length === 0 
                ? "À ajouter plus tard" 
                : `${data.formateurs.length} formateur${data.formateurs.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Documents</span>
            <span className="font-medium">
              {data.documentsMode === "standards" 
                ? "Modèles recommandés" 
                : "Personnalisés"}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-center">
            <Check className="h-4 w-4 inline-block mr-1 text-primary" />
            Le programme commun T3P et les modules spécifiques seront 
            configurés automatiquement
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onPrev} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button onClick={handleComplete} disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Configuration en cours...
            </>
          ) : (
            <>
              Lancer la configuration
              <Rocket className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
