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

  const handleSetMode = (newMode: AdminMode) => {
    // Only server-verified super admins can switch to superadmin mode
    if (newMode === "superadmin" && !isSuperAdmin) {
      return;
    }
    setMode(newMode);
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
