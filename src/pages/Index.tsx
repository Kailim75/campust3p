import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/layout/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { QuickActionsMenu, QuickAction } from "@/components/layout/QuickActionsMenu";
import { KeyboardShortcutsDialog } from "@/components/layout/KeyboardShortcutsDialog";
import { ProactiveAlertsToast } from "@/components/layout/ProactiveAlertsToast";
import { OnboardingTour, useOnboarding } from "@/components/onboarding/OnboardingTour";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { useGlobalShortcutsV2 } from "@/hooks/useKeyboardShortcuts";
import { ShortcutSequenceIndicator } from "@/components/shortcuts/ShortcutSequenceIndicator";
import { useUndoStore } from "@/hooks/useUndoAction";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useGlobalCreate } from "@/hooks/useGlobalCreate";
import { useShortcutsDialog } from "@/hooks/useShortcutsDialog";
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
import { SecurityStatusPage } from "@/components/admin/SecurityStatusPage";
import { InboxCrmPage } from "@/components/inbox/InboxCrmPage";
import { CorbeillePage } from "@/components/corbeille/CorbeillePage";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { ProspectFormDialog } from "@/components/prospects/ProspectFormDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// ─── URL ↔ Section mapping ────────────────────────────────────────────────────
// Bidirectional map: pathname segment → section key
const PATH_TO_SECTION: Record<string, string> = {
  "": "dashboard",
  "dashboard": "dashboard",
  "aujourdhui": "aujourdhui",
  "contacts": "contacts",
  "apprenants": "contacts",        // legacy alias
  "formations": "formations",
  "sessions": "sessions",
  "prospects": "prospects",
  "finances": "finances",
  "facturation": "finances",       // legacy alias
  "paiements": "finances",         // legacy alias
  "inbox": "inbox",
  "automations": "automations",
  "settings": "settings",
  "parametres": "settings",        // alias français
  "formateurs": "formateurs",
  "alertes": "alertes",
  "qualite": "qualite",
  "partenaires": "partenaires",
  "planning-conduite": "planning-conduite",
  "security": "security",
  
  "corbeille": "corbeille",
};

const SECTION_TO_PATH: Record<string, string> = {
  "dashboard": "/",
  "aujourdhui": "/aujourdhui",
  "contacts": "/contacts",
  "formations": "/formations",
  "sessions": "/sessions",
  "prospects": "/prospects",
  "finances": "/finances",
  "inbox": "/inbox",
  "automations": "/automations",
  "settings": "/settings",
  "formateurs": "/formateurs",
  "alertes": "/alertes",
  "qualite": "/qualite",
  "partenaires": "/partenaires",
  "planning-conduite": "/planning-conduite",
  "security": "/security",
  
  "corbeille": "/corbeille",
};

// Legacy redirect map: old section key → {section, tab?}
const LEGACY_REDIRECTS: Record<string, { section: string; tab?: string }> = {
  pipeline: { section: "prospects", tab: "pipeline" },
  "prospects-agenda": { section: "prospects", tab: "agenda" },
};

/** Derive section from current pathname */
function getSectionFromPathname(pathname: string): string | null {
  const segment = pathname.replace(/^\//, "").split("/")[0];
  return PATH_TO_SECTION[segment] ?? null;
}

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive initial section: pathname first, then ?section= param (legacy), then dashboard
  const getInitialSection = (): string => {
    const fromPath = getSectionFromPathname(location.pathname);
    if (fromPath) return fromPath;
    const fromParam = searchParams.get("section");
    if (fromParam && PATH_TO_SECTION[fromParam] !== undefined) return fromParam;
    return "dashboard";
  };

  const [activeSection, setActiveSectionState] = useState<string>(getInitialSection);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const shortcutsDialogOpen = useShortcutsDialog((s) => s.isOpen);
  const setShortcutsDialogOpen = useShortcutsDialog((s) => s.setOpen);
  const commandPaletteOpen = useCommandPalette((s) => s.isOpen);
  const setCommandPaletteOpen = useCommandPalette((s) => s.setOpen);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newProspectOpen, setNewProspectOpen] = useState(false);
  const [blockagePanelOpen, setBlockagePanelOpen] = useState(false);
  const isMobile = useIsMobile();
  const { showTour, completeTour } = useOnboarding();
  const undoAction = useUndoStore((state) => state.undoLast);

  /** Core navigation: updates state + URL pathname */
  const setActiveSection = useCallback((section: string) => {
    // Resolve legacy redirects before navigating
    const redirect = LEGACY_REDIRECTS[section];
    if (redirect) {
      setActiveSectionState(redirect.section);
      if (redirect.tab) setActiveTab(redirect.tab);
      const path = SECTION_TO_PATH[redirect.section] ?? "/";
      navigate(path, { replace: true });
      return;
    }
    setActiveSectionState(section);
    const path = SECTION_TO_PATH[section] ?? "/";
    // Only push to history if the path is different (avoid duplicate entries)
    if (location.pathname !== path) {
      navigate(path);
    }
  }, [navigate, location.pathname]);

  // ── Sync: browser Back/Forward → activeSection ─────────────────────────────
  useEffect(() => {
    const section = getSectionFromPathname(location.pathname);
    if (section && section !== activeSection) {
      setActiveSectionState(section);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ── Legacy: consume ?section= and ?contactId= search params ───────────────
  useEffect(() => {
    const section = searchParams.get("section");
    const contactId = searchParams.get("contactId");

    if (section) {
      setActiveSection(section);
    }
    if (contactId) {
      setSelectedContactId(contactId);
    }

    // Clean params from URL after consuming
    if (section || contactId) {
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      next.delete("contactId");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Global undo Ctrl+Z ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
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

  // ── Register global Header handlers (Chantier 1: unified create menu) ─────
  const registerGlobalCreate = useGlobalCreate((s) => s.register);
  useEffect(() => {
    registerGlobalCreate({
      onNewContact: () => setNewContactOpen(true),
      onNewProspect: () => setNewProspectOpen(true),
      onNavigate: setActiveSection,
    });
  }, [registerGlobalCreate, setActiveSection]);

  // ── DOM custom events (alerts, blockage panel) ────────────────────────────
  useEffect(() => {
    const handleNavigateToAlerts = () => setActiveSection("alertes");
    const handleOpenBlockagePanel = () => setBlockagePanelOpen(true);
    window.addEventListener("navigate-to-alerts", handleNavigateToAlerts);
    window.addEventListener("open-blockage-panel", handleOpenBlockagePanel);
    return () => {
      window.removeEventListener("navigate-to-alerts", handleNavigateToAlerts);
      window.removeEventListener("open-blockage-panel", handleOpenBlockagePanel);
    };
  }, [setActiveSection]);

  // ── Global keyboard shortcuts (Cmd+K, ?, G+letter, N+letter) ──────────────
  useGlobalShortcutsV2({
    onSearch: () => setCommandPaletteOpen(true),
    onHelp: () => setShortcutsDialogOpen(true),
    // Navigation
    onGoDashboard:  () => setActiveSection("dashboard"),
    onGoApprenants: () => setActiveSection("contacts"),
    onGoProspects:  () => setActiveSection("prospects"),
    onGoSessions:   () => setActiveSection("sessions"),
    onGoFinances:   () => setActiveSection("finances"),
    onGoFormations: () => setActiveSection("formations"),
    onGoInbox:      () => setActiveSection("inbox"),
    onGoSettings:   () => setActiveSection("settings"),
    // Creation
    onNewApprenant: () => setNewContactOpen(true),
    onNewProspect:  () => setNewProspectOpen(true),
    onNewSession:   () => setActiveSection("sessions"),
    onNewFacture:   () => setActiveSection("finances"),
    onNewFormation: () => setActiveSection("formations"),
  });

  const handleQuickAction = (action: QuickAction) => {
    switch (action) {
      case "contact":      setActiveSection("contacts"); break;
      case "session":      setActiveSection("sessions"); break;
      case "inscription":  setActiveSection("sessions"); break;
      case "paiement":     setActiveSection("finances"); break;
      case "document":     setActiveSection("sessions"); break;
      case "communication":setActiveSection("contacts"); break;
    }
  };

  const handleNavigateWithContact = (section: string, contactId?: string) => {
    setActiveSection(section);
    if (contactId) setSelectedContactId(contactId);
  };

  const handleContactOpened = () => setSelectedContactId(null);

  const handleNavigateWithParams = (section: string, params: Record<string, string>) => {
    setActiveSection(section);
    if (params.tab) setActiveTab(params.tab);
    const next = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([k, v]) => next.set(k, v));
    setSearchParams(next, { replace: true });
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveSection} onNavigateWithContact={handleNavigateWithContact} onNavigateWithParams={handleNavigateWithParams} />;
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
      case "security":
        return <SecurityStatusPage />;
      case "inbox":
        return <InboxCrmPage />;
      case "corbeille":
        return <CorbeillePage />;
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

      {/* QuickActionsMenu retiré : la création est centralisée dans le bouton "Créer" du Header (Chantier 1). */}
      <ProactiveAlertsToast />
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
      <OnboardingTour isOpen={showTour} onComplete={completeTour} />
      <OnboardingChecklist />
      <ContactFormDialog open={newContactOpen} onOpenChange={setNewContactOpen} />
      <ProspectFormDialog open={newProspectOpen} onOpenChange={setNewProspectOpen} />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={setActiveSection}
        onOpenContact={(id) => { setActiveSection("contacts"); setSelectedContactId(id); }}
        onNewContact={() => setNewContactOpen(true)}
        onNewProspect={() => setNewProspectOpen(true)}
      />
      <ShortcutSequenceIndicator />
    </div>
  );
};

export default Index;
