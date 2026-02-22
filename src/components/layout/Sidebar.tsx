import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  FileText, 
  CreditCard, 
  Bell, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Car,
  Menu,
  Landmark,
  Mail,
  User,
  Award,
  HelpCircle,
  BookOpen,
  Shield,
  Building2,
  ClipboardList,
  CalendarClock,
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

// Grouped menu structure for better UX
const menuGroups = [
  {
    label: "Accueil",
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    ],
  },
  {
    label: "Stagiaires",
    items: [
      { id: "contacts", label: "Contacts", icon: Users },
      { id: "sessions", label: "Sessions", icon: Calendar },
      { id: "planning", label: "Planning Conduite", icon: CalendarClock },
    ],
  },
  {
    label: "Formations",
    items: [
      { id: "formations", label: "Catalogue", icon: GraduationCap },
      { id: "elearning", label: "E-Learning", icon: BookOpen },
      { id: "formateurs", label: "Formateurs", icon: User },
    ],
  },
  {
    label: "Gestion",
    items: [
      { id: "documents", label: "Documents", icon: FileText },
      { id: "facturation", label: "Facturation", icon: CreditCard },
      { id: "cockpit-financier", label: "Cockpit Financier", icon: Landmark },
      { id: "partenaires", label: "Partenaires", icon: Building2 },
      { id: "communications", label: "Communications", icon: Mail },
    ],
  },
  {
    label: "Qualité",
    items: [
      { id: "qualite", label: "Qualiopi", icon: Award },
      { id: "alertes", label: "Alertes", icon: Bell },
    ],
  },
];

// Flat list for backward compatibility
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
    // Navigate to appropriate section with the item
    if (type === "contact") {
      onSectionChange("contacts");
      // Optionally could emit event to open contact detail
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
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
          <Car className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-display font-bold text-sidebar-foreground">T3P Formation</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestion CRM</p>
          </div>
        )}
      </div>

      {/* Navigation - Grouped */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
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
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="animate-fade-in truncate">{item.label}</span>
                    )}
                    {showBadge && (
                      <span className={cn(
                        "absolute flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full",
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

      {/* Settings & Collapse */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {/* Recent Items Menu */}
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
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Paramètres</span>}
        </button>
        
        {/* Help button to restart tour */}
        <button
          onClick={() => {
            localStorage.removeItem("crm-onboarding-completed");
            window.location.reload();
          }}
          className="sidebar-item w-full text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Aide</span>}
        </button>
        
        {/* Formateur Space */}
        <button
          onClick={() => {
            window.location.href = "/formateur";
            onItemClick?.();
          }}
          className="sidebar-item w-full text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <ClipboardList className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Espace formateur</span>}
        </button>
        
        {/* Super Admin Switch - Only visible for super admins */}
        {canSwitchMode && (
          <button
            onClick={handleSwitchToSuperAdmin}
            className="sidebar-item w-full text-sidebar-foreground/60 hover:text-sidebar-foreground border border-dashed border-sidebar-border/50 hover:border-sidebar-primary/50 hover:bg-sidebar-primary/10"
          >
            <Shield className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="animate-fade-in text-xs font-medium">Espace Super Admin</span>}
          </button>
        )}
        
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-item w-full justify-center mt-2 hidden md:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="animate-fade-in">Réduire</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Switch Confirmation Dialog */}
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

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Header with Burger */}
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Car className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sidebar-foreground">T3P</span>
          </div>
        </header>
        
        {/* Spacer for fixed header */}
        <div className="h-14" />
      </>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
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
