import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  CreditCard, 
  Bell, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Landmark,
  Mail,
  HelpCircle,
  Shield,
  Building2,
  ClipboardList,
  CalendarClock,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAllAlerts } from "@/hooks/useAlerts";
import { RecentItemsMenu } from "./RecentItemsMenu";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuGroups = [
  {
    label: "",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Stagiaires",
    items: [
      { id: "contacts", label: "Apprenants", icon: Users },
      { id: "pipeline", label: "Pipeline", icon: ClipboardList },
      { id: "sessions", label: "Sessions", icon: Calendar },
      { id: "planning-conduite", label: "Planning Conduite", icon: CalendarClock },
    ],
  },
  {
    label: "Gestion",
    items: [
      { id: "facturation", label: "Paiements", icon: CreditCard },
      { id: "cockpit-financier", label: "Cockpit Financier", icon: Landmark },
      { id: "partenaires", label: "Partenaires", icon: Building2 },
      { id: "documents", label: "Documents", icon: FileText },
      { id: "communications", label: "Communications", icon: Mail },
    ],
  },
  {
    label: "Rapports",
    items: [
      { id: "rapports", label: "Rapports", icon: BarChart3 },
      { id: "alertes", label: "Alertes", icon: Bell },
    ],
  },
];

const menuItems = menuGroups.flatMap(g => g.items);

function SidebarContent({ 
  activeSection, 
  onSectionChange, 
  collapsed, 
  setCollapsed,
  onItemClick 
}: SidebarProps & { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void;
  onItemClick?: () => void;
}) {
  const { data: alerts } = useAllAlerts();
  const highPriorityAlerts = alerts.filter(a => a.priority === "high").length;
  const { canSwitchMode, setMode } = useAdminMode();
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);

  const handleRecentItemClick = (type: string, id: string) => {
    if (type === "contact") {
      onSectionChange("contacts");
    } else if (type === "session") {
      onSectionChange("sessions");
    } else if (type === "facture") {
      onSectionChange("paiements");
    }
    onItemClick?.();
  };

  const handleSwitchToSuperAdmin = () => {
    setShowSwitchDialog(true);
  };

  const confirmSwitchToSuperAdmin = () => {
    setMode("superadmin");
    setShowSwitchDialog(false);
  };

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 border-b border-border" style={{ height: '64px' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-primary-foreground bg-primary">
          T3
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-semibold text-sm text-foreground tracking-tight">T3P Campus</h1>
            <p className="text-[11px] text-muted-foreground font-normal">FMS</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label || 'home'}>
            {!collapsed && group.label && (
              <p className="sidebar-section-label px-3 mb-1.5 mt-2">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const showBadge = item.id === "alertes" && highPriorityAlerts > 0;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSectionChange(item.id);
                      onItemClick?.();
                    }}
                    className={cn(
                      "sidebar-item w-full relative",
                      isActive && "active"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <span className="animate-fade-in truncate">{item.label}</span>
                    )}
                    {showBadge && (
                      <span className={cn(
                        "absolute flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full",
                        collapsed ? "top-0 right-0 h-4 w-4" : "ml-auto h-5 min-w-5 px-1"
                      )}>
                        {highPriorityAlerts}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border space-y-0.5">
        <RecentItemsMenu 
          onItemClick={handleRecentItemClick}
          collapsed={collapsed}
        />
        
        <button
          onClick={() => {
            onSectionChange("settings");
            onItemClick?.();
          }}
          className={cn(
            "sidebar-item w-full",
            activeSection === "settings" && "active"
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Paramètres</span>}
        </button>
        
        <button
          onClick={() => {
            localStorage.removeItem("crm-onboarding-completed");
            window.location.reload();
          }}
          className="sidebar-item w-full"
        >
          <HelpCircle className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Aide</span>}
        </button>
        
        <button
          onClick={() => {
            window.location.href = "/formateur";
            onItemClick?.();
          }}
          className="sidebar-item w-full"
        >
          <ClipboardList className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Espace formateur</span>}
        </button>
        
        {canSwitchMode && (
          <button
            onClick={handleSwitchToSuperAdmin}
            className="sidebar-item w-full border border-dashed border-border hover:border-primary/40 hover:bg-primary/5"
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="animate-fade-in text-xs font-medium">Super Admin</span>}
          </button>
        )}
        
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-item w-full justify-center mt-1 hidden md:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="animate-fade-in">Réduire</span>
              </>
            )}
          </button>
        )}
      </div>

      <AlertDialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Basculer vers l'espace Super Admin ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez accéder à l'interface de pilotage global de la plateforme CampusT3P. 
              Cette vue est réservée aux administrateurs de l'éditeur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitchToSuperAdmin} className="bg-primary">
              Accéder au pilotage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center px-4 gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-card border-border">
              <div className="flex flex-col h-full">
                <SidebarContent
                  activeSection={activeSection}
                  onSectionChange={onSectionChange}
                  collapsed={false}
                  setCollapsed={() => {}}
                  onItemClick={() => setMobileOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-primary-foreground bg-primary">
              T3
            </div>
            <span className="font-semibold text-foreground text-sm">T3P Campus</span>
          </div>
        </header>
        <div className="h-14" />
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-200 flex flex-col",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <SidebarContent
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
    </aside>
  );
}
