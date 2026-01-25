import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Building2, 
  TrendingUp, 
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Shield,
  Users,
  BarChart3,
  Activity,
  ArrowLeftRight,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

interface SuperAdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "centres", label: "Centres", icon: Building2 },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "usage", label: "Usage produit", icon: BarChart3 },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "alerts", label: "Alertes & Risques", icon: AlertTriangle },
  { id: "activity", label: "Activité", icon: Activity },
  { id: "gdpr", label: "RGPD", icon: Shield },
];

function SidebarContent({ 
  activeSection, 
  onSectionChange, 
  collapsed, 
  setCollapsed,
  onItemClick 
}: SuperAdminSidebarProps & { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void;
  onItemClick?: () => void;
}) {
  const { setMode, canSwitchMode } = useAdminMode();
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);

  const handleSwitchToCentre = () => {
    setShowSwitchDialog(true);
  };

  const confirmSwitchToCentre = () => {
    setMode("centre");
    setShowSwitchDialog(false);
  };

  return (
    <>
      {/* Logo & Super Admin Badge */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-superadmin-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-superadmin-primary">
          <Shield className="h-5 w-5 text-superadmin-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-display font-bold text-superadmin-foreground">CampusT3P</h1>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-superadmin-accent text-superadmin-accent-foreground uppercase tracking-wider">
                Super Admin
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onSectionChange(item.id);
                onItemClick?.();
              }}
              className={cn(
                "superadmin-sidebar-item w-full relative",
                isActive && "active"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings & Switch Mode */}
      <div className="px-3 py-4 border-t border-superadmin-border space-y-1">
        <button
          onClick={() => {
            onSectionChange("settings");
            onItemClick?.();
          }}
          className={cn(
            "superadmin-sidebar-item w-full",
            activeSection === "settings" && "active"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Configuration</span>}
        </button>
        
        {/* Switch to Centre Mode */}
        {canSwitchMode && (
          <button
            onClick={handleSwitchToCentre}
            className="superadmin-sidebar-item w-full text-superadmin-muted hover:text-superadmin-foreground"
          >
            <ArrowLeftRight className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="animate-fade-in">Espace Centre</span>}
          </button>
        )}
        
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="superadmin-sidebar-item w-full justify-center mt-2 hidden md:flex"
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
            <AlertDialogTitle>Basculer vers l'espace Centre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez quitter l'espace Super Admin pour accéder à l'interface de gestion Centre. 
              Vous pourrez revenir à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitchToCentre}>
              Basculer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function SuperAdminSidebar({ activeSection, onSectionChange }: SuperAdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Header with Burger */}
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-superadmin-sidebar border-b border-superadmin-border flex items-center px-4 gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-superadmin-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-superadmin-sidebar border-superadmin-border">
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-superadmin-primary">
              <Shield className="h-4 w-4 text-superadmin-primary-foreground" />
            </div>
            <span className="font-display font-bold text-superadmin-foreground">Super Admin</span>
          </div>
        </header>
      </>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-superadmin-sidebar transition-all duration-300 flex flex-col",
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
