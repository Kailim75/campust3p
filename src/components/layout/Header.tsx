import { Bell, Plus, LogOut } from "lucide-react";
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

interface HeaderProps {
  title: string;
  subtitle?: string;
  onAddClick?: () => void;
  addLabel?: string;
}

export function Header({ title, subtitle, onAddClick, addLabel }: HeaderProps) {
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
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Global Search */}
          <GlobalSearch />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          </Button>

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
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
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
