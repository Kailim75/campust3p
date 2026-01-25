import { useAdminMode } from "@/contexts/AdminModeContext";
import { SuperAdminApp } from "@/components/superadmin/SuperAdminApp";
import Index from "@/pages/Index";
import { Loader2 } from "lucide-react";

export function MainApp() {
  const { mode, isLoading, isSuperAdmin } = useAdminMode();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Super Admin Mode
  if (mode === "superadmin" && isSuperAdmin) {
    return <SuperAdminApp />;
  }

  // Centre Mode (default)
  return <Index />;
}
