import { cn } from "@/lib/utils";
import {
  Settings, ChevronLeft, ChevronRight, Menu, HelpCircle, Shield,
  ClipboardList, Plus, UserPlus, LogOut, MoreHorizontal, ChevronDown, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { RecentItemsMenu } from "./RecentItemsMenu";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HUB_ENTRIES, MORE_ENTRIES, MORE_SUBGROUPS, filterEntriesByRole, type NavSubgroup, type SidebarRole } from "@/config/navigationRegistry";
import { useCurrentUserRole } from "@/hooks/useUsers";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onNewContact?: () => void;
  onNewProspect?: () => void;
  onExpressEnrollment?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

// Source unique de vérité : voir src/config/navigationRegistry.ts
const menuItems = HUB_ENTRIES;
const moreMenuItems = MORE_ENTRIES;

/** Map id de hub → clé du compteur sidebar (useSidebarBadges). */
const HUB_BADGE_KEY: Record<string, "aujourdhui" | "finances"> = {
  aujourdhui: "aujourdhui",
  finances: "finances",
};

/** Map id d'entrée du menu « Plus » → clé du compteur sidebar. */
const MORE_BADGE_KEY: Record<string, "signatures"> = {
  signatures: "signatures",
};

/** Pastille compteur affichée sur un item de menu. */
function SidebarBadge({ count, tone = "default" }: { count: number; tone?: "default" | "danger" }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-semibold leading-none",
        tone === "danger"
          ? "bg-destructive/90 text-destructive-foreground"
          : "bg-cta/90 text-cta-foreground"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}


/** Wraps children in a Tooltip when sidebar is collapsed */
function SidebarTooltipItem({ collapsed, label, children }: { collapsed: boolean; label: string; children: React.ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="bg-sidebar-accent text-sidebar-foreground border-sidebar-border text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/** Navigation : hubs principaux avec badges + menu « Plus » regroupé par sous-sections. */
function SidebarNav({
  activeSection, onSectionChange, onItemClick, collapsed,
  moreOpen, setMoreOpen, isInMore, role,
}: {
  activeSection: string;
  onSectionChange: (s: string) => void;
  onItemClick?: () => void;
  collapsed: boolean;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
  isInMore: boolean;
  role: SidebarRole | null | undefined;
}) {
  const { data: badges } = useSidebarBadges();

  const visibleHubs = filterEntriesByRole(HUB_ENTRIES, role);
  const visibleMore = filterEntriesByRole(MORE_ENTRIES, role);

  const getBadge = (id: string): number => {
    const key = HUB_BADGE_KEY[id];
    if (!key || !badges) return 0;
    return badges[key] ?? 0;
  };

  return (
    <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-hide">
      {/* Hubs principaux */}
      <div className="space-y-px">
        {visibleHubs.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const count = getBadge(item.id);
          return (
            <SidebarTooltipItem
              key={item.id}
              collapsed={collapsed}
              label={count ? `${item.label} (${count})` : item.label}
            >
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
                {!collapsed && (
                  <SidebarBadge count={count} tone={item.id === "aujourdhui" || item.id === "finances" ? "danger" : "default"} />
                )}
                {collapsed && count > 0 && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </button>
            </SidebarTooltipItem>
          );
        })}
      </div>

      {/* Menu « Plus » regroupé par sous-sections */}
      {!collapsed ? (
        <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="mt-2">
          <CollapsibleTrigger
            className={cn("sidebar-item w-full text-white/40 hover:text-white/70", isInMore && "text-white/80")}
          >
            <MoreHorizontal className="h-[17px] w-[17px] flex-shrink-0" />
            <span className="truncate">Plus</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-px">
            {MORE_SUBGROUPS.map((sub) => {
              const items = visibleMore.filter((e) => e.subgroup === sub.id);
              if (!items.length) return null;
              return (
                <div key={sub.id} className="mt-2 first:mt-1">
                  <div className="px-3 pb-1 text-[11px] uppercase tracking-wider font-semibold text-white/30">
                    {sub.label}
                  </div>
                  <div className="space-y-px">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      const moreKey = MORE_BADGE_KEY[item.id];
                      const moreCount = moreKey && badges ? badges[moreKey] ?? 0 : 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { onSectionChange(item.id); onItemClick?.(); }}
                          className={cn("sidebar-item w-full relative pl-8", isActive && "active")}
                        >
                          <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                          <span className="truncate text-[12px]">{item.label}</span>
                          <SidebarBadge count={moreCount} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <SidebarTooltipItem collapsed={collapsed} label="Plus de modules">
          <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="mt-2">
            <CollapsibleTrigger
              className={cn(
                "sidebar-item w-full justify-center px-0 text-white/40 hover:text-white/70",
                isInMore && "text-white/80"
              )}
            >
              <MoreHorizontal className="h-[17px] w-[17px] flex-shrink-0" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-px mt-px">
              {visibleMore.map((item) => {
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
  );
}

function SidebarContent({ 
  activeSection, onSectionChange, onNewContact, onNewProspect, onExpressEnrollment, collapsed, setCollapsed, onItemClick 
}: SidebarProps & { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void;
  onItemClick?: () => void;
}) {
  const { canSwitchMode, setMode } = useAdminMode();
  const { user, signOut } = useAuth();
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [userRole, setUserRole] = useState<string>("Utilisateur");
  const { data: sidebarRole } = useCurrentUserRole();

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
    else if (type === "facture") onSectionChange("finances");
    onItemClick?.();
  };

  // Auto-open "Plus" when current active section lives inside moreMenuItems
  const isInMore = moreMenuItems.some((m) => m.id === activeSection);
  const [moreOpen, setMoreOpen] = useState<boolean>(isInMore);
  useEffect(() => {
    if (isInMore) setMoreOpen(true);
  }, [isInMore]);

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
          <span className="text-cta-foreground font-semibold text-[11px] tracking-tight">CF</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <h1 className="text-white font-semibold text-[13px] leading-none tracking-tight">CRM Formation</h1>
            <p className="text-white/30 text-[11px] mt-0.5 font-medium">CampusT3P</p>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className={cn("shrink-0", collapsed ? "px-2 pt-3 pb-1" : "px-3 pt-3 pb-1")}>
        {!collapsed ? (
          <div className="space-y-1.5">
            <button 
              onClick={() => { onExpressEnrollment?.(); onItemClick?.(); }}
              className="btn-cta w-full flex items-center justify-center gap-2 h-9 text-[12.5px]"
            >
              <Zap className="h-3.5 w-3.5" />
              Inscription express
            </button>
            <button 
              onClick={() => { onNewContact?.(); onItemClick?.(); }}
              className="w-full flex items-center justify-center gap-2 h-8 text-[12px] rounded-lg border border-white/[0.12] text-white/60 hover:text-white/90 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-150"
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
            <SidebarTooltipItem collapsed={collapsed} label="Inscription express">
              <button
                onClick={() => { onExpressEnrollment?.(); onItemClick?.(); }}
                className="btn-cta w-full flex items-center justify-center h-8 rounded-lg"
              >
                <Zap className="h-3.5 w-3.5" />
              </button>
            </SidebarTooltipItem>
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
      <SidebarNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onItemClick={onItemClick}
        collapsed={collapsed}
        moreOpen={moreOpen}
        setMoreOpen={setMoreOpen}
        isInMore={isInMore}
        role={sidebarRole}
      />

      {/* ── Footer compact ── */}
      <div className="px-2 py-2 space-y-px border-t border-white/[0.06] shrink-0">
        <RecentItemsMenu onItemClick={handleRecentItemClick} collapsed={collapsed} />

        {/* Carte utilisateur + menu unifié (profil, aide, formateur, admin, déconnexion) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2.5 mt-2 rounded-xl transition-colors duration-150 hover:bg-white/[0.07]",
                collapsed ? "justify-center py-2.5" : "px-3 py-2.5"
              )}
              style={{ background: "hsl(0 0% 100% / 0.04)" }}
              aria-label="Menu utilisateur"
            >
              <div
                className="flex items-center justify-center rounded-lg bg-cta/20 flex-shrink-0"
                style={{ width: 30, height: 30 }}
              >
                <span className="text-cta text-[11px] font-semibold">
                  {user?.email ? user.email.substring(0, 2).toUpperCase() : "?"}
                </span>
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-white/85 text-[11.5px] font-medium truncate leading-tight">
                      {user?.email || "Utilisateur"}
                    </p>
                    <p className="text-white/30 text-[11px] leading-tight mt-px">{userRole}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate">{user?.email}</span>
                <span className="text-xs text-muted-foreground">{userRole}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onSectionChange("settings"); onItemClick?.(); }}>
              <Settings className="h-4 w-4 mr-2" /> Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onSectionChange("aide"); onItemClick?.(); }}>
              <HelpCircle className="h-4 w-4 mr-2" /> Aide & mémo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { window.location.href = "/formateur"; }}>
              <ClipboardList className="h-4 w-4 mr-2" /> Espace formateur
            </DropdownMenuItem>
            {canSwitchMode && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSwitchDialog(true)}>
                  <Shield className="h-4 w-4 mr-2" /> Super Admin
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { signOut(); onItemClick?.(); }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

export function Sidebar({ activeSection, onSectionChange, onNewContact, onNewProspect, onExpressEnrollment, onCollapsedChange }: SidebarProps) {
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
                <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} onNewContact={onNewContact} onNewProspect={onNewProspect} onExpressEnrollment={onExpressEnrollment} collapsed={false} setCollapsed={() => {}} onItemClick={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-xl bg-cta" style={{ width: 28, height: 28 }}>
              <span className="text-cta-foreground font-semibold text-[11px]">CF</span>
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
      <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} onNewContact={onNewContact} onNewProspect={onNewProspect} onExpressEnrollment={onExpressEnrollment} collapsed={collapsed} setCollapsed={handleCollapsedChange} />
    </aside>
  );
}
