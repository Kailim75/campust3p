import { useAdminMode } from "@/contexts/AdminModeContext";
import { SuperAdminApp } from "@/components/superadmin/SuperAdminApp";
import Index from "@/pages/Index";
import { Loader2 } from "lucide-react";
import { LegalDocumentAcceptanceModal } from "@/components/legal/LegalDocumentAcceptanceModal";
import { useLegalDocuments } from "@/hooks/useLegalDocuments";

export function MainApp() {
  const { mode, isLoading, isSuperAdmin } = useAdminMode();
  const { hasPendingDocuments, isLoading: docsLoading } = useLegalDocuments();

  // Loading state
  if (isLoading || docsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show legal document acceptance modal if there are pending documents
  const showLegalModal = hasPendingDocuments;

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
