import { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, CreditCard, Euro, FileText, Landmark, Receipt, TrendingUp, Link as LinkIcon, CalendarDays } from "lucide-react";
import { useNavigation } from "@/contexts/NavigationContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { computePeriodRange, type Periode } from "@/hooks/useFinancialData";

// Chaque onglet n'est chargé qu'à sa première ouverture (Radix ne monte que
// l'onglet actif) : importés statiquement, les 7 onglets faisaient de
// FinancesPage le chunk le plus lourd de l'app (648 Ko brut, dont pdfjs et les
// graphiques) — audit 13/08/2026, perf P2.
const FinancesPilotageTab = lazy(() => import("./FinancesPilotageTab").then((m) => ({ default: m.FinancesPilotageTab })));
const PaiementsListTab = lazy(() => import("./PaiementsListTab").then((m) => ({ default: m.PaiementsListTab })));
const PaiementsPage = lazy(() => import("@/components/paiements/PaiementsPage").then((m) => ({ default: m.PaiementsPage })));
const DevisPage = lazy(() => import("@/components/devis/DevisPage").then((m) => ({ default: m.DevisPage })));
const TresoreriePage = lazy(() => import("@/components/tresorerie/TresoreriePage").then((m) => ({ default: m.TresoreriePage })));
const ChargesTab = lazy(() => import("@/components/cockpit-financier/ChargesTab").then((m) => ({ default: m.ChargesTab })));
const PrevisionnelTab = lazy(() => import("@/components/cockpit-financier/PrevisionnelTab").then((m) => ({ default: m.PrevisionnelTab })));
const AlmaReconciliationPage = lazy(() =>
  import("@/components/finances/AlmaReconciliationPage").then((m) => ({ default: m.AlmaReconciliationPage })),
);

function TabFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function ChargesTabContainer() {
  const [periode, setPeriode] = useState<Periode>("mois");
  const range = useMemo(() => computePeriodRange(periode), [periode]);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={periode} onValueChange={(v) => setPeriode(v as Periode)}>
          <SelectTrigger className="w-[200px]">
            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mois">Ce mois</SelectItem>
            <SelectItem value="trimestre">Ce trimestre</SelectItem>
            <SelectItem value="annee">Cette année</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Suspense fallback={<TabFallback />}>
        <ChargesTab range={range} />
      </Suspense>
    </div>
  );
}

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
            <Suspense fallback={<TabFallback />}>
              <AlmaReconciliationPage />
            </Suspense>
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
            <Suspense fallback={<TabFallback />}>
              <FinancesPilotageTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="factures">
            <Suspense fallback={<TabFallback />}>
              <PaiementsPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="paiements">
            <Suspense fallback={<TabFallback />}>
              <PaiementsListTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="devis">
            <Suspense fallback={<TabFallback />}>
              <DevisPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="tresorerie">
            <Suspense fallback={<TabFallback />}>
              <TresoreriePage />
            </Suspense>
          </TabsContent>
          <TabsContent value="charges">
            <ChargesTabContainer />
          </TabsContent>
          <TabsContent value="previsionnel">
            <Suspense fallback={<TabFallback />}>
              <PrevisionnelTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
