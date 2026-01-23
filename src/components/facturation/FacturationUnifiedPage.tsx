import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileEdit, CreditCard } from "lucide-react";
import { DevisPage } from "@/components/devis/DevisPage";
import { PaiementsPage } from "@/components/paiements/PaiementsPage";
import { useDevis } from "@/hooks/useDevis";
import { useFactures } from "@/hooks/useFactures";

type ViewMode = "devis" | "paiements";

export function FacturationUnifiedPage() {
  const [activeView, setActiveView] = useState<ViewMode>("paiements");
  const { data: devisList = [] } = useDevis();
  const { data: factures = [] } = useFactures();

  // Stats
  const devisEnAttente = devisList.filter(d => d.statut === "brouillon" || d.statut === "envoye").length;
  const facturesImpayees = factures.filter(f => f.statut === "emise" || f.statut === "partiel" || f.statut === "impayee").length;

  // Calculate totals
  const totalDevis = devisList.reduce((sum, d) => sum + Number(d.montant_total || 0), 0);
  const totalFactures = factures.reduce((sum, f) => sum + Number(f.montant_total || 0), 0);
  const totalPaye = factures
    .filter(f => f.statut === "payee")
    .reduce((sum, f) => sum + Number(f.montant_total || 0), 0);

  return (
    <div className="space-y-6">
      <Header 
        title="Facturation" 
        subtitle={`${facturesImpayees} factures en attente • ${devisEnAttente} devis en cours`}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">Devis en cours</p>
          <p className="text-2xl font-bold">{devisEnAttente}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalDevis.toLocaleString("fr-FR")} € total
          </p>
        </div>
        <div className="card-elevated p-4 border-warning/20">
          <p className="text-sm text-muted-foreground">Factures impayées</p>
          <p className="text-2xl font-bold text-warning">{facturesImpayees}</p>
        </div>
        <div className="card-elevated p-4 border-success/20">
          <p className="text-sm text-muted-foreground">Encaissé</p>
          <p className="text-2xl font-bold text-success">
            {totalPaye.toLocaleString("fr-FR")} €
          </p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">Total facturé</p>
          <p className="text-2xl font-bold">
            {totalFactures.toLocaleString("fr-FR")} €
          </p>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewMode)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="paiements" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Factures & Paiements
            {facturesImpayees > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {facturesImpayees}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="devis" className="gap-2">
            <FileEdit className="h-4 w-4" />
            Devis
            {devisEnAttente > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {devisEnAttente}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paiements" className="mt-4">
          {/* Render PaiementsPage without its own header */}
          <PaiementsPageEmbedded />
        </TabsContent>

        <TabsContent value="devis" className="mt-4">
          {/* Render DevisPage without its own header */}
          <DevisPageEmbedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Embedded version of PaiementsPage (without header)
function PaiementsPageEmbedded() {
  // Import and render the content directly from PaiementsPage
  // For now, we'll just render the original page
  return (
    <div className="[&>div>div:first-child]:hidden">
      <PaiementsPage />
    </div>
  );
}

// Embedded version of DevisPage (without header)
function DevisPageEmbedded() {
  return (
    <div className="[&>div>div:first-child]:hidden">
      <DevisPage />
    </div>
  );
}
