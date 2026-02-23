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
  Plus,
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
    if (type === "contact") onSectionChange("contacts");
    else if (type === "session") onSectionChange("sessions");
    else if (type === "facture") onSectionChange("paiements");
    onItemClick?.();
  };

  const confirmSwitchToSuperAdmin = () => {
    setMode("superadmin");
    setShowSwitchDialog(false);
  };

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-4" style={{ height: '60px' }}>
        <div className="flex items-center justify-center flex-shrink-0 bg-primary rounded-lg" style={{ width: 32, height: 32 }}>
          <span className="text-primary-foreground font-bold text-xs">T3</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <h1 className="text-foreground font-bold text-sm leading-none">T3P Campus</h1>
          </div>
        )}
      </div>

      {/* Quick Add Button */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <Button 
            onClick={() => { onSectionChange("contacts"); onItemClick?.(); }}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-9 text-[13px] font-medium"
          >
            <Plus className="h-4 w-4" />
            Nouveau stagiaire
          </Button>
        </div>
      )}
      {collapsed && (
        <div className="px-2 pt-3">
          <Button
            onClick={() => { onSectionChange("contacts"); onItemClick?.(); }}
            size="icon"
            className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-3 overflow-y-auto mt-1">
        {menuGroups.map((group) => (
          <div key={group.label || 'home'}>
            {!collapsed && group.label && (
              <p className="sidebar-section-label px-3 mb-1 mt-1">{group.label}</p>
            )}
            <div className="space-y-px">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const showBadge = item.id === "alertes" && highPriorityAlerts > 0;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => { onSectionChange(item.id); onItemClick?.(); }}
                    className={cn("sidebar-item w-full relative", isActive && "active")}
                  >
                    <Icon className="h-[17px] w-[17px] flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {showBadge && (
                      <span className="absolute flex items-center justify-center bg-destructive text-destructive-foreground font-semibold rounded-full text-[9px]"
                        style={{ padding: '1px 5px', right: collapsed ? 2 : 8, top: collapsed ? 2 : 'auto' }}>
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
      <div className="px-2 py-2 space-y-px border-t border-border">
        <RecentItemsMenu onItemClick={handleRecentItemClick} collapsed={collapsed} />
        
        <button
          onClick={() => { onSectionChange("settings"); onItemClick?.(); }}
          className={cn("sidebar-item w-full", activeSection === "settings" && "active")}
        >
          <Settings className="h-[17px] w-[17px] flex-shrink-0" />
          {!collapsed && <span>Paramètres</span>}
        </button>
        
        <button onClick={() => { localStorage.removeItem("crm-onboarding-completed"); window.location.reload(); }} className="sidebar-item w-full">
          <HelpCircle className="h-[17px] w-[17px] flex-shrink-0" />
          {!collapsed && <span>Aide</span>}
        </button>
        
        <button onClick={() => { window.location.href = "/formateur"; onItemClick?.(); }} className="sidebar-item w-full">
          <ClipboardList className="h-[17px] w-[17px] flex-shrink-0" />
          {!collapsed && <span>Espace formateur</span>}
        </button>
        
        {canSwitchMode && (
          <button onClick={() => setShowSwitchDialog(true)} className="sidebar-item w-full" style={{ border: '1px dashed hsl(var(--border))' }}>
            <Shield className="h-[17px] w-[17px] flex-shrink-0" />
            {!collapsed && <span className="text-xs font-medium">Super Admin</span>}
          </button>
        )}
        
        {setCollapsed && (
          <button onClick={() => setCollapsed(!collapsed)} className="sidebar-item w-full justify-center mt-1 hidden md:flex">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : (
              <><ChevronLeft className="h-4 w-4" /><span>Réduire</span></>
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitchToSuperAdmin} className="bg-primary">Accéder au pilotage</AlertDialogAction>
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
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 gap-3 bg-card border-b border-border" style={{ height: 52 }}>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0 bg-card border-r border-border">
              <div className="flex flex-col h-full">
                <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} collapsed={false} setCollapsed={() => {}} onItemClick={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center bg-primary rounded-lg" style={{ width: 26, height: 26 }}>
              <span className="text-primary-foreground font-bold text-[9px]">T3</span>
            </div>
            <span className="text-foreground font-semibold text-sm">T3P Campus</span>
          </div>
        </header>
        <div style={{ height: 52 }} />
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-200 flex flex-col bg-card border-r border-border",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} collapsed={collapsed} setCollapsed={setCollapsed} />
    </aside>
  );
}
