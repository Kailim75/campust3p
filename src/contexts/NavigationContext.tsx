import { createContext, useContext, ReactNode } from "react";

interface NavigationContextValue {
  activeSection: string;
  activeTab?: string;
  setActiveTab: (tab: string | undefined) => void;
  onNavigate: (section: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

interface NavigationProviderProps {
  children: ReactNode;
  activeSection: string;
  activeTab?: string;
  setActiveTab: (tab: string | undefined) => void;
  onNavigate: (section: string) => void;
}

export function NavigationProvider({
  children,
  activeSection,
  activeTab,
  setActiveTab,
  onNavigate,
}: NavigationProviderProps) {
  return (
    <NavigationContext.Provider value={{ activeSection, activeTab, setActiveTab, onNavigate }}>
      {children}
    </NavigationContext.Provider>
  );
}
