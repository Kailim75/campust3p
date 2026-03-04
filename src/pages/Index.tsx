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
import { BlockageBanner } from "@/components/blockage/BlockageBanner";
import { BlockagePanel } from "@/components/blockage/BlockagePanel";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { AujourdhuiPage } from "@/components/aujourdhui/AujourdhuiPage";
import { ApprenantsPage } from "@/components/apprenants/ApprenantsPage";
import { FormationsPage } from "@/components/formations/FormationsPage";
import { ProspectsPage } from "@/components/prospects/ProspectsPage";
import { SessionsPage } from "@/components/sessions/SessionsPage";
import { FinancesPage } from "@/components/finances/FinancesPage";
import { AutomationsPage } from "@/components/automations/AutomationsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { AlertesPage } from "@/components/alertes/AlertesPage";
import { QualiteUnifiedPage } from "@/components/qualite/QualiteUnifiedPage";
import { PartnersPage } from "@/components/partners/PartnersPage";
import { FormateursPage } from "@/components/formateurs/FormateursPage";
import { PlanningConduitePage } from "@/components/planning-conduite/PlanningConduitePage";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { ProspectFormDialog } from "@/components/prospects/ProspectFormDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newProspectOpen, setNewProspectOpen] = useState(false);
  const [blockagePanelOpen, setBlockagePanelOpen] = useState(false);
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

  // Redirect legacy routes to parent hubs (no re-render loop, preserves history)
  useEffect(() => {
    const redirects: Record<string, { section: string; tab?: string }> = {
      pipeline: { section: "prospects", tab: "pipeline" },
    };
    const redirect = redirects[activeSection];
    if (redirect) {
      setActiveSection(redirect.section);
      if (redirect.tab) setActiveTab(redirect.tab);
    }
  }, [activeSection]);

  // Listen for navigate-to-alerts event from ProactiveAlertsToast
  useEffect(() => {
    const handleNavigateToAlerts = () => setActiveSection("alertes");
    const handleOpenBlockagePanel = () => setBlockagePanelOpen(true);
    window.addEventListener('navigate-to-alerts', handleNavigateToAlerts);
    window.addEventListener('open-blockage-panel', handleOpenBlockagePanel);
    return () => {
      window.removeEventListener('navigate-to-alerts', handleNavigateToAlerts);
      window.removeEventListener('open-blockage-panel', handleOpenBlockagePanel);
    };
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
      case "aujourdhui":
        return <AujourdhuiPage onNavigate={setActiveSection} />;
      case "contacts":
        return <ApprenantsPage initialContactId={selectedContactId} onContactOpened={handleContactOpened} />;
      case "formations":
        return <FormationsPage />;
      case "sessions":
        return <SessionsPage />;
      case "prospects":
        return <ProspectsPage />;
      case "finances":
        return <FinancesPage />;
      case "automations":
        return <AutomationsPage />;
      case "settings":
        return <SettingsPage />;
      // pipeline is redirected via useEffect above
      case "formateurs":
        return <FormateursPage />;
      case "alertes":
        return <AlertesPage />;
      case "qualite":
        return <QualiteUnifiedPage />;
      case "partenaires":
        return <PartnersPage />;
      case "planning-conduite":
        return <PlanningConduitePage />;
      case "facturation":
        return <FinancesPage />;
      default:
        return <Dashboard onNavigate={setActiveSection} onNavigateWithContact={handleNavigateWithContact} />;
    }
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
    <div className="h-screen bg-background overflow-hidden">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        onNewContact={() => setNewContactOpen(true)}
        onNewProspect={() => setNewProspectOpen(true)}
        onCollapsedChange={setSidebarCollapsed}
      />
      
      <main className={cn(
        "transition-all duration-200 h-full overflow-auto flex flex-col",
        isMobile ? "ml-0" : sidebarCollapsed ? "ml-[60px]" : "ml-[240px]"
      )}>
        <BlockageBanner onOpenPanel={() => setBlockagePanelOpen(true)} />
        <div className="flex-1 overflow-auto">
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
        </div>
      </main>

      <BlockagePanel
        open={blockagePanelOpen}
        onOpenChange={setBlockagePanelOpen}
        onNavigate={setActiveSection}
      />

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
      <ProspectFormDialog open={newProspectOpen} onOpenChange={setNewProspectOpen} />
    </div>
  );
};

export default Index;
