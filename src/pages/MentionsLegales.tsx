import { useLegalMentions } from "@/hooks/useLegalMentions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, FileText, Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function MentionsLegales() {
  const { activeMention, isLoadingActive } = useLegalMentions();

  // Process content with placeholders replaced by actual values
  const processContent = (content: string) => {
    if (!activeMention) return content;

    const replacements: Record<string, string> = {
      "{RAISON_SOCIALE}": activeMention.raison_sociale || "[Non renseigné]",
      "{FORME_JURIDIQUE}": activeMention.forme_juridique || "[Non renseigné]",
      "{CAPITAL_SOCIAL}": activeMention.capital_social || "[Non renseigné]",
      "{SIEGE_SOCIAL}": activeMention.siege_social || "[Non renseigné]",
      "{RCS}": activeMention.rcs || "[Non renseigné]",
      "{SIRET}": activeMention.siret || "[Non renseigné]",
      "{NDA}": activeMention.nda || "[Non renseigné]",
      "{DIRECTEUR_PUBLICATION}": activeMention.directeur_publication || "[Non renseigné]",
      "{HEBERGEUR_NOM}": activeMention.hebergeur_nom || "[Non renseigné]",
      "{HEBERGEUR_ADRESSE}": activeMention.hebergeur_adresse || "[Non renseigné]",
      "{HEBERGEUR_CONTACT}": activeMention.hebergeur_contact || "[Non renseigné]",
      "{EMAIL_CONTACT}": activeMention.email_contact || "[Non renseigné]",
      "{TELEPHONE_CONTACT}": activeMention.telephone_contact || "[Non renseigné]",
      "{DATE_MISE_A_JOUR}": activeMention.activated_at
        ? format(new Date(activeMention.activated_at), "dd MMMM yyyy", { locale: fr })
        : "[Non publié]",
    };

    let processed = content;
    Object.entries(replacements).forEach(([key, value]) => {
      processed = processed.replace(new RegExp(key, "g"), value);
    });

    return processed;
  };

  // Simple markdown to HTML (basic conversion)
  const renderMarkdown = (text: string) => {
    const processed = processContent(text);
    
    // Convert markdown to HTML
    let html = processed
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
      // Italic (for date)
      .replace(/\*(.+?)\*/g, '<em class="text-muted-foreground">$1</em>');

    return `<p class="mb-4">${html}</p>`;
  };

  if (isLoadingActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Mentions Légales</h1>
                {activeMention?.version && (
                  <p className="text-sm text-muted-foreground">
                    Version {activeMention.version}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {activeMention ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(activeMention.contenu) }}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune mention légale publiée pour le moment.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="mt-8 text-center text-sm text-muted-foreground space-x-4">
          <Link to="/politique-confidentialite" className="hover:text-primary hover:underline">
            Politique de Confidentialité
          </Link>
          <span>•</span>
          <Link to="/" className="hover:text-primary hover:underline">
            Accueil
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CampusT3P. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
