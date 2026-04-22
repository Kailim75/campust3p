import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/layout/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
// QuickActionsMenu remplacé par GlobalCreateMenu dans le Header (Chantier 1)
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
import { RouteCheckPanel } from "@/components/admin/RouteCheckPanel";
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
  const [routeCheckOpen, setRouteCheckOpen] = useState(false);
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

  // ── DOM custom events (alerts, blockage panel, route check) ───────────────
  useEffect(() => {
    const handleNavigateToAlerts = () => setActiveSection("alertes");
    const handleOpenBlockagePanel = () => setBlockagePanelOpen(true);
    const handleOpenRouteCheck = () => setRouteCheckOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + R → ouvre le panneau de vérification de routage
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setRouteCheckOpen(true);
      }
    };
    window.addEventListener("navigate-to-alerts", handleNavigateToAlerts);
    window.addEventListener("open-blockage-panel", handleOpenBlockagePanel);
    window.addEventListener("open-route-check", handleOpenRouteCheck);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("navigate-to-alerts", handleNavigateToAlerts);
      window.removeEventListener("open-blockage-panel", handleOpenBlockagePanel);
      window.removeEventListener("open-route-check", handleOpenRouteCheck);
      window.removeEventListener("keydown", handleKeyDown);
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

  // handleQuickAction supprimé : la création est gérée par GlobalCreateMenu (Header).

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
    let node: React.ReactNode;
    let pageName: string;
    switch (activeSection) {
      case "dashboard":
        pageName = "Dashboard";
        node = <Dashboard onNavigate={setActiveSection} onNavigateWithContact={handleNavigateWithContact} onNavigateWithParams={handleNavigateWithParams} />;
        break;
      case "aujourdhui":
        pageName = "AujourdhuiPage";
        node = <AujourdhuiPage onNavigate={setActiveSection} />;
        break;
      case "contacts":
        pageName = "ApprenantsPage";
        node = <ApprenantsPage initialContactId={selectedContactId} onContactOpened={handleContactOpened} />;
        break;
      case "formations":
        pageName = "FormationsPage";
        node = <FormationsPage />;
        break;
      case "sessions":
        pageName = "SessionsPage";
        node = <SessionsPage />;
        break;
      case "prospects":
        pageName = "ProspectsPage";
        node = <ProspectsPage />;
        break;
      case "finances":
        pageName = "FinancesPage";
        node = <FinancesPage />;
        break;
      case "automations":
        pageName = "AutomationsPage";
        node = <AutomationsPage />;
        break;
      case "settings":
        pageName = "SettingsPage";
        node = <SettingsPage />;
        break;
      case "formateurs":
        pageName = "FormateursPage";
        node = <FormateursPage />;
        break;
      case "alertes":
        pageName = "AlertesPage";
        node = <AlertesPage />;
        break;
      case "qualite":
        pageName = "QualiteUnifiedPage";
        node = <QualiteUnifiedPage />;
        break;
      case "partenaires":
        pageName = "PartnersPage";
        node = <PartnersPage />;
        break;
      case "planning-conduite":
        pageName = "PlanningConduitePage";
        node = <PlanningConduitePage />;
        break;
      case "security":
        pageName = "SecurityStatusPage";
        node = <SecurityStatusPage />;
        break;
      case "inbox":
        pageName = "InboxCrmPage";
        node = <InboxCrmPage />;
        break;
      case "corbeille":
        pageName = "CorbeillePage";
        node = <CorbeillePage />;
        break;
      default:
        pageName = "Dashboard";
        node = <Dashboard onNavigate={setActiveSection} onNavigateWithContact={handleNavigateWithContact} />;
    }
    return <div data-page={pageName} className="contents">{node}</div>;
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
