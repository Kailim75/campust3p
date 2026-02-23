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
      {/* Logo zone */}
      <div 
        className="flex items-center gap-3 border-b border-border" 
        style={{ height: '64px', padding: '0 16px' }}
      >
        <div 
          className="flex items-center justify-center flex-shrink-0 bg-primary rounded-lg"
          style={{ width: 36, height: 36 }}
        >
          <span className="text-primary-foreground font-bold text-sm">T3</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <h1 className="text-foreground font-bold text-[15px] leading-tight">
              T3P Campus
            </h1>
            <p className="text-muted-foreground text-[11px] leading-tight">
              Formation Management
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label || 'home'}>
            {!collapsed && group.label && (
              <p className="sidebar-section-label px-3 mb-1.5 mt-1">
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
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {!collapsed && (
                      <span className="animate-fade-in truncate">{item.label}</span>
                    )}
                    {showBadge && (
                      <span 
                        className="absolute flex items-center justify-center bg-destructive text-destructive-foreground font-semibold"
                        style={{
                          fontSize: 10,
                          borderRadius: 99,
                          padding: '1px 6px',
                          right: collapsed ? 0 : 8,
                          top: collapsed ? 0 : 'auto',
                          ...(collapsed ? { width: 16, height: 16 } : {}),
                        }}
                      >
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
      <div className="px-3 py-3 space-y-0.5 border-t border-border">
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
          <Settings className="h-[18px] w-[18px] flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Paramètres</span>}
        </button>
        
        <button
          onClick={() => {
            localStorage.removeItem("crm-onboarding-completed");
            window.location.reload();
          }}
          className="sidebar-item w-full"
        >
          <HelpCircle className="h-[18px] w-[18px] flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Aide</span>}
        </button>
        
        <button
          onClick={() => {
            window.location.href = "/formateur";
            onItemClick?.();
          }}
          className="sidebar-item w-full"
        >
          <ClipboardList className="h-[18px] w-[18px] flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Espace formateur</span>}
        </button>
        
        {canSwitchMode && (
          <button
            onClick={handleSwitchToSuperAdmin}
            className="sidebar-item w-full"
            style={{ border: '1px dashed hsl(var(--border))' }}
          >
            <Shield className="h-[18px] w-[18px] flex-shrink-0" />
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
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 gap-3 bg-card border-b border-border" style={{ height: 56 }}>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0 bg-card border-r border-border">
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
            <div className="flex items-center justify-center bg-primary rounded-lg" style={{ width: 28, height: 28 }}>
              <span className="text-primary-foreground font-bold text-[10px]">T3</span>
            </div>
            <span className="text-foreground font-bold text-sm">T3P Campus</span>
          </div>
        </header>
        <div style={{ height: 56 }} />
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-200 flex flex-col bg-card border-r border-border",
        collapsed ? "w-16" : "w-[250px]"
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
