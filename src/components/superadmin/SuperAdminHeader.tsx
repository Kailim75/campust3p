import { LogOut, Shield } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface SuperAdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function SuperAdminHeader({ title, subtitle }: SuperAdminHeaderProps) {
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
    <header className="sticky top-0 z-30 bg-superadmin-header backdrop-blur-md border-b border-superadmin-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1">
          {/* Super Admin Indicator */}
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-superadmin-accent/10 text-superadmin-accent border-superadmin-accent/30 text-xs font-semibold">
              <Shield className="h-3 w-3 mr-1" />
              SUPER ADMIN
            </Badge>
          </div>
          
          <h1 className="text-2xl font-display font-bold text-superadmin-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-superadmin-muted mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-superadmin-accent/10">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-superadmin-primary/20 text-superadmin-primary font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-0.5 leading-none">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Super Administrateur</p>
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
