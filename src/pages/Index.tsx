import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { QuickActionsMenu, QuickAction } from "@/components/layout/QuickActionsMenu";
import { KeyboardShortcutsDialog } from "@/components/layout/KeyboardShortcutsDialog";
import { ProactiveAlertsToast } from "@/components/layout/ProactiveAlertsToast";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ContactsPage } from "@/components/contacts/ContactsPage";
import { FormationsPage } from "@/components/formations/FormationsPage";
import { SessionsPage } from "@/components/sessions/SessionsPage";
import { FormateursPage } from "@/components/formateurs/FormateursPage";
import { DocumentsPage } from "@/components/documents/DocumentsPage";
import { PaiementsPage } from "@/components/paiements/PaiementsPage";
import { DevisPage } from "@/components/devis/DevisPage";
import { AlertesPage } from "@/components/alertes/AlertesPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { CommunicationsPage } from "@/components/communications/CommunicationsPage";
import { SignaturesPage } from "@/components/signatures/SignaturesPage";
import { PipelinePage } from "@/components/pipeline/PipelinePage";
import { WorkflowsPage } from "@/components/workflows/WorkflowsPage";
import QualiopiPage from "@/components/qualiopi/QualiopiPage";
import QualiteClientPage from "@/components/qualite/QualiteClientPage";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // Support deep-links like /?section=contacts&id=...
  useEffect(() => {
    const section = searchParams.get("section");
    if (section) {
      setActiveSection(section);
      // Remove section from URL but keep other params (ex: id)
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Listen for navigate-to-alerts event from ProactiveAlertsToast
  useEffect(() => {
    const handleNavigateToAlerts = () => setActiveSection("alertes");
    window.addEventListener('navigate-to-alerts', handleNavigateToAlerts);
    return () => window.removeEventListener('navigate-to-alerts', handleNavigateToAlerts);
  }, []);

  // Global keyboard shortcuts
  useGlobalShortcuts({
    onNewContact: () => setActiveSection("contacts"),
    onNewSession: () => setActiveSection("sessions"),
    onNewPayment: () => setActiveSection("paiements"),
    onSearch: () => {
      // Focus global search - we can trigger this via event
      document.querySelector<HTMLButtonElement>('[data-global-search]')?.click();
    },
    onHelp: () => setShortcutsDialogOpen(true),
  });

  // Handle quick action - navigate to appropriate section
  const handleQuickAction = (action: QuickAction) => {
    switch (action) {
      case "contact":
        setActiveSection("contacts");
        break;
      case "session":
        setActiveSection("sessions");
        break;
      case "inscription":
        setActiveSection("sessions");
        break;
      case "paiement":
        setActiveSection("paiements");
        break;
      case "document":
        setActiveSection("documents");
        break;
      case "communication":
        setActiveSection("communications");
        break;
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveSection} />;
      case "pipeline":
        return <PipelinePage />;
      case "contacts":
        return <ContactsPage />;
      case "formations":
        return <FormationsPage />;
      case "sessions":
        return <SessionsPage />;
      case "formateurs":
        return <FormateursPage />;
      case "documents":
        return <DocumentsPage />;
      case "signatures":
        return <SignaturesPage />;
      case "paiements":
        return <PaiementsPage />;
      case "devis":
        return <DevisPage />;
      case "communications":
        return <CommunicationsPage />;
      case "alertes":
        return <AlertesPage />;
      case "settings":
        return <SettingsPage />;
      case "workflows":
        return <WorkflowsPage />;
      case "qualiopi":
        return <QualiopiPage />;
      case "qualite":
        return <QualiteClientPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      
      <main className={cn(
        "transition-all duration-300",
        isMobile ? "ml-0" : "ml-64"
      )}>
        {renderContent()}
      </main>

      {/* Quick Actions FAB */}
      <QuickActionsMenu onAction={handleQuickAction} />
      
      {/* Proactive alerts toast on login */}
      <ProactiveAlertsToast />
      
      {/* Keyboard shortcuts help dialog */}
      <KeyboardShortcutsDialog 
        open={shortcutsDialogOpen} 
        onOpenChange={setShortcutsDialogOpen} 
      />
    </div>
  );
};

export default Index;
