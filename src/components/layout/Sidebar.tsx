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
  X,
  Mail
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAllAlerts } from "@/hooks/useAlerts";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "formations", label: "Formations", icon: GraduationCap },
  { id: "sessions", label: "Sessions", icon: Calendar },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "paiements", label: "Paiements", icon: CreditCard },
  { id: "communications", label: "Communications", icon: Mail },
  { id: "alertes", label: "Alertes", icon: Bell },
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

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
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
      </nav>

      {/* Settings & Collapse */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
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
