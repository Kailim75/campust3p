import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useIsSuperAdmin } from "@/hooks/useCentres";

type AdminMode = "centre" | "superadmin";

interface AdminModeContextValue {
  mode: AdminMode;
  setMode: (mode: AdminMode) => void;
  isSuperAdmin: boolean;
  isLoading: boolean;
  canSwitchMode: boolean;
}

const AdminModeContext = createContext<AdminModeContextValue | undefined>(undefined);

interface AdminModeProviderProps {
  children: ReactNode;
}

export function AdminModeProvider({ children }: AdminModeProviderProps) {
  const { data: isSuperAdmin = false, isLoading } = useIsSuperAdmin();
  const [mode, setMode] = useState<AdminMode>("centre");

  // Auto-set mode based on role on first load
  useEffect(() => {
    if (!isLoading && isSuperAdmin) {
      // Check if there's a saved preference
      const savedMode = localStorage.getItem("admin-mode") as AdminMode | null;
      if (savedMode === "superadmin") {
        setMode("superadmin");
      }
    }
  }, [isLoading, isSuperAdmin]);

  const handleSetMode = (newMode: AdminMode) => {
    // Only super admins can switch to superadmin mode
    if (newMode === "superadmin" && !isSuperAdmin) {
      return;
    }
    setMode(newMode);
    localStorage.setItem("admin-mode", newMode);
  };

  const value: AdminModeContextValue = {
    mode,
    setMode: handleSetMode,
    isSuperAdmin,
    isLoading,
    canSwitchMode: isSuperAdmin,
  };

  return (
    <AdminModeContext.Provider value={value}>
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  const context = useContext(AdminModeContext);
  if (context === undefined) {
    throw new Error("useAdminMode must be used within an AdminModeProvider");
  }
  return context;
}
