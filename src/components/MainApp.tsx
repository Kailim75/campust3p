import { lazy, Suspense } from "react";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { Loader2 } from "lucide-react";
import { useLegalDocuments } from "@/hooks/useLegalDocuments";
import { useCentres } from "@/hooks/useCentres";
import { useAlmaReturnHandler } from "@/hooks/useAlmaReturnHandler";

const SuperAdminApp = lazy(() =>
  import("@/components/superadmin/SuperAdminApp").then((m) => ({ default: m.SuperAdminApp }))
);
const Index = lazy(() => import("@/pages/Index"));
const LegalDocumentAcceptanceModal = lazy(() =>
  import("@/components/legal/LegalDocumentAcceptanceModal").then((m) => ({
    default: m.LegalDocumentAcceptanceModal,
  }))
);
const OnboardingWizard = lazy(() =>
  import("@/components/onboarding/wizard/OnboardingWizard").then((m) => ({
    default: m.OnboardingWizard,
  }))
);

function MainAppFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function MainApp() {
  const { mode, isLoading, isSuperAdmin } = useAdminMode();
  const { hasPendingDocuments, isLoading: docsLoading } = useLegalDocuments();
  const { data: centres, isLoading: centresLoading } = useCentres();
  const showLegalModal = hasPendingDocuments;
  useAlmaReturnHandler();

  // Loading state
  if (isLoading || docsLoading || centresLoading) {
    return <MainAppFallback />;
  }

  // Super Admin Mode
  if (mode === "superadmin" && isSuperAdmin) {
    return (
      <Suspense fallback={<MainAppFallback />}>
        <LegalDocumentAcceptanceModal open={showLegalModal} />
        {!showLegalModal && <SuperAdminApp />}
        {showLegalModal && (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center text-muted-foreground">
              <p>Veuillez accepter les documents légaux pour continuer.</p>
            </div>
          </div>
        )}
      </Suspense>
    );
  }

  // Onboarding: si l'utilisateur n'a aucun centre, afficher le wizard
  if (!isSuperAdmin && (!centres || centres.length === 0)) {
    return (
      <Suspense fallback={<MainAppFallback />}>
        <OnboardingWizard />
      </Suspense>
    );
  }

  // Centre Mode (default)
  return (
    <Suspense fallback={<MainAppFallback />}>
      <LegalDocumentAcceptanceModal open={showLegalModal} />
      {!showLegalModal && <Index />}
      {showLegalModal && (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center text-muted-foreground">
            <p>Veuillez accepter les documents légaux pour continuer.</p>
          </div>
        </div>
      )}
    </Suspense>
  );
}
