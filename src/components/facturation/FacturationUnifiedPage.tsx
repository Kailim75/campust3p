import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigation } from "@/contexts/NavigationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, CreditCard, BarChart3, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { DevisPage } from "@/components/devis/DevisPage";
import { PaiementsPage } from "@/components/paiements/PaiementsPage";
import { useDevis } from "@/hooks/useDevis";
import { useFactures } from "@/hooks/useFactures";
import { FacturationIntelligence } from "./FacturationIntelligence";
import { AnalyseParSession } from "./AnalyseParSession";
import { cn } from "@/lib/utils";

type ViewMode = "factures" | "devis" | "sessions";

interface FacturationUnifiedPageProps {
  embedded?: boolean;
}

export function FacturationUnifiedPage({ embedded = false }: FacturationUnifiedPageProps) {
  const [activeView, setActiveView] = useState<ViewMode>("factures");
  const { data: devisList = [] } = useDevis();
  const { data: factures = [] } = useFactures();

  // Stats
  const devisEnAttente = devisList.filter(d => d.statut === "brouillon" || d.statut === "envoye").length;
  const facturesImpayees = factures.filter(f => f.statut === "emise" || f.statut === "partiel" || f.statut === "impayee").length;
  const facturesPayees = factures.filter(f => f.statut === "payee").length;

  // Calculate totals
  const totalDevis = devisList.reduce((sum, d) => sum + Number(d.montant_total || 0), 0);
  const totalFactures = factures.reduce((sum, f) => sum + Number(f.montant_total || 0), 0);
  const totalPaye = factures
    .filter(f => f.statut === "payee")
    .reduce((sum, f) => sum + Number(f.montant_total || 0), 0);
  const totalImpaye = totalFactures - totalPaye;
  
  // Taux de recouvrement
  const tauxRecouvrement = totalFactures > 0 ? Math.round((totalPaye / totalFactures) * 100) : 100;

  const { setActiveTab } = useNavigation();
  
  // Update breadcrumb when tab changes
  useEffect(() => {
    if (!embedded) {
      setActiveTab(activeView);
    }
  }, [activeView, embedded, setActiveTab]);

  // Priority subtitle based on context
  const getSubtitle = () => {
    if (facturesImpayees > 0) {
      return `${facturesImpayees} facture${facturesImpayees > 1 ? "s" : ""} à recouvrer • ${tauxRecouvrement}% encaissé`;
    }
    if (devisEnAttente > 0) {
      return `${devisEnAttente} devis en attente de validation`;
    }
    return `${facturesPayees} facture${facturesPayees > 1 ? "s" : ""} soldée${facturesPayees > 1 ? "s" : ""}`;
  };

  return (
    <div className={embedded ? "space-y-5" : "space-y-6"}>
      {!embedded && (
        <PageHeader 
          title="Finances" 
          subtitle={getSubtitle()}
        />
      )}

      {/* Quick stats - Simplified and clearer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Devis en cours</p>
          </div>
          <p className="text-2xl font-bold">{devisEnAttente}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalDevis.toLocaleString("fr-FR")} € potentiel
          </p>
        </div>
        <div className={cn(
          "card-elevated p-4",
          facturesImpayees > 0 ? "border-warning/30 bg-warning/5" : ""
        )}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className={cn("h-4 w-4", facturesImpayees > 0 ? "text-warning" : "text-muted-foreground")} />
            <p className="text-sm text-muted-foreground">À encaisser</p>
          </div>
          <p className={cn("text-2xl font-bold", facturesImpayees > 0 ? "text-warning" : "")}>
            {totalImpaye.toLocaleString("fr-FR")} €
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {facturesImpayees} facture{facturesImpayees > 1 ? "s" : ""} en attente
          </p>
        </div>
        <div className="card-elevated p-4 border-success/20 bg-success/5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <p className="text-sm text-muted-foreground">Encaissé</p>
          </div>
          <p className="text-2xl font-bold text-success">
            {totalPaye.toLocaleString("fr-FR")} €
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {facturesPayees} facture{facturesPayees > 1 ? "s" : ""} soldée{facturesPayees > 1 ? "s" : ""}
          </p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Recouvrement</p>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            tauxRecouvrement >= 75 ? "text-success" : tauxRecouvrement >= 50 ? "text-warning" : "text-destructive"
          )}>
            {tauxRecouvrement}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            sur {totalFactures.toLocaleString("fr-FR")} € facturé
          </p>
        </div>
      </div>

      {/* Intelligence prédictive */}
      <FacturationIntelligence factures={factures} />

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewMode)} className="space-y-4">
        <TabsList className="h-auto p-1">
          <TabsTrigger value="factures" className="gap-2 py-2.5 px-4">
            <CreditCard className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Factures</span>
              <span className="text-[10px] text-muted-foreground font-normal hidden sm:block">Suivi des paiements</span>
            </div>
            {facturesImpayees > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {facturesImpayees}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="devis" className="gap-2 py-2.5 px-4">
            <FileText className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Devis</span>
              <span className="text-[10px] text-muted-foreground font-normal hidden sm:block">Propositions commerciales</span>
            </div>
            {devisEnAttente > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {devisEnAttente}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2 py-2.5 px-4">
            <BarChart3 className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Par session</span>
              <span className="text-[10px] text-muted-foreground font-normal hidden sm:block">Rentabilité formations</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="factures" className="mt-4">
          <PaiementsPageEmbedded />
        </TabsContent>

        <TabsContent value="devis" className="mt-4">
          <DevisPageEmbedded />
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <AnalyseParSession />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Embedded version of PaiementsPage (without header)
function PaiementsPageEmbedded() {
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
