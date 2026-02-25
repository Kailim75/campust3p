import { useAdminMode } from "@/contexts/AdminModeContext";
import { SuperAdminApp } from "@/components/superadmin/SuperAdminApp";
import Index from "@/pages/Index";
import { Loader2 } from "lucide-react";
import { LegalDocumentAcceptanceModal } from "@/components/legal/LegalDocumentAcceptanceModal";
import { useLegalDocuments } from "@/hooks/useLegalDocuments";
import { useCentres } from "@/hooks/useCentres";
import { OnboardingWizard } from "@/components/onboarding/wizard/OnboardingWizard";

export function MainApp() {
  const { mode, isLoading, isSuperAdmin } = useAdminMode();
  const { hasPendingDocuments, isLoading: docsLoading } = useLegalDocuments();
  const { data: centres, isLoading: centresLoading } = useCentres();
  const showLegalModal = hasPendingDocuments;

  // Loading state
  if (isLoading || docsLoading || centresLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Super Admin Mode
  if (mode === "superadmin" && isSuperAdmin) {
    return (
      <>
        <LegalDocumentAcceptanceModal open={showLegalModal} />
        {!showLegalModal && <SuperAdminApp />}
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
    return <OnboardingWizard />;
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
