import { Plus, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { CentreSwitcher } from "./CentreSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onAddClick?: () => void;
  addLabel?: string;
  activeSection?: string;
  activeTab?: string;
  onNavigate?: (section: string) => void;
  extraActions?: React.ReactNode;
}

export function Header({ 
  title, subtitle, onAddClick, addLabel, activeSection, activeTab, onNavigate, extraActions,
}: HeaderProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion");
    } else {
      toast.success("Déconnexion réussie");
    }
  };

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-30 bg-card/98 backdrop-blur-md border-b border-border" style={{ height: '56px', padding: '0 16px' }}>
      <div className="flex items-center justify-between h-full gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
          {activeSection && onNavigate ? (
            <AppBreadcrumb 
              activeSection={activeSection} 
              activeTab={activeTab}
              onNavigate={onNavigate} 
            />
          ) : (
            <div className="min-w-0">
              <h1 className="text-foreground font-semibold text-lg sm:text-[28px] leading-none tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-[12px] sm:text-[13px] text-foreground-subtle mt-0.5 sm:mt-1.5 hidden sm:block">{subtitle}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <GlobalSearch />
            <CentreSwitcher />
          </div>
          <ThemeToggle />
          <NotificationBell />

          {extraActions}

          {onAddClick && (
            <button 
              onClick={onAddClick} 
              className="btn-cta flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[13px] h-8 sm:h-9 px-2.5 sm:px-4 ml-0.5 sm:ml-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{addLabel || "Ajouter"}</span>
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0 ml-0.5 sm:ml-1">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-border">
                  <AvatarFallback className="text-[9px] sm:text-[10px] font-semibold bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-0.5 leading-none">
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              {/* Mobile-only: search & centre switcher */}
              <div className="sm:hidden px-2 py-1.5 space-y-1.5">
                <GlobalSearch />
                <CentreSwitcher />
              </div>
              <div className="sm:hidden"><DropdownMenuSeparator /></div>
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}