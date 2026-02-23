import { Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { CentreSwitcher } from "./CentreSwitcher";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onAddClick?: () => void;
  addLabel?: string;
  activeSection?: string;
  activeTab?: string;
  onNavigate?: (section: string) => void;
}

export function Header({ 
  title, 
  subtitle, 
  onAddClick, 
  addLabel,
  activeSection,
  activeTab,
  onNavigate,
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
    <header className="sticky top-0 z-30 bg-card border-b border-border" style={{ height: '64px', boxShadow: 'var(--shadow-xs)' }}>
      <div className="flex items-center justify-between px-6 h-full">
        <div className="flex-1">
          {/* Breadcrumb */}
          {activeSection && onNavigate && (
            <AppBreadcrumb 
              activeSection={activeSection} 
              activeTab={activeTab}
              onNavigate={onNavigate} 
            />
          )}
          
          <h1 className="text-[26px] font-display font-bold text-foreground leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Centre Switcher */}
          <CentreSwitcher />

          {/* Global Search */}
          <GlobalSearch />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationBell />

          {/* Add Button */}
          {onAddClick && (
            <Button onClick={onAddClick} className="btn-gradient gap-2">
              <Plus className="h-4 w-4" />
              {addLabel || "Ajouter"}
            </Button>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-border">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-display font-bold text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}>
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
