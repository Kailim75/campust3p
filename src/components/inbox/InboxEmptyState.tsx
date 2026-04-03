import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Mail, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface InboxEmptyStateProps {
  centreId: string | null;
}

export function InboxEmptyState({ centreId }: InboxEmptyStateProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const queryClient = useQueryClient();

  const handleConnect = async () => {
    if (!centreId || !email.trim()) return;
    setConnecting(true);
    try {
      // Start OAuth flow via Edge Function
      const { data, error } = await supabase.functions.invoke("sync-gmail-inbox", {
        body: {
          action: "init_oauth",
          centreId,
          email: email.trim(),
          displayName: displayName.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.authUrl) {
        // Redirect full page — Google blocks OAuth in popups/iframes
        window.location.href = data.authUrl;
        return;
      } else {
        toast.success("Compte email configuré");
      }
      queryClient.invalidateQueries({ queryKey: ["crm-email-account"] });
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Configurer l'Inbox CRM</CardTitle>
          <CardDescription>
            Connectez la boîte email de votre centre pour recevoir et gérer les emails directement dans le CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse email du centre</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@votrecentre.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Nom d'affichage (optionnel)</Label>
            <Input
              id="displayName"
              placeholder="Mon Centre de Formation"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleConnect}
            disabled={!email.trim() || connecting}
          >
            {connecting ? "Connexion…" : "Connecter via Google"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Nécessite un compte Google Workspace ou Gmail.
            L'accès en lecture et envoi sera demandé.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
