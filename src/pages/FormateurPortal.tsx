import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FormateurDashboardEnhanced } from "@/components/dashboard/FormateurDashboardEnhanced";
import { Button } from "@/components/ui/button";
import { Car, LogOut, ArrowLeft } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function FormateurPortal() {
  const { user, loading, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Get user role and formateur info
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) return null;
      return data?.role;
    },
    enabled: !!user?.id,
  });

  // Get formateur linked to this user (if any)
  const { data: formateurInfo, isLoading: formateurLoading } = useQuery({
    queryKey: ["user-formateur", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      const { data, error } = await supabase
        .from("formateurs")
        .select("id, nom, prenom, email")
        .eq("email", user.email)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!user?.email,
  });

  const isLoading = loading || roleLoading || formateurLoading;

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [loading, isAuthenticated, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleBackToMain = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formateurNom = formateurInfo 
    ? `${formateurInfo.prenom} ${formateurInfo.nom}` 
    : user?.email?.split("@")[0] || "Formateur";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Car className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Espace Formateur</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userRole && (
              <Button variant="outline" size="sm" onClick={handleBackToMain}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour CRM
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        <FormateurDashboardEnhanced 
          formateurId={formateurInfo?.id}
          formateurNom={formateurNom}
        />
      </main>
    </div>
  );
}
