import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUserCentre, useIsSuperAdmin, useCentres, Centre } from "@/hooks/useCentres";

interface CentreContextValue {
  // Centre actuel sélectionné
  currentCentre: Centre | null;
  setCurrentCentre: (centre: Centre | null) => void;
  
  // Liste des centres accessibles
  accessibleCentres: Centre[];
  
  // Statuts
  isLoading: boolean;
  isSuperAdmin: boolean;
  hasCentre: boolean;
  
  // Centre ID pour les requêtes
  centreId: string | null;
}

const CentreContext = createContext<CentreContextValue | undefined>(undefined);

interface CentreProviderProps {
  children: ReactNode;
}

export function CentreProvider({ children }: CentreProviderProps) {
  const [currentCentre, setCurrentCentre] = useState<Centre | null>(null);
  
  const { data: userCentre, isLoading: userCentreLoading } = useUserCentre();
  const { data: isSuperAdmin = false, isLoading: superAdminLoading } = useIsSuperAdmin();
  const { data: centres = [], isLoading: centresLoading } = useCentres();

  // Initialiser le centre courant quand les données sont chargées
  useEffect(() => {
    if (currentCentre) return; // Déjà initialisé
    
    if (userCentre) {
      setCurrentCentre(userCentre);
    } else if (isSuperAdmin && centres.length > 0) {
      // Super admin sans centre assigné : prendre le premier
      setCurrentCentre(centres[0]);
    }
  }, [userCentre, isSuperAdmin, centres, currentCentre]);

  const isLoading = userCentreLoading || superAdminLoading || centresLoading;

  const value: CentreContextValue = {
    currentCentre,
    setCurrentCentre,
    accessibleCentres: centres,
    isLoading,
    isSuperAdmin,
    hasCentre: !!currentCentre,
    centreId: currentCentre?.id ?? null,
  };

  return (
    <CentreContext.Provider value={value}>
      {children}
    </CentreContext.Provider>
  );
}

export function useCentreContext() {
  const context = useContext(CentreContext);
  if (context === undefined) {
    throw new Error("useCentreContext must be used within a CentreProvider");
  }
  return context;
}
