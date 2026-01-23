import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { QuickActionsMenu, QuickAction } from "@/components/layout/QuickActionsMenu";
import { KeyboardShortcutsDialog } from "@/components/layout/KeyboardShortcutsDialog";
import { ProactiveAlertsToast } from "@/components/layout/ProactiveAlertsToast";
import { OnboardingTour, useOnboarding } from "@/components/onboarding/OnboardingTour";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUndoStore } from "@/hooks/useUndoAction";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ContactsUnifiedPage } from "@/components/contacts/ContactsUnifiedPage";
import { FormationsPage } from "@/components/formations/FormationsPage";
import { SessionsPage } from "@/components/sessions/SessionsPage";
import { FormateursPage } from "@/components/formateurs/FormateursPage";
import { DocumentsUnifiedPage } from "@/components/documents/DocumentsUnifiedPage";
import { FacturationUnifiedPage } from "@/components/facturation/FacturationUnifiedPage";
import { AlertesPage } from "@/components/alertes/AlertesPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { CommunicationsPage } from "@/components/communications/CommunicationsPage";
import { QualiteUnifiedPage } from "@/components/qualite/QualiteUnifiedPage";
import { WorkflowsPage } from "@/components/workflows/WorkflowsPage";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { showTour, completeTour } = useOnboarding();
  const undoAction = useUndoStore((state) => state.undo);

  // Global undo with Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        // Don't trigger if user is typing in an input
        if (document.activeElement?.tagName === "INPUT" || 
            document.activeElement?.tagName === "TEXTAREA") {
          return;
        }
        e.preventDefault();
        undoAction();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoAction]);

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
      case "contacts":
        return <ContactsUnifiedPage />;
      case "formations":
        return <FormationsPage />;
      case "sessions":
        return <SessionsPage />;
      case "formateurs":
        return <FormateursPage />;
      case "documents":
        return <DocumentsUnifiedPage />;
      case "facturation":
        return <FacturationUnifiedPage />;
      case "communications":
        return <CommunicationsPage />;
      case "alertes":
        return <AlertesPage />;
      case "settings":
        return <SettingsPage />;
      case "workflows":
        return <WorkflowsPage />;
      case "qualite":
        return <QualiteUnifiedPage />;
      default:
        return <Dashboard onNavigate={setActiveSection} />;
    }
  };

    return (
    <div className="h-screen bg-background overflow-hidden">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      
      <main className={cn(
        "transition-all duration-300 h-full overflow-auto",
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
      
      {/* Onboarding tour for new users */}
      <OnboardingTour isOpen={showTour} onComplete={completeTour} />
    </div>
  );
};

export default Index;
