import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingWizard } from "@/components/onboarding/wizard/OnboardingWizard";
import { useAuth } from "@/hooks/useAuth";
import { useCentres } from "@/hooks/useCentres";
import { BrandedLoader } from "@/components/ui/branded-loader";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: centres, isLoading: centresLoading } = useCentres();

  useEffect(() => {
    // Si l'utilisateur a déjà un centre, rediriger vers le dashboard
    if (!centresLoading && centres && centres.length > 0) {
      navigate("/", { replace: true });
    }
  }, [centres, centresLoading, navigate]);

  useEffect(() => {
    // Si non authentifié, rediriger vers login
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || centresLoading) {
    return <BrandedLoader message="Préparation de votre espace..." />;
  }

  return <OnboardingWizard />;
}
