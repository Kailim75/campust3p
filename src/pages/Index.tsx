import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageTransition } from "@/components/layout/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { QuickActionsMenu, QuickAction } from "@/components/layout/QuickActionsMenu";
import { KeyboardShortcutsDialog } from "@/components/layout/KeyboardShortcutsDialog";
import { ProactiveAlertsToast } from "@/components/layout/ProactiveAlertsToast";
import { OnboardingTour, useOnboarding } from "@/components/onboarding/OnboardingTour";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUndoStore } from "@/hooks/useUndoAction";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ContactsUnifiedPage } from "@/components/contacts/ContactsUnifiedPage";
import { ApprenantsPage } from "@/components/apprenants/ApprenantsPage";
import { FormationsPage } from "@/components/formations/FormationsPage";
import { ProspectsPage } from "@/components/prospects/ProspectsPage";
import { SessionsPage } from "@/components/sessions/SessionsPage";
import { FormateursPage } from "@/components/formateurs/FormateursPage";
import { DocumentsUnifiedPage } from "@/components/documents/DocumentsUnifiedPage";
import { FacturationUnifiedPage } from "@/components/facturation/FacturationUnifiedPage";
import { AlertesPage } from "@/components/alertes/AlertesPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { CommunicationsPage } from "@/components/communications/CommunicationsPage";
import { QualiteUnifiedPage } from "@/components/qualite/QualiteUnifiedPage";
import { WorkflowsPage } from "@/components/workflows/WorkflowsPage";
import { LmsAdminPage } from "@/components/lms/LmsAdminPage";
import { PartnersPage } from "@/components/partners/PartnersPage";
import { RapportsPage } from "@/components/rapports/RapportsPage";
import { PlanningPage } from "@/components/planning/PlanningPage";
import { PipelinePage } from "@/components/pipeline/PipelinePage";
import { PlanningConduitePage } from "@/components/planning-conduite/PlanningConduitePage";
import { CockpitFinancierPage } from "@/components/cockpit-financier/CockpitFinancierPage";
import RappelsPage from "@/components/rappels/RappelsPage";
import AgentIAPage from "@/components/agent-ia/AgentIAPage";
import IADirectorPage from "@/components/ia-director/IADirectorPage";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
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

  // Support deep-links like /?section=contacts&contactId=...
  useEffect(() => {
    const section = searchParams.get("section");
    const contactId = searchParams.get("contactId");
    
    if (section) {
      setActiveSection(section);
    }
    if (contactId) {
      setSelectedContactId(contactId);
    }
    
    // Remove params from URL
    if (section || contactId) {
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      next.delete("contactId");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Reset tab when section changes
  useEffect(() => {
    setActiveTab(undefined);
  }, [activeSection]);

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

  // Navigate to a section with optional contactId
  const handleNavigateWithContact = (section: string, contactId?: string) => {
    setActiveSection(section);
    if (contactId) {
      setSelectedContactId(contactId);
    }
  };

  // Clear selected contact when handled
  const handleContactOpened = () => {
    setSelectedContactId(null);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveSection} onNavigateWithContact={handleNavigateWithContact} />;
      case "contacts":
        return <ApprenantsPage />;
      case "formations":
        return <FormationsPage />;
      case "sessions":
        return <SessionsPage />;
      case "pipeline":
        return <PipelinePage />;
      case "prospects":
        return <ProspectsPage />;
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
      case "elearning":
        return <LmsAdminPage />;
      case "partenaires":
        return <PartnersPage />;
      case "planning":
        return <PlanningPage />;
      case "planning-conduite":
        return <PlanningConduitePage />;
      case "cockpit-financier":
        return <CockpitFinancierPage />;
      case "rappels":
        return <RappelsPage />;
      case "rapports":
        return <RapportsPage />;
      case "ia-director":
        return <IADirectorPage />;
      case "agent-ia":
        return <AgentIAPage />;
      default:
        return <Dashboard onNavigate={setActiveSection} />;
    }
  };

    return (
    <div className="h-screen bg-background overflow-hidden">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        onNewContact={() => setNewContactOpen(true)}
      />
      
      <main className={cn(
        "transition-all duration-300 h-full overflow-auto",
        isMobile ? "ml-0" : "ml-64"
      )}>
        <NavigationProvider
          activeSection={activeSection}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={setActiveSection}
        >
          <PageTransition transitionKey={activeSection}>
            {renderContent()}
          </PageTransition>
        </NavigationProvider>
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

      <ContactFormDialog open={newContactOpen} onOpenChange={setNewContactOpen} />
    </div>
  );
};

export default Index;
