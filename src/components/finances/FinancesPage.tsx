import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, CreditCard, Euro, FileText, Landmark, Receipt, TrendingUp, Link as LinkIcon } from "lucide-react";
import { useNavigation } from "@/contexts/NavigationContext";
import { FinancesPilotageTab } from "./FinancesPilotageTab";
import { PaiementsListTab } from "./PaiementsListTab";
import { PaiementsPage } from "@/components/paiements/PaiementsPage";
import { DevisPage } from "@/components/devis/DevisPage";
import { TresoreriePage } from "@/components/tresorerie/TresoreriePage";
import { ChargesTab } from "@/components/cockpit-financier/ChargesTab";
import { PrevisionnelTab } from "@/components/cockpit-financier/PrevisionnelTab";
import { AlmaReconciliationPage } from "@/components/finances/AlmaReconciliationPage";
import { Button } from "@/components/ui/button";

/**
 * FinancesPage — 7 onglets (Pilotage / Factures / Paiements / Devis /
 * Trésorerie / Charges / Prévisionnel) + accès secondaires (Alma).
 *
 * Mapping deep-link rétro-compatible :
 *  - ?tab=factures      → factures
 *  - ?tab=tresorerie    → tresorerie
 *  - ?tab=analyse       → pilotage  (remap depuis ancienne nomenclature)
 *  - ?tab=alma          → alma
 *  - ?tab=devis         → devis
 *  - ?tab=charges       → charges
 *  - ?tab=previsionnel  → previsionnel
 *  - ?tab=pilotage      → pilotage (nouveau)
 *  - ?tab=paiements     → paiements (nouveau)
 */
const VALID_TABS = [
  "pilotage",
  "factures",
  "paiements",
  "devis",
  "tresorerie",
  "charges",
  "previsionnel",
  "alma",
] as const;

type FinanceTab = (typeof VALID_TABS)[number];

const LEGACY_MAP: Record<string, FinanceTab> = {
  analyse: "pilotage", // ancien onglet "Analyse" → nouveau Pilotage
};

function resolveTab(input?: string | null): FinanceTab {
  if (!input) return "pilotage";
  if ((VALID_TABS as readonly string[]).includes(input)) return input as FinanceTab;
  if (LEGACY_MAP[input]) return LEGACY_MAP[input];
  return "pilotage";
}

export function FinancesPage() {
  const { activeTab } = useNavigation();
  const [tab, setTab] = useState<FinanceTab>(() => resolveTab(activeTab));
  const [almaOpen, setAlmaOpen] = useState(false);

  // One-shot sync : accepter un deep-link arrivant après mount.
  useEffect(() => {
    if (!activeTab) return;
    const next = resolveTab(activeTab);
    if (next !== tab) setTab(next);
    if (activeTab === "alma") setAlmaOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Finances</h1>
          <p className="text-sm text-muted-foreground">
            Pilotage, facturation, encaissements et trésorerie de votre centre
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAlmaOpen((v) => !v)}
          className="gap-1.5"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          Réconciliation Alma
        </Button>
      </div>

      {almaOpen && (
        <div className="px-6 pb-4">
          <div className="card-elevated p-4">
            <AlmaReconciliationPage />
          </div>
        </div>
      )}

      <div className="px-6 pb-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FinanceTab)}>
          <TabsList className="bg-muted/50 mb-5 flex-wrap h-auto">
            <TabsTrigger value="pilotage" className="gap-1.5 text-xs">
              <LayoutDashboard className="h-3.5 w-3.5" /> Pilotage
            </TabsTrigger>
            <TabsTrigger value="factures" className="gap-1.5 text-xs">
              <CreditCard className="h-3.5 w-3.5" /> Factures
            </TabsTrigger>
            <TabsTrigger value="paiements" className="gap-1.5 text-xs">
              <Euro className="h-3.5 w-3.5" /> Paiements
            </TabsTrigger>
            <TabsTrigger value="devis" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> Devis
            </TabsTrigger>
            <TabsTrigger value="tresorerie" className="gap-1.5 text-xs">
              <Landmark className="h-3.5 w-3.5" /> Trésorerie
            </TabsTrigger>
            <TabsTrigger value="charges" className="gap-1.5 text-xs">
              <Receipt className="h-3.5 w-3.5" /> Charges
            </TabsTrigger>
            <TabsTrigger value="previsionnel" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Prévisionnel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pilotage">
            <FinancesPilotageTab />
          </TabsContent>
          <TabsContent value="factures">
            <PaiementsPage />
          </TabsContent>
          <TabsContent value="paiements">
            <PaiementsListTab />
          </TabsContent>
          <TabsContent value="devis">
            <DevisPage />
          </TabsContent>
          <TabsContent value="tresorerie">
            <TresoreriePage />
          </TabsContent>
          <TabsContent value="charges">
            <ChargesTab />
          </TabsContent>
          <TabsContent value="previsionnel">
            <PrevisionnelTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
