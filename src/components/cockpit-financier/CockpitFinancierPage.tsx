import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, CalendarDays, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computePeriodRange, type Periode } from "@/hooks/useFinancialData";
import { useAlmaMode } from "@/hooks/useAlmaMode";
import { VueEnsembleTab } from "./VueEnsembleTab";
import { RevenusTab } from "./RevenusTab";
import { ChargesTab } from "./ChargesTab";
import { PrevisionnelTab } from "./PrevisionnelTab";

export function CockpitFinancierPage() {
  const [periode, setPeriode] = useState<Periode>("mois");
  const range = useMemo(() => computePeriodRange(periode), [periode]);
  const { isSandbox } = useAlmaMode();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Alma sandbox warning — non-dismissible */}
      {isSandbox && (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-destructive">Alma en mode TEST</span>
            <span className="text-muted-foreground"> — Les paiements Alma ne sont pas réels. Basculez en mode Live dans les paramètres Alma avant de facturer.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary">
            <Landmark className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Cockpit Financier</h1>
            <p className="text-sm text-muted-foreground">Pilotage financier de votre centre de formation</p>
          </div>
        </div>

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

      {/* Tabs */}
      <Tabs defaultValue="vue-ensemble" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="revenus">Revenus</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="previsionnel">Prévisionnel</TabsTrigger>
        </TabsList>

        <TabsContent value="vue-ensemble">
          <VueEnsembleTab range={range} />
        </TabsContent>

        <TabsContent value="revenus">
          <RevenusTab range={range} />
        </TabsContent>

        <TabsContent value="charges">
          <ChargesTab range={range} />
        </TabsContent>

        <TabsContent value="previsionnel">
          <PrevisionnelTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
