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
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border" style={{ height: '52px', padding: '0 24px', borderImage: 'linear-gradient(to right, hsl(199 55% 26% / 0.15), transparent) 1' }}>
      <div className="flex items-center justify-between h-full">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {activeSection && onNavigate ? (
            <AppBreadcrumb 
              activeSection={activeSection} 
              activeTab={activeTab}
              onNavigate={onNavigate} 
            />
          ) : (
            <div>
              <h1 className="text-foreground font-semibold text-[15px] leading-none tracking-tight">{title}</h1>
              {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <GlobalSearch />
          <CentreSwitcher />
          <ThemeToggle />
          <NotificationBell />

          {onAddClick && (
            <Button 
              onClick={onAddClick} 
              size="sm" 
              className="gap-1.5 text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg font-medium text-[13px] h-8 px-3 ml-1"
            >
              <Plus className="h-3.5 w-3.5" />
              {addLabel || "Ajouter"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 ml-1">
                <Avatar className="h-7 w-7 border border-border">
                  <AvatarFallback className="text-[10px] text-primary-foreground bg-primary font-medium">
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
