import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/layout/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { QuickActionsMenu, QuickAction } from "@/components/layout/QuickActionsMenu";
import { KeyboardShortcutsDialog } from "@/components/layout/KeyboardShortcutsDialog";
import { ProactiveAlertsToast } from "@/components/layout/ProactiveAlertsToast";
import { OnboardingTour, useOnboarding } from "@/components/onboarding/OnboardingTour";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUndoStore } from "@/hooks/useUndoAction";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { BlockageBanner } from "@/components/blockage/BlockageBanner";
import { BlockagePanel } from "@/components/blockage/BlockagePanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const DashboardSection = lazy(() =>
  import("@/components/dashboard/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const AujourdhuiSection = lazy(() =>
  import("@/components/aujourdhui/AujourdhuiPage").then((m) => ({ default: m.AujourdhuiPage }))
);
const ContactsSection = lazy(() =>
  import("@/components/apprenants/ApprenantsPage").then((m) => ({ default: m.ApprenantsPage }))
);
const FormationsSection = lazy(() =>
  import("@/components/formations/FormationsPage").then((m) => ({ default: m.FormationsPage }))
);
const SessionsSection = lazy(() =>
  import("@/components/sessions/SessionsPage").then((m) => ({ default: m.SessionsPage }))
);
const ProspectsSection = lazy(() =>
  import("@/components/prospects/ProspectsPage").then((m) => ({ default: m.ProspectsPage }))
);
const FinancesSection = lazy(() =>
  import("@/components/finances/FinancesPage").then((m) => ({ default: m.FinancesPage }))
);
const AutomationsSection = lazy(() =>
  import("@/components/automations/AutomationsPage").then((m) => ({ default: m.AutomationsPage }))
);
const SettingsSection = lazy(() =>
  import("@/components/settings/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const AlertesSection = lazy(() =>
  import("@/components/alertes/AlertesPage").then((m) => ({ default: m.AlertesPage }))
);
const QualiteSection = lazy(() =>
  import("@/components/qualite/QualiteUnifiedPage").then((m) => ({ default: m.QualiteUnifiedPage }))
);
const PartnersSection = lazy(() =>
  import("@/components/partners/PartnersPage").then((m) => ({ default: m.PartnersPage }))
);
const FormateursSection = lazy(() =>
  import("@/components/formateurs/FormateursPage").then((m) => ({ default: m.FormateursPage }))
);
const PlanningConduiteSection = lazy(() =>
  import("@/components/planning-conduite/PlanningConduitePage").then((m) => ({
    default: m.PlanningConduitePage,
  }))
);
const SecuritySection = lazy(() =>
  import("@/components/admin/SecurityStatusPage").then((m) => ({ default: m.SecurityStatusPage }))
);
const InboxSection = lazy(() =>
  import("@/components/inbox/InboxCrmPage").then((m) => ({ default: m.InboxCrmPage }))
);
const CorbeilleSection = lazy(() =>
  import("@/components/corbeille/CorbeillePage").then((m) => ({ default: m.CorbeillePage }))
);
const ContactFormDialog = lazy(() =>
  import("@/components/contacts/ContactFormDialog").then((m) => ({ default: m.ContactFormDialog }))
);
const ProspectFormDialog = lazy(() =>
  import("@/components/prospects/ProspectFormDialog").then((m) => ({
    default: m.ProspectFormDialog,
  }))
);

function SectionFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

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
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newProspectOpen, setNewProspectOpen] = useState(false);
  const [blockagePanelOpen, setBlockagePanelOpen] = useState(false);
  const isMobile = useIsMobile();
  const { showTour, completeTour } = useOnboarding();
  const undoAction = useUndoStore((state) => state.undo);

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

    // Accept legacy aliases from shared components and normalize them to the
    // canonical app section key before updating local state or URL.
    const normalizedSection = PATH_TO_SECTION[section] ?? section;

    setActiveSectionState(normalizedSection);
    const path = SECTION_TO_PATH[normalizedSection] ?? "/";
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

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useGlobalShortcuts({
    onNewContact: () => setActiveSection("contacts"),
    onNewSession: () => setActiveSection("sessions"),
    onNewPayment: () => setActiveSection("finances"),
    onSearch: () => setCommandPaletteOpen(true),
    onHelp: () => setShortcutsDialogOpen(true),
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
        return <DashboardSection onNavigate={setActiveSection} onNavigateWithContact={handleNavigateWithContact} onNavigateWithParams={handleNavigateWithParams} />;
      case "aujourdhui":
        return <AujourdhuiSection onNavigate={setActiveSection} />;
      case "contacts":
        return <ContactsSection initialContactId={selectedContactId} onContactOpened={handleContactOpened} />;
      case "formations":
        return <FormationsSection />;
      case "sessions":
        return <SessionsSection />;
      case "prospects":
        return <ProspectsSection />;
      case "finances":
        return <FinancesSection />;
      case "automations":
        return <AutomationsSection />;
      case "settings":
        return <SettingsSection />;
      case "formateurs":
        return <FormateursSection />;
      case "alertes":
        return <AlertesSection />;
      case "qualite":
        return <QualiteSection />;
      case "partenaires":
        return <PartnersSection />;
      case "planning-conduite":
        return <PlanningConduiteSection />;
      case "security":
        return <SecuritySection />;
      case "inbox":
        return <InboxSection />;
      case "corbeille":
        return <CorbeilleSection />;
      default:
        return <DashboardSection onNavigate={setActiveSection} onNavigateWithContact={handleNavigateWithContact} />;
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
              <Suspense fallback={<SectionFallback />}>
                {renderContent()}
              </Suspense>
            </PageTransition>
          </NavigationProvider>
        </div>
      </main>

      <BlockagePanel
        open={blockagePanelOpen}
        onOpenChange={setBlockagePanelOpen}
        onNavigate={setActiveSection}
      />

      <QuickActionsMenu onAction={handleQuickAction} />
      <ProactiveAlertsToast />
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
      <OnboardingTour isOpen={showTour} onComplete={completeTour} />
      {newContactOpen && (
        <Suspense fallback={null}>
          <ContactFormDialog open={newContactOpen} onOpenChange={setNewContactOpen} />
        </Suspense>
      )}
      {newProspectOpen && (
        <Suspense fallback={null}>
          <ProspectFormDialog open={newProspectOpen} onOpenChange={setNewProspectOpen} />
        </Suspense>
      )}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={setActiveSection}
        onOpenContact={(id) => { setActiveSection("contacts"); setSelectedContactId(id); }}
      />
    </div>
  );
};

export default Index;
