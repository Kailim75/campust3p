import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FacturationUnifiedPage } from "@/components/facturation/FacturationUnifiedPage";
import { CockpitFinancierPage } from "@/components/cockpit-financier/CockpitFinancierPage";
import { TresoreriePage } from "@/components/tresorerie/TresoreriePage";
import { CreditCard, Landmark, BarChart3 } from "lucide-react";
import { useNavigation } from "@/contexts/NavigationContext";

const VALID_TABS = ["factures", "tresorerie", "analyse"] as const;

export function FinancesPage() {
  const { activeTab } = useNavigation();
  const [tab, setTab] = useState("factures");
  const tabMeta = {
    factures: {
      title: "Facturation",
      description: "Suivez les devis, les factures à encaisser et les relances prioritaires.",
    },
    tresorerie: {
      title: "Trésorerie",
      description: "Pilotez les flux bancaires, le rapprochement et les prévisions à court terme.",
    },
    analyse: {
      title: "Analyse",
      description: "Prenez du recul sur les revenus, les charges et le prévisionnel du centre.",
    },
  } as const;

  // Sync deep-link tab from NavigationContext
  useEffect(() => {
    if (activeTab && VALID_TABS.includes(activeTab as typeof VALID_TABS[number])) {
      setTab(activeTab);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-display font-bold text-foreground">Finances</h1>
        <p className="text-sm text-muted-foreground">Gestion financière de votre centre</p>
      </div>

      <div className="px-6 pb-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{tabMeta[tab as keyof typeof tabMeta].title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tabMeta[tab as keyof typeof tabMeta].description}
                </p>
              </div>
              <TabsList className="bg-muted/50 h-auto flex-wrap justify-start">
                <TabsTrigger value="factures" className="gap-1.5 text-xs">
                  <CreditCard className="h-3.5 w-3.5" /> Facturation
                </TabsTrigger>
                <TabsTrigger value="tresorerie" className="gap-1.5 text-xs">
                  <Landmark className="h-3.5 w-3.5" /> Trésorerie
                </TabsTrigger>
                <TabsTrigger value="analyse" className="gap-1.5 text-xs">
                  <BarChart3 className="h-3.5 w-3.5" /> Analyse
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="factures">
            <FacturationUnifiedPage embedded />
          </TabsContent>
          <TabsContent value="tresorerie">
            <TresoreriePage embedded />
          </TabsContent>
          <TabsContent value="analyse">
            <CockpitFinancierPage embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
