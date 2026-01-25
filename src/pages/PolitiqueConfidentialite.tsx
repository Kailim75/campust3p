import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Shield, ArrowLeft, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PolitiqueConfidentialite() {
  const { data: activePolicy, isLoading } = useQuery({
    queryKey: ["active-privacy-policy"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_document", {
        p_document_type: "privacy_policy",
      });
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  // Simple markdown to HTML conversion
  const renderMarkdown = (text: string) => {
    let html = text
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-foreground">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4 text-foreground">$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4">')
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="my-6 border-border">')
      // Lists
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em class="text-muted-foreground">$1</em>');

    return `<p class="mb-4">${html}</p>`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">CampusT3P</h1>
            </div>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Politique de Confidentialité</h1>
                {activePolicy?.version && (
                  <p className="text-sm text-muted-foreground">
                    Version {activePolicy.version}
                    {activePolicy.activated_at && (
                      <> - Mise à jour le {format(new Date(activePolicy.activated_at), "dd MMMM yyyy", { locale: fr })}</>
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {activePolicy ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(activePolicy.contenu) }}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune politique de confidentialité publiée pour le moment.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="mt-8 text-center text-sm text-muted-foreground space-x-4">
          <Link to="/mentions-legales" className="hover:text-primary hover:underline">
            Mentions Légales
          </Link>
          <span>•</span>
          <Link to="/" className="hover:text-primary hover:underline">
            Accueil
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CampusT3P. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
