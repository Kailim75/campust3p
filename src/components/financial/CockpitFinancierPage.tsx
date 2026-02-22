import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useFinancialMonths,
  useFinancialCosts,
  useFinancialCashManual,
  useSyncFinancialData,
  useEnsureFinancialMonth,
  computeSynthesis,
} from "@/hooks/useFinancialCockpit";
import { SyntheseTab } from "./SyntheseTab";
import { ChargesTab } from "./ChargesTab";
import { SimulateurTab } from "./SimulateurTab";

export function CockpitFinancierPage() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);

  const { data: financialMonths } = useFinancialMonths();
  const ensureMonth = useEnsureFinancialMonth();
  const { data: syncData } = useSyncFinancialData(selectedMonth);
  const { data: costs = [] } = useFinancialCosts(selectedMonthId);
  const { data: cashManual = [] } = useFinancialCashManual(selectedMonthId);

  // Ensure current month exists on load
  useEffect(() => {
    ensureMonth.mutate(selectedMonth, {
      onSuccess: (id) => setSelectedMonthId(id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // Update selectedMonthId when financialMonths changes
  useEffect(() => {
    if (financialMonths && !selectedMonthId) {
      const monthStr = format(selectedMonth, "yyyy-MM-dd");
      const found = financialMonths.find(m => m.month === monthStr);
      if (found) setSelectedMonthId(found.id);
    }
  }, [financialMonths, selectedMonth, selectedMonthId]);

  const synthesis = useMemo(() => {
    if (!syncData) return null;
    return computeSynthesis(syncData.studentsCount, syncData.totalCA, costs, cashManual);
  }, [syncData, costs, cashManual]);

  // Generate month options (current + 11 previous)
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({
        value: format(m, "yyyy-MM-dd"),
        label: format(m, "MMMM yyyy", { locale: fr }),
      });
    }
    return opts;
  }, []);

  const handleMonthChange = (value: string) => {
    const d = new Date(value);
    setSelectedMonth(d);
    setSelectedMonthId(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary">
            <Landmark className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Cockpit Financier</h1>
            <p className="text-sm text-muted-foreground">Vue synthétique de votre performance financière</p>
          </div>
        </div>
        <Select value={format(selectedMonth, "yyyy-MM-dd")} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="synthese" className="space-y-4">
        <TabsList>
          <TabsTrigger value="synthese">Synthèse</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="simulateur">Simulateur</TabsTrigger>
        </TabsList>

        <TabsContent value="synthese">
          <SyntheseTab synthesis={synthesis} />
        </TabsContent>

        <TabsContent value="charges">
          <ChargesTab
            monthId={selectedMonthId}
            costs={costs}
            cashManual={cashManual}
          />
        </TabsContent>

        <TabsContent value="simulateur">
          <SimulateurTab synthesis={synthesis} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
