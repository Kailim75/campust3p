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
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted/50 mb-5">
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

          <TabsContent value="factures">
            <FacturationUnifiedPage />
          </TabsContent>
          <TabsContent value="tresorerie">
            <TresoreriePage />
          </TabsContent>
          <TabsContent value="analyse">
            <CockpitFinancierPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
