import { useState, useMemo, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { formatEuro, formatEuroShort, CHARGE_CATEGORIES } from "@/lib/formatFinancial";
import {
  useBudgetPrevisionnel, useUpsertBudget, useAllCharges, useRecurringCharges,
  useParametresFinanciers,
} from "@/hooks/useFinancialData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export function PrevisionnelTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showPrefill, setShowPrefill] = useState(false);

  return (
    <Tabs defaultValue="charges-prev" className="space-y-4">
      <div className="flex items-center gap-3">
        <TabsList>
          <TabsTrigger value="charges-prev">Charges prévisionnelles</TabsTrigger>
          <TabsTrigger value="objectifs-ca">Objectifs de CA</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear(y => y - 1)}>&lt;</Button>
          <span className="text-sm font-semibold w-12 text-center">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear(y => y + 1)}>&gt;</Button>
        </div>
      </div>

      <TabsContent value="charges-prev">
        <ChargesPrevTab year={year} onPrefill={() => setShowPrefill(true)} />
        <PrefillDialog open={showPrefill} onClose={() => setShowPrefill(false)} year={year} />
      </TabsContent>

      <TabsContent value="objectifs-ca">
        <ObjectifsCaTab year={year} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Charges Prévisionnelles ───
function ChargesPrevTab({ year, onPrefill }: { year: number; onPrefill: () => void }) {
  const { data: budget = [], isLoading } = useBudgetPrevisionnel(year);
  const { data: allCharges = [] } = useAllCharges();
  const upsertBudget = useUpsertBudget();
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Get unique categories from budget + charges
  const categories = useMemo(() => {
    const cats = new Set<string>();
    budget.filter(b => b.type === "charge").forEach(b => cats.add(b.categorie));
    allCharges.forEach(c => {
      const d = new Date(c.date_charge);
      if (d.getFullYear() === year) cats.add(c.categorie);
    });
    Object.keys(CHARGE_CATEGORIES).forEach(k => cats.add(k));
    return [...cats].sort();
  }, [budget, allCharges, year]);

  // Actual charges by category × month
  const actuals = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    allCharges.filter(c => {
      const d = new Date(c.date_charge);
      return d.getFullYear() === year && c.statut === "active";
    }).forEach(c => {
      const m = new Date(c.date_charge).getMonth() + 1;
      if (!map[c.categorie]) map[c.categorie] = {};
      map[c.categorie][m] = (map[c.categorie][m] || 0) + Number(c.montant);
    });
    return map;
  }, [allCharges, year]);

  // Budget lookup
  const budgetMap = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    budget.filter(b => b.type === "charge").forEach(b => {
      if (!map[b.categorie]) map[b.categorie] = {};
      map[b.categorie][b.mois] = Number(b.montant_prevu);
    });
    return map;
  }, [budget]);

  const handleChange = useCallback((cat: string, mois: number, value: string) => {
    const num = parseFloat(value) || 0;
    const key = `${cat}-${mois}`;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => {
      upsertBudget.mutate({ annee: year, mois, type: "charge", categorie: cat, montant_prevu: num });
    }, 800);
  }, [year, upsertBudget]);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <Card className="overflow-auto">
      <div className="p-4 flex justify-end">
        <Button variant="outline" size="sm" className="gap-2" onClick={onPrefill}>
          <RefreshCw className="h-4 w-4" /> Pré-remplir depuis récurrentes
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card z-10 min-w-[160px]">Catégorie</TableHead>
            {MONTHS_SHORT.map((m, i) => (
              <TableHead key={i} className="text-center min-w-[100px]">{m}</TableHead>
            ))}
            <TableHead className="text-center font-bold min-w-[100px]">TOTAL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map(cat => {
            let totalPrevu = 0;
            let totalReel = 0;
            return (
              <TableRow key={cat}>
                <TableCell className="sticky left-0 bg-card z-10 text-xs font-medium">{CHARGE_CATEGORIES[cat] || cat}</TableCell>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                  const prevu = budgetMap[cat]?.[m] || 0;
                  const reel = actuals[cat]?.[m] || 0;
                  totalPrevu += prevu;
                  totalReel += reel;
                  const delta = reel - prevu;
                  return (
                    <TableCell key={m} className="p-1 text-center">
                      <Input
                        type="number"
                        className="h-7 text-xs text-center w-20 mx-auto"
                        defaultValue={prevu || ""}
                        placeholder="—"
                        onChange={e => handleChange(cat, m, e.target.value)}
                      />
                      {reel > 0 && <p className="text-[10px] text-muted-foreground italic mt-0.5">{formatEuro(reel)}</p>}
                      {prevu > 0 && reel > 0 && (
                        <Badge
                          variant={delta > 0 ? "destructive" : "outline"}
                          className="text-[9px] mt-0.5"
                        >
                          {delta > 0 ? "+" : ""}{formatEuro(delta)}
                        </Badge>
                      )}
                      {prevu > 0 && reel === 0 && (
                        <Badge variant="secondary" className="text-[9px] mt-0.5 bg-amber-100 text-amber-700">Non saisi</Badge>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center text-xs font-bold">
                  <p>{formatEuro(totalPrevu)}</p>
                  <p className="text-muted-foreground italic">{formatEuro(totalReel)}</p>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

// ─── Prefill Dialog ───
function PrefillDialog({ open, onClose, year }: { open: boolean; onClose: () => void; year: number }) {
  const { data: recurring = [] } = useRecurringCharges();
  const upsertBudget = useUpsertBudget();

  const handlePrefill = async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    let count = 0;
    for (const r of recurring) {
      for (let m = currentMonth; m <= 12; m++) {
        await upsertBudget.mutateAsync({
          annee: year,
          mois: m,
          type: "charge",
          categorie: r.categorie,
          montant_prevu: Number(r.montant),
        });
        count++;
      }
    }
    toast.success(`${count} entrées pré-remplies`);
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pré-remplir le budget ?</AlertDialogTitle>
          <AlertDialogDescription>
            Pré-remplir les mois restants de {year} avec vos {recurring.length} charges récurrentes actives ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handlePrefill}>Pré-remplir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Objectifs de CA ───
function ObjectifsCaTab({ year }: { year: number }) {
  const { data: budget = [] } = useBudgetPrevisionnel(year);
  const { data: params } = useParametresFinanciers();
  const upsertBudget = useUpsertBudget();
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Actual CA by month
  const { data: actualCA = [] } = useQuery({
    queryKey: ["financial-actual-ca-by-month", year],
    queryFn: async () => {
      const results: { month: number; total: number }[] = [];
      for (let m = 1; m <= 12; m++) {
        const start = `${year}-${String(m).padStart(2, "0")}-01`;
        const end = format(endOfMonth(new Date(year, m - 1)), "yyyy-MM-dd");
        const { data } = await supabase.from("versements").select("montant").gte("date_encaissement", start).lte("date_encaissement", end);
        results.push({ month: m, total: (data || []).reduce((s, v) => s + Number(v.montant), 0) });
      }
      return results;
    },
  });

  const formations = ["TAXI", "VTC", "VMDTR"] as const;
  const prix: Record<string, number> = {
    TAXI: params?.prix_moyen_taxi || 990,
    VTC: params?.prix_moyen_vtc || 990,
    VMDTR: params?.prix_moyen_vmdtr || 990,
  };

  // Budget CA lookup
  const budgetCA = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    budget.filter(b => b.type === "revenu").forEach(b => {
      if (!map[b.categorie]) map[b.categorie] = {};
      map[b.categorie][b.mois] = Number(b.montant_prevu);
    });
    return map;
  }, [budget]);

  const actualMap = useMemo(() => {
    const map: Record<number, number> = {};
    actualCA.forEach(a => { map[a.month] = a.total; });
    return map;
  }, [actualCA]);

  const handleChange = useCallback((formation: string, mois: number, value: string) => {
    const nbFormations = parseInt(value) || 0;
    const montant = nbFormations * (prix[formation] || 990);
    const key = `${formation}-${mois}`;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => {
      upsertBudget.mutate({ annee: year, mois, type: "revenu", categorie: formation, montant_prevu: montant });
    }, 800);
  }, [year, upsertBudget, prix]);

  // Chart data
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const prevu = formations.reduce((s, f) => s + (budgetCA[f]?.[m] || 0), 0);
      const reel = actualMap[m] || 0;
      return { month: MONTHS_SHORT[i], prevu, reel };
    });
  }, [budgetCA, actualMap]);

  return (
    <div className="space-y-6">
      <Card className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">Mois</TableHead>
              {formations.map(f => (
                <TableHead key={f} className="text-center">{f} (nb)</TableHead>
              ))}
              <TableHead className="text-center font-bold">Total prévu</TableHead>
              <TableHead className="text-center font-bold">Total réel</TableHead>
              <TableHead className="text-center">Écart</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const totalPrevu = formations.reduce((s, f) => s + (budgetCA[f]?.[m] || 0), 0);
              const totalReel = actualMap[m] || 0;
              const ecart = totalReel - totalPrevu;
              return (
                <TableRow key={m}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">{MONTHS_SHORT[i]}</TableCell>
                  {formations.map(f => {
                    const prevuMontant = budgetCA[f]?.[m] || 0;
                    const nbDefault = prix[f] > 0 ? Math.round(prevuMontant / prix[f]) : 0;
                    return (
                      <TableCell key={f} className="text-center p-1">
                        <Input
                          type="number"
                          className="h-7 text-xs text-center w-16 mx-auto"
                          defaultValue={nbDefault || ""}
                          placeholder="0"
                          onChange={e => handleChange(f, m, e.target.value)}
                        />
                        {prevuMontant > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatEuro(prevuMontant)}</p>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-semibold text-sm">{formatEuro(totalPrevu)}</TableCell>
                  <TableCell className="text-center text-sm">{formatEuro(totalReel)}</TableCell>
                  <TableCell className={`text-center font-medium text-sm ${ecart < 0 ? "text-destructive font-bold" : ecart > 0 ? "text-green-600" : ""}`}>
                    {totalPrevu > 0 || totalReel > 0 ? formatEuro(ecart) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">CA prévu vs réel</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => formatEuroShort(v)} tick={{ fontSize: 11 }} />
            <RechartsTooltip formatter={(v: number) => formatEuro(v)} />
            <Legend />
            <Bar dataKey="prevu" name="CA Prévu" fill="#93C5FD" radius={[2,2,0,0]} />
            <Bar dataKey="reel" name="CA Réel" fill="#2D5016" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
