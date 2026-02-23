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
      {/* Logo zone — height 68px */}
      <div 
        className="flex items-center gap-3 px-5" 
        style={{ 
          height: '68px', 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '0 18px',
        }}
      >
        <div 
          className="flex items-center justify-center flex-shrink-0"
          style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 12, 
            background: 'rgba(255,255,255,0.15)', 
            border: '1.5px solid rgba(255,255,255,0.25)',
          }}
        >
          <span style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 16, color: '#FFFFFF' }}>T3</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <h1 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 15.5, color: '#FFFFFF', lineHeight: 1.2 }}>
              T3P Campus
            </h1>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
              Formation Management
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-3 overflow-y-auto">
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
                      <span 
                        className="absolute flex items-center justify-center text-white font-bold"
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          fontFamily: 'Nunito',
                          fontWeight: 800,
                          fontSize: 10,
                          borderRadius: 99,
                          padding: '2px 8px',
                          right: collapsed ? 0 : 12,
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
      <div className="px-2.5 py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
            className="sidebar-item w-full"
            style={{ border: '1px dashed rgba(255,255,255,0.2)' }}
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
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 gap-3" style={{
          height: 56,
          background: '#1E5068',
        }}>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[230px] p-0" style={{ background: '#1E5068', border: 'none' }}>
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
            <div 
              className="flex items-center justify-center"
              style={{ 
                width: 28, height: 28, borderRadius: 8, 
                background: 'rgba(255,255,255,0.15)', 
                border: '1.5px solid rgba(255,255,255,0.25)' 
              }}
            >
              <span style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 11, color: '#FFFFFF' }}>T3</span>
            </div>
            <span style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 14, color: '#FFFFFF' }}>T3P Campus</span>
          </div>
        </header>
        <div style={{ height: 56 }} />
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-200 flex flex-col",
        collapsed ? "w-16" : "w-[230px]"
      )}
      style={{
        background: '#1E5068',
        backgroundImage: 
          'radial-gradient(ellipse at 10% 90%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 90% 10%, rgba(255,255,255,0.03) 0%, transparent 50%)',
      }}
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
