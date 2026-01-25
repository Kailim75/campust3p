import { useAdminMode } from "@/contexts/AdminModeContext";
import { SuperAdminApp } from "@/components/superadmin/SuperAdminApp";
import Index from "@/pages/Index";
import { Loader2 } from "lucide-react";
import { CharterAcceptanceModal } from "@/components/charter/CharterAcceptanceModal";
import { useSecurityCharter } from "@/hooks/useSecurityCharter";

export function MainApp() {
  const { mode, isLoading, isSuperAdmin } = useAdminMode();
  const { hasAccepted, activeCharter, isLoading: charterLoading } = useSecurityCharter();

  // Loading state
  if (isLoading || charterLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show charter acceptance modal if not accepted and there's an active charter
  const showCharterModal = activeCharter && !hasAccepted;

  // Super Admin Mode
  if (mode === "superadmin" && isSuperAdmin) {
    return (
      <>
        <CharterAcceptanceModal open={showCharterModal} />
        {!showCharterModal && <SuperAdminApp />}
        {showCharterModal && (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center text-muted-foreground">
              <p>Veuillez accepter la charte de sécurité pour continuer.</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Centre Mode (default)
  return (
    <>
      <CharterAcceptanceModal open={showCharterModal} />
      {!showCharterModal && <Index />}
      {showCharterModal && (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center text-muted-foreground">
            <p>Veuillez accepter la charte de sécurité pour continuer.</p>
          </div>
        </div>
      )}
    </>
  );
}
