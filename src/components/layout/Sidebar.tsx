import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, Calendar, FileText, CreditCard, Bell, Settings,
  ChevronLeft, ChevronRight, Menu, Landmark, Mail, HelpCircle, Shield,
  Building2, ClipboardList, CalendarClock, BarChart3, Plus, Headphones, User,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAllAlerts } from "@/hooks/useAlerts";
import { RecentItemsMenu } from "./RecentItemsMenu";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { useAuth } from "@/hooks/useAuth";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuGroups = [
  {
    label: "Formation",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
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
      { id: "settings", label: "Paramètres", icon: Settings },
    ],
  },
];

function SidebarContent({ 
  activeSection, onSectionChange, collapsed, setCollapsed, onItemClick 
}: SidebarProps & { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void;
  onItemClick?: () => void;
}) {
  const { data: alerts } = useAllAlerts();
  const highPriorityAlerts = alerts.filter(a => a.priority === "high").length;
  const { canSwitchMode, setMode } = useAdminMode();
  const { user } = useAuth();
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

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "?";

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 border-b border-white/8" style={{ height: '60px' }}>
        <div className="flex items-center justify-center flex-shrink-0 rounded-full" 
          style={{ width: 34, height: 34, background: 'hsl(173 58% 39%)' }}>
          <span className="text-white font-bold text-xs">CF</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <h1 className="text-white font-semibold text-sm leading-none tracking-tight">CRM Formation</h1>
          </div>
        )}
      </div>

      {/* CTA Button */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-1">
          <button 
            onClick={() => { onSectionChange("contacts"); onItemClick?.(); }}
            className="btn-cta w-full flex items-center justify-center gap-2 h-10 text-[13px]"
          >
            <Plus className="h-4 w-4" />
            Nouveau stagiaire
          </button>
        </div>
      )}
      {collapsed && (
        <div className="px-2 pt-4 pb-1">
          <button
            onClick={() => { onSectionChange("contacts"); onItemClick?.(); }}
            className="btn-cta w-full flex items-center justify-center h-9 rounded-lg"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && group.label && (
              <p className="sidebar-section-label px-3 mb-2">{group.label}</p>
            )}
            <div className="space-y-0.5">
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
      <div className="px-3 py-3 space-y-0.5 border-t border-white/8">
        <RecentItemsMenu onItemClick={handleRecentItemClick} collapsed={collapsed} />
        
        <button onClick={() => { localStorage.removeItem("crm-onboarding-completed"); window.location.reload(); }} className="sidebar-item w-full">
          <HelpCircle className="h-[17px] w-[17px] flex-shrink-0" />
          {!collapsed && <span>Aide</span>}
        </button>
        
        <button onClick={() => { window.open("mailto:support@campust3p.fr"); }} className="sidebar-item w-full">
          <Headphones className="h-[17px] w-[17px] flex-shrink-0" />
          {!collapsed && <span>Support</span>}
        </button>

        <button onClick={() => { window.location.href = "/formateur"; onItemClick?.(); }} className="sidebar-item w-full">
          <ClipboardList className="h-[17px] w-[17px] flex-shrink-0" />
          {!collapsed && <span>Espace formateur</span>}
        </button>
        
        {canSwitchMode && (
          <button onClick={() => setShowSwitchDialog(true)} className="sidebar-item w-full" style={{ border: '1px dashed rgba(255,255,255,0.15)' }}>
            <Shield className="h-[17px] w-[17px] flex-shrink-0" />
            {!collapsed && <span className="text-xs font-medium">Super Admin</span>}
          </button>
        )}

        {/* User profile */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-center rounded-full bg-white/10" style={{ width: 32, height: 32 }}>
            <User className="h-4 w-4 text-white/70" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user?.email || "Utilisateur"}</p>
              <p className="text-white/40 text-[10px]">Administrateur</p>
            </div>
          )}
        </div>
        
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
            <AlertDialogAction onClick={confirmSwitchToSuperAdmin} className="bg-cta text-cta-foreground hover:bg-cta-hover">Accéder au pilotage</AlertDialogAction>
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
            <SheetContent side="left" className="w-[260px] p-0 sidebar-dark border-r-0">
              <div className="flex flex-col h-full">
                <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} collapsed={false} setCollapsed={() => {}} onItemClick={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: 'hsl(173 58% 39%)' }}>
              <span className="text-white font-bold text-[9px]">CF</span>
            </div>
            <span className="text-foreground font-semibold text-sm">CRM Formation</span>
          </div>
        </header>
        <div style={{ height: 52 }} />
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-200 flex flex-col sidebar-dark",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
      style={{ borderRadius: '0 16px 16px 0', boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}
    >
      <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} collapsed={collapsed} setCollapsed={setCollapsed} />
    </aside>
  );
}