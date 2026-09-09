import { lazy, Suspense } from "react";
import { useAdminMode } from "@/contexts/AdminModeContext";
import Index from "@/pages/Index";
import { Loader2 } from "lucide-react";
import { LegalDocumentAcceptanceModal } from "@/components/legal/LegalDocumentAcceptanceModal";
import { useLegalDocuments } from "@/hooks/useLegalDocuments";
import { useCentres } from "@/hooks/useCentres";
import { useAlmaReturnHandler } from "@/hooks/useAlmaReturnHandler";

// Chargés à la demande : réservés au super-admin et à la création du premier
// centre, ils n'ont rien à faire dans le bundle de démarrage (audit 13/08, perf P2).
const SuperAdminApp = lazy(() =>
  import("@/components/superadmin/SuperAdminApp").then((m) => ({ default: m.SuperAdminApp })),
);
const OnboardingWizard = lazy(() =>
  import("@/components/onboarding/wizard/OnboardingWizard").then((m) => ({ default: m.OnboardingWizard })),
);

function FullScreenLoader() {
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
    return <FullScreenLoader />;
  }

  // Super Admin Mode
  if (mode === "superadmin" && isSuperAdmin) {
    return (
      <>
        <LegalDocumentAcceptanceModal open={showLegalModal} />
        {!showLegalModal && (
          <Suspense fallback={<FullScreenLoader />}>
            <SuperAdminApp />
          </Suspense>
        )}
        {showLegalModal && (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center text-muted-foreground">
              <p>Veuillez accepter les documents légaux pour continuer.</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Onboarding: si l'utilisateur n'a aucun centre, afficher le wizard
  if (!isSuperAdmin && (!centres || centres.length === 0)) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <OnboardingWizard />
      </Suspense>
    );
  }

  // Centre Mode (default)
  return (
    <>
      <LegalDocumentAcceptanceModal open={showLegalModal} />
      {!showLegalModal && <Index />}
      {showLegalModal && (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center text-muted-foreground">
            <p>Veuillez accepter les documents légaux pour continuer.</p>
          </div>
        </div>
      )}
    </>
  );
}
