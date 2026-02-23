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
    <header 
      className="sticky top-0 z-30 bg-surface border-b border-border"
      style={{ 
        height: '62px', 
        boxShadow: '0 1px 4px rgba(22,16,10,0.05)',
        padding: '0 26px',
      }}
    >
      <div className="flex items-center justify-between h-full">
        <div className="flex-1 min-w-0">
          {activeSection && onNavigate && (
            <AppBreadcrumb 
              activeSection={activeSection} 
              activeTab={activeTab}
              onNavigate={onNavigate} 
            />
          )}
          
          <h1 
            className="text-foreground leading-tight truncate"
            style={{ 
              fontFamily: 'Nunito', 
              fontWeight: 900, 
              fontSize: 18, 
              letterSpacing: '-0.3px' 
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <CentreSwitcher />
          <GlobalSearch />
          <ThemeToggle />
          <NotificationBell />

          {onAddClick && (
            <Button 
              onClick={onAddClick} 
              size="sm" 
              className="gap-1.5 text-primary-foreground"
              style={{
                fontFamily: 'Nunito',
                fontWeight: 800,
                fontSize: 13,
                borderRadius: 99,
                padding: '9px 18px',
                height: 'auto',
                boxShadow: '0 4px 14px rgba(30,80,104,0.3)',
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {addLabel || "Ajouter"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9" style={{ border: '2px solid hsl(var(--border))' }}>
                  <AvatarFallback 
                    className="text-[11px] text-primary-foreground"
                    style={{ 
                      fontFamily: 'Nunito', 
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #1E5068, #5A8EA0)',
                    }}
                  >
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
