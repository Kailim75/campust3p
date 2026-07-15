import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  XCircle,
  BookOpen,
  User,
  FileText,
  TrendingUp,
  Pen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

import { LearnerDocumentsTab } from "@/components/learner/LearnerDocumentsTab";
import { LearnerEmargementTab } from "@/components/learner/LearnerEmargementTab";
import { LearnerProgressionTab } from "@/components/learner/LearnerProgressionTab";

// Hook to get contact by token
function useContactByToken(token: string | null) {
  return useQuery({
    queryKey: ["learner-contact", token],
    queryFn: async () => {
      if (!token) return null;
      
      // Use secure RPC function to validate token (bypasses RLS for anonymous access)
      // Token must be passed as TEXT (string)
      const { data, error } = await supabase
        .rpc("validate_learner_portal_token", { p_token: String(token) });

      if (error) {
        console.error("Token validation error:", error);
        throw new Error("Lien invalide ou expiré");
      }
      
      // The function returns an array, get first element
      const tokenData = Array.isArray(data) ? data[0] : data;
      
      if (!tokenData) {
        throw new Error("Lien invalide ou expiré");
      }
      
      if (new Date(tokenData.expire_at) < new Date()) {
        throw new Error("Ce lien a expiré");
      }

      // Return contact info from RPC result
      return {
        id: tokenData.contact_id,
        prenom: tokenData.contact_prenom,
        nom: tokenData.contact_nom,
        formation: tokenData.contact_formation,
      };
    },
    enabled: !!token,
    retry: false,
  });
}

export default function LearnerPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const { data: contact, isLoading: contactLoading, error: contactError } = useContactByToken(token);

  const isLoading = contactLoading;

  // Error state
  if (contactError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <XCircle className="h-16 w-16 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Accès refusé</h1>
            <p className="text-muted-foreground">
              {(contactError as Error).message || "Lien invalide ou expiré."}
            </p>
            <p className="text-sm text-muted-foreground">
              Contactez votre centre de formation pour obtenir un nouveau lien d'accès.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No token
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Portail Apprenant</h1>
            <p className="text-muted-foreground">
              Utilisez le lien personnalisé envoyé par votre centre de formation pour accéder à votre espace.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Portail Apprenant</h1>
              <p className="text-sm text-muted-foreground">
                Bienvenue, {contact?.prenom} {contact?.nom}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:flex">
            <User className="h-3 w-3 mr-1" />
            {contact?.formation || "Stagiaire"}
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Tabs for all sections */}
        <Tabs defaultValue="progression" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 h-auto">
            <TabsTrigger value="progression" className="flex flex-col sm:flex-row items-center gap-1 py-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Progression</span>
            </TabsTrigger>
            <TabsTrigger value="emargements" className="flex flex-col sm:flex-row items-center gap-1 py-2">
              <Pen className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Émargements</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex flex-col sm:flex-row items-center gap-1 py-2">
              <FileText className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Documents</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progression" className="space-y-6">
            {contact && (
              <LearnerProgressionTab 
                contactId={contact.id} 
                contactFormation={contact.formation} 
              />
            )}
          </TabsContent>

          <TabsContent value="emargements" className="space-y-6">
            {contact && <LearnerEmargementTab contactId={contact.id} />}
          </TabsContent>


          <TabsContent value="documents" className="space-y-6">
            {contact && <LearnerDocumentsTab contactId={contact.id} />}
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
}
