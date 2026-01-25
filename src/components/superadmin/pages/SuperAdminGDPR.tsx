import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Download, UserX, Search, FileJson, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactResult {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  archived: boolean;
}

export default function SuperAdminGDPR() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ContactResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null);
  const [showAnonymizeDialog, setShowAnonymizeDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Veuillez entrer un terme de recherche");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, nom, prenom, email, telephone, archived")
        .or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
      
      if (!data?.length) {
        toast.info("Aucun contact trouvé");
      }
    } catch (error: any) {
      toast.error("Erreur de recherche: " + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportData = async (contactId: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc("export_contact_data", {
        p_contact_id: contactId,
      });

      if (error) throw error;

      // Télécharger le JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-rgpd-${contactId.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export RGPD téléchargé avec succès");
    } catch (error: any) {
      toast.error("Erreur d'export: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnonymize = async () => {
    if (!selectedContact) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc("anonymize_contact", {
        p_contact_id: selectedContact.id,
      });

      if (error) throw error;

      toast.success("Contact anonymisé conformément au RGPD");
      setShowAnonymizeDialog(false);
      setSelectedContact(null);
      
      // Rafraîchir la recherche
      if (searchTerm) {
        handleSearch();
      }
    } catch (error: any) {
      toast.error("Erreur d'anonymisation: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Conformité RGPD</h1>
          <p className="text-muted-foreground">
            Gestion des droits des personnes concernées
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Droit à la portabilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Export complet des données personnelles au format JSON
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Droit à l'effacement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Anonymisation irréversible des données personnelles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileJson className="h-5 w-5 text-accent-foreground" />
              Traçabilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Toutes les actions sont enregistrées dans les logs d'audit
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rechercher un contact</CardTitle>
          <CardDescription>
            Recherchez par nom, prénom ou email pour exercer les droits RGPD
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Nom, prénom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              {searchResults.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 flex items-center justify-between hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {contact.prenom} {contact.nom}
                      </span>
                      {contact.archived && (
                        <Badge variant="secondary">Archivé</Badge>
                      )}
                      {contact.nom.startsWith("ANONYME-") && (
                        <Badge variant="outline">
                          Anonymisé
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {contact.email || "Pas d'email"} • {contact.telephone || "Pas de téléphone"}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportData(contact.id)}
                      disabled={isProcessing}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Exporter
                    </Button>
                    
                    {!contact.nom.startsWith("ANONYME-") && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedContact(contact);
                          setShowAnonymizeDialog(true);
                        }}
                        disabled={isProcessing}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Anonymiser
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-warning/50 bg-warning/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Informations importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>Anonymisation :</strong> Cette action est irréversible. Les données personnelles 
            seront remplacées par des valeurs anonymes tout en préservant l'intégrité statistique.
          </p>
          <p>
            <strong>Export :</strong> L'export contient toutes les données associées au contact 
            (profil, documents, factures, inscriptions, certificats, etc.).
          </p>
          <p>
            <strong>Délai légal :</strong> Le RGPD impose de répondre aux demandes dans un délai 
            d'un mois maximum.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={showAnonymizeDialog} onOpenChange={setShowAnonymizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmer l'anonymisation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Vous êtes sur le point d'anonymiser définitivement les données de :
                </p>
                <p className="font-medium text-foreground">
                  {selectedContact?.prenom} {selectedContact?.nom}
                </p>
                <p className="text-destructive font-medium">
                  Cette action est IRRÉVERSIBLE. Les données personnelles seront 
                  définitivement supprimées et remplacées par des valeurs anonymes.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAnonymize}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? "Traitement..." : "Confirmer l'anonymisation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
