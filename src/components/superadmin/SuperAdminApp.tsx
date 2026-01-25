import { useState, lazy, Suspense } from "react";
import { SuperAdminLayout } from "./SuperAdminLayout";
import { SuperAdminHeader } from "./SuperAdminHeader";
import { SuperAdminOverview } from "./pages/SuperAdminOverview";
import { SuperAdminCentres } from "./pages/SuperAdminCentres";
import { SuperAdminPerformance } from "./pages/SuperAdminPerformance";
import { SuperAdminUsage } from "./pages/SuperAdminUsage";
import { SuperAdminUsers } from "./pages/SuperAdminUsers";
import { SuperAdminAlerts } from "./pages/SuperAdminAlerts";
import { SuperAdminActivity } from "./pages/SuperAdminActivity";
import { SuperAdminSettings } from "./pages/SuperAdminSettings";
import { Loader2 } from "lucide-react";

const SuperAdminGDPR = lazy(() => import("./pages/SuperAdminGDPR"));
const SuperAdminCharter = lazy(() => import("./pages/SuperAdminCharter").then(m => ({ default: m.SuperAdminCharter })));

const sectionConfig: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "Vue d'ensemble", subtitle: "Pilotage global de la plateforme CampusT3P" },
  centres: { title: "Centres", subtitle: "Gestion des centres de formation" },
  performance: { title: "Performance pédagogique", subtitle: "Suivi des résultats et taux de réussite" },
  usage: { title: "Usage produit", subtitle: "Métriques d'adoption et d'engagement" },
  users: { title: "Utilisateurs", subtitle: "Gestion des accès et rôles" },
  alerts: { title: "Alertes & Risques", subtitle: "Centres à surveiller et interventions" },
  activity: { title: "Activité", subtitle: "Logs et événements récents" },
  settings: { title: "Configuration", subtitle: "Paramètres de la plateforme" },
  gdpr: { title: "Conformité RGPD", subtitle: "Gestion des droits des personnes concernées" },
  charter: { title: "Charte de Sécurité", subtitle: "Gestion de la charte et suivi des acceptations" },
};

export function SuperAdminApp() {
  const [activeSection, setActiveSection] = useState("overview");
  
  const currentConfig = sectionConfig[activeSection] || sectionConfig.overview;

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <SuperAdminOverview />;
      case "centres":
        return <SuperAdminCentres />;
      case "performance":
        return <SuperAdminPerformance />;
      case "usage":
        return <SuperAdminUsage />;
      case "users":
        return <SuperAdminUsers />;
      case "alerts":
        return <SuperAdminAlerts />;
      case "activity":
        return <SuperAdminActivity />;
      case "settings":
        return <SuperAdminSettings />;
      case "gdpr":
        return (
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <SuperAdminGDPR />
          </Suspense>
        );
      case "charter":
        return (
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <SuperAdminCharter />
          </Suspense>
        );
      default:
        return <SuperAdminOverview />;
    }
  };

  return (
    <SuperAdminLayout 
      activeSection={activeSection} 
      onSectionChange={setActiveSection}
    >
      <SuperAdminHeader 
        title={currentConfig.title} 
        subtitle={currentConfig.subtitle} 
      />
      <div className="p-6 animate-fade-in">
        {renderContent()}
      </div>
    </SuperAdminLayout>
  );
}
