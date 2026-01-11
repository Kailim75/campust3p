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
  Car
} from "lucide-react";
import { useState } from "react";

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
  { id: "alertes", label: "Alertes", icon: Bell },
];

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
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
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "sidebar-item w-full",
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

      {/* Settings & Collapse */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => onSectionChange("settings")}
          className={cn(
            "sidebar-item w-full",
            activeSection === "settings" && "active"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="animate-fade-in">Paramètres</span>}
        </button>
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-item w-full justify-center mt-2"
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
      </div>
    </aside>
  );
}
