import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, Calendar, CreditCard, Settings,
  ChevronLeft, ChevronRight, Menu, HelpCircle, Shield,
  ClipboardList, Plus, UserPlus, Zap, LogOut, GraduationCap,
  MoreHorizontal, Bell, Award, Handshake, Car, UserCog,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { RecentItemsMenu } from "./RecentItemsMenu";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { useAuth } from "@/hooks/useAuth";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onNewContact?: () => void;
  onNewProspect?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "prospects", label: "Prospects", icon: UserPlus },
  { id: "contacts", label: "Apprenants", icon: Users },
  { id: "sessions", label: "Sessions", icon: Calendar },
  { id: "formations", label: "Catalogue", icon: GraduationCap },
  { id: "finances", label: "Finances", icon: CreditCard },
  { id: "automations", label: "Automations", icon: Zap },
];

const moreMenuItems = [
  { id: "formateurs", label: "Formateurs", icon: UserCog },
  { id: "planning-conduite", label: "Planning conduite", icon: Car },
  { id: "alertes", label: "Alertes", icon: Bell },
  { id: "qualite", label: "Qualité", icon: Award },
  { id: "partenaires", label: "Partenaires", icon: Handshake },
];

/** Wraps children in a Tooltip when sidebar is collapsed */
function SidebarTooltipItem({ collapsed, label, children }: { collapsed: boolean; label: string; children: React.ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="bg-[hsl(222_47%_18%)] text-white/90 border-white/10 text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarContent({ 
  activeSection, onSectionChange, onNewContact, onNewProspect, collapsed, setCollapsed, onItemClick 
}: SidebarProps & { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void;
  onItemClick?: () => void;
}) {
  const { canSwitchMode, setMode } = useAdminMode();
  const { user, signOut } = useAuth();
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [userRole, setUserRole] = useState<string>("Utilisateur");

  useEffect(() => {
    if (!user?.id) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data?.role) {
            const roleLabels: Record<string, string> = {
              super_admin: "Super Admin",
              admin: "Administrateur",
              staff: "Collaborateur",
              formateur: "Formateur",
            };
            setUserRole(roleLabels[data.role] || data.role);
          }
        });
    });
  }, [user?.id]);

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
    <TooltipProvider>
      {/* ── Logo ── */}
      <div className={cn(
        "flex items-center gap-3 border-b border-white/[0.06] shrink-0",
        collapsed ? "px-3 justify-center" : "px-5"
      )} style={{ height: 56 }}>
        <div className="flex items-center justify-center flex-shrink-0 rounded-xl bg-cta" 
          style={{ width: 32, height: 32 }}>
          <span className="text-cta-foreground font-bold text-[11px] tracking-tight">CF</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <h1 className="text-white font-semibold text-[13px] leading-none tracking-tight">CRM Formation</h1>
            <p className="text-white/30 text-[10px] mt-0.5 font-medium">CampusT3P</p>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className={cn("shrink-0", collapsed ? "px-2 pt-3 pb-1" : "px-3 pt-3 pb-1")}>
        {!collapsed ? (
          <div className="space-y-1.5">
            <button 
              onClick={() => { onNewContact?.(); onItemClick?.(); }}
              className="btn-cta w-full flex items-center justify-center gap-2 h-9 text-[12.5px]"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvel apprenant
            </button>
            <button 
              onClick={() => { onNewProspect?.(); onItemClick?.(); }}
              className="w-full flex items-center justify-center gap-2 h-8 text-[12px] rounded-lg border border-white/[0.12] text-white/60 hover:text-white/90 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-150"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Nouveau prospect
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <SidebarTooltipItem collapsed={collapsed} label="Nouvel apprenant">
              <button
                onClick={() => { onNewContact?.(); onItemClick?.(); }}
                className="btn-cta w-full flex items-center justify-center h-8 rounded-lg"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </SidebarTooltipItem>
            <SidebarTooltipItem collapsed={collapsed} label="Nouveau prospect">
              <button
                onClick={() => { onNewProspect?.(); onItemClick?.(); }}
                className="w-full flex items-center justify-center h-8 rounded-lg border border-white/[0.12] text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-all duration-150"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            </SidebarTooltipItem>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-hide">
        <div className="space-y-px">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <SidebarTooltipItem key={item.id} collapsed={collapsed} label={item.label}>
                <button
                  onClick={() => { onSectionChange(item.id); onItemClick?.(); }}
                  className={cn(
                    "sidebar-item w-full relative",
                    isActive && "active",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="h-[17px] w-[17px] flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </SidebarTooltipItem>
            );
          })}
        </div>

        {/* ── More section ── */}
        {!collapsed ? (
          <Collapsible className="mt-2">
            <CollapsibleTrigger className="sidebar-item w-full text-white/40 hover:text-white/70">
              <MoreHorizontal className="h-[17px] w-[17px] flex-shrink-0" />
              <span className="truncate">Plus</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-px mt-px">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onSectionChange(item.id); onItemClick?.(); }}
                    className={cn("sidebar-item w-full relative pl-8", isActive && "active")}
                  >
                    <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                    <span className="truncate text-[12px]">{item.label}</span>
                  </button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <SidebarTooltipItem collapsed={collapsed} label="Plus de modules">
            <Collapsible className="mt-2">
              <CollapsibleTrigger className="sidebar-item w-full justify-center px-0 text-white/40 hover:text-white/70">
                <MoreHorizontal className="h-[17px] w-[17px] flex-shrink-0" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-px mt-px">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <SidebarTooltipItem key={item.id} collapsed={collapsed} label={item.label}>
                      <button
                        onClick={() => { onSectionChange(item.id); onItemClick?.(); }}
                        className={cn("sidebar-item w-full justify-center px-0", isActive && "active")}
                      >
                        <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                      </button>
                    </SidebarTooltipItem>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </SidebarTooltipItem>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="px-2 py-2 space-y-px border-t border-white/[0.06] shrink-0">
        <RecentItemsMenu onItemClick={handleRecentItemClick} collapsed={collapsed} />
        
        <SidebarTooltipItem collapsed={collapsed} label="Paramètres">
          <button onClick={() => { onSectionChange("settings"); onItemClick?.(); }} className={cn("sidebar-item w-full", activeSection === "settings" && "active", collapsed && "justify-center px-0")}>
            <Settings className="h-[17px] w-[17px] flex-shrink-0" />
            {!collapsed && <span>Paramètres</span>}
          </button>
        </SidebarTooltipItem>
        
        <SidebarTooltipItem collapsed={collapsed} label="Aide & Support">
          <button onClick={() => { window.open("mailto:support@campust3p.fr"); }} className={cn("sidebar-item w-full", collapsed && "justify-center px-0")}>
            <HelpCircle className="h-[17px] w-[17px] flex-shrink-0" />
            {!collapsed && <span>Aide & Support</span>}
          </button>
        </SidebarTooltipItem>

        <SidebarTooltipItem collapsed={collapsed} label="Espace formateur">
          <button onClick={() => { window.location.href = "/formateur"; onItemClick?.(); }} className={cn("sidebar-item w-full", collapsed && "justify-center px-0")}>
            <ClipboardList className="h-[17px] w-[17px] flex-shrink-0" />
            {!collapsed && <span>Espace formateur</span>}
          </button>
        </SidebarTooltipItem>
        
        {canSwitchMode && (
          <SidebarTooltipItem collapsed={collapsed} label="Super Admin">
            <button onClick={() => setShowSwitchDialog(true)} className={cn(
              "sidebar-item w-full border border-dashed border-white/[0.1] hover:border-cta/30 hover:bg-cta/5",
              collapsed && "justify-center px-0"
            )}>
              <Shield className="h-[17px] w-[17px] flex-shrink-0" />
              {!collapsed && <span className="text-xs font-medium">Super Admin</span>}
            </button>
          </SidebarTooltipItem>
        )}

        {/* ── User Profile ── */}
        <div className={cn(
          "flex items-center gap-2.5 mt-2 rounded-xl transition-colors duration-150",
          collapsed ? "justify-center py-2.5" : "px-3 py-2.5"
        )} style={{ background: 'hsl(0 0% 100% / 0.04)' }}>
          <div className="flex items-center justify-center rounded-lg bg-cta/20 flex-shrink-0" style={{ width: 30, height: 30 }}>
            <span className="text-cta text-[11px] font-bold">
              {user?.email ? user.email.substring(0, 2).toUpperCase() : "?"}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-white/85 text-[11.5px] font-medium truncate leading-tight">{user?.email || "Utilisateur"}</p>
              <p className="text-white/30 text-[10px] leading-tight mt-px">{userRole}</p>
            </div>
          )}
        </div>

        {/* ── Logout ── */}
        <SidebarTooltipItem collapsed={collapsed} label="Se déconnecter">
          <button 
            onClick={() => { signOut(); onItemClick?.(); }} 
            className={cn(
              "sidebar-item w-full text-red-400/70 hover:text-red-300 hover:bg-red-500/8",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-[17px] w-[17px] flex-shrink-0" />
            {!collapsed && <span>Se déconnecter</span>}
          </button>
        </SidebarTooltipItem>
        
        {/* ── Collapse Toggle ── */}
        {setCollapsed && (
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="sidebar-item w-full justify-center mt-1 hidden md:flex opacity-50 hover:opacity-100"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : (
              <><ChevronLeft className="h-4 w-4" /><span className="text-[11px]">Réduire</span></>
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
    </TooltipProvider>
  );
}

export function Sidebar({ activeSection, onSectionChange, onNewContact, onNewProspect, onCollapsedChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleCollapsedChange = (value: boolean) => {
    setCollapsed(value);
    onCollapsedChange?.(value);
  };

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
                <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} onNewContact={onNewContact} onNewProspect={onNewProspect} collapsed={false} setCollapsed={() => {}} onItemClick={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-xl bg-cta" style={{ width: 28, height: 28 }}>
              <span className="text-cta-foreground font-bold text-[9px]">CF</span>
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
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300 flex flex-col sidebar-dark",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
      style={{ borderRadius: '0 16px 16px 0', boxShadow: '4px 0 32px rgba(0,0,0,0.2)' }}
    >
      <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} onNewContact={onNewContact} onNewProspect={onNewProspect} collapsed={collapsed} setCollapsed={handleCollapsedChange} />
    </aside>
  );
}
