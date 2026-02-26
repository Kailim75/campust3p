import { useState, useMemo, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RefreshCw, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, HelpCircle, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Line, ComposedChart, ReferenceLine, Area, AreaChart,
} from "recharts";
import { toast } from "sonner";
import { format, endOfMonth } from "date-fns";
import { formatEuro, formatEuroShort, formatPct, CHARGE_CATEGORIES } from "@/lib/formatFinancial";
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
    <div className="space-y-6">
      {/* Year navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setYear(y => y - 1)}>&lt;</Button>
        <span className="text-lg font-display font-bold w-16 text-center">{year}</span>
        <Button variant="outline" size="sm" onClick={() => setYear(y => y + 1)}>&gt;</Button>
      </div>

      {/* KPIs Synthèse */}
      <SyntheseKPIs year={year} />

      {/* Tabs */}
      <Tabs defaultValue="objectifs-ca" className="space-y-4">
        <TabsList>
          <TabsTrigger value="objectifs-ca">Objectifs de CA</TabsTrigger>
          <TabsTrigger value="charges-prev">Charges prévisionnelles</TabsTrigger>
          <TabsTrigger value="projection">Projection Résultat</TabsTrigger>
        </TabsList>

        <TabsContent value="objectifs-ca">
          <ObjectifsCaTab year={year} />
        </TabsContent>

        <TabsContent value="charges-prev">
          <ChargesPrevTab year={year} onPrefill={() => setShowPrefill(true)} />
          <PrefillDialog open={showPrefill} onClose={() => setShowPrefill(false)} year={year} />
        </TabsContent>

        <TabsContent value="projection">
          <ProjectionTab year={year} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── KPIs Synthèse ───
function SyntheseKPIs({ year }: { year: number }) {
  const { data: budget = [] } = useBudgetPrevisionnel(year);
  const { data: params } = useParametresFinanciers();
  const currentMonth = new Date().getMonth() + 1;
  const isCurrentYear = year === new Date().getFullYear();

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

  const { data: actualCharges = [] } = useQuery({
    queryKey: ["financial-actual-charges-by-month", year],
    queryFn: async () => {
      const results: { month: number; total: number }[] = [];
      for (let m = 1; m <= 12; m++) {
        const start = `${year}-${String(m).padStart(2, "0")}-01`;
        const end = format(endOfMonth(new Date(year, m - 1)), "yyyy-MM-dd");
        const { data } = await supabase.from("charges").select("montant").gte("date_charge", start).lte("date_charge", end).eq("statut", "active" as any);
        results.push({ month: m, total: (data || []).reduce((s, v) => s + Number(v.montant), 0) });
      }
      return results;
    },
  });

  const kpis = useMemo(() => {
    const totalCAPrev = budget.filter(b => b.type === "revenu").reduce((s, b) => s + Number(b.montant_prevu), 0);
    const totalChargesPrev = budget.filter(b => b.type === "charge").reduce((s, b) => s + Number(b.montant_prevu), 0);
    const resultatPrev = totalCAPrev - totalChargesPrev;

    const totalCAReel = actualCA.reduce((s, a) => s + a.total, 0);
    const totalChargesReel = actualCharges.reduce((s, a) => s + a.total, 0);
    const resultatReel = totalCAReel - totalChargesReel;

    const tauxRealCA = totalCAPrev > 0 ? (totalCAReel / totalCAPrev) * 100 : 0;
    const ecartCA = totalCAReel - totalCAPrev;

    // Months elapsed for progress tracking
    const monthsElapsed = isCurrentYear ? currentMonth : 12;
    const progressAttendu = (monthsElapsed / 12) * 100;

    return {
      totalCAPrev, totalChargesPrev, resultatPrev,
      totalCAReel, totalChargesReel, resultatReel,
      tauxRealCA, ecartCA, progressAttendu, monthsElapsed,
    };
  }, [budget, actualCA, actualCharges, isCurrentYear, currentMonth]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CA Prévu annuel */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CA Prévu {year}</p>
        </div>
        <p className="text-xl font-display font-bold text-foreground">{formatEuro(kpis.totalCAPrev)}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Réalisé</span>
            <span className="font-medium text-foreground">{formatPct(kpis.tauxRealCA)}</span>
          </div>
          <Progress value={kpis.tauxRealCA} className="h-1.5" />
        </div>
      </Card>

      {/* CA Réel cumulé */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CA Réel cumulé</p>
        </div>
        <p className="text-xl font-display font-bold text-foreground">{formatEuro(kpis.totalCAReel)}</p>
        <p className={`text-xs font-medium ${kpis.ecartCA >= 0 ? "text-green-600" : "text-destructive"}`}>
          {kpis.ecartCA >= 0 ? "+" : ""}{formatEuro(kpis.ecartCA)} vs objectif
        </p>
      </Card>

      {/* Résultat prévu */}
      <Card className={`p-4 space-y-2 ${kpis.resultatPrev >= 0 ? "bg-green-50/50 dark:bg-green-950/20" : "bg-red-50/50 dark:bg-red-950/20"}`}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Résultat Prévu</p>
        <p className={`text-xl font-display font-bold ${kpis.resultatPrev < 0 ? "text-destructive" : "text-foreground"}`}>
          {formatEuro(kpis.resultatPrev)}
        </p>
        <div className="flex items-center gap-1.5">
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Réel : <span className={`font-medium ${kpis.resultatReel < 0 ? "text-destructive" : "text-green-600"}`}>{formatEuro(kpis.resultatReel)}</span></span>
        </div>
      </Card>

      {/* Indicateur d'avance/retard */}
      <Card className="p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rythme</p>
        {(() => {
          const attendu = (kpis.monthsElapsed / 12) * kpis.totalCAPrev;
          const delta = kpis.totalCAReel - attendu;
          const enAvance = delta >= 0;
          return (
            <>
              <div className="flex items-center gap-2">
                {enAvance ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <span className={`text-lg font-bold ${enAvance ? "text-green-600" : "text-amber-600"}`}>
                  {enAvance ? "En avance" : "En retard"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {enAvance ? "+" : ""}{formatEuro(delta)} vs rythme attendu ({kpis.monthsElapsed}/12 mois)
              </p>
            </>
          );
        })()}
      </Card>
    </div>
  );
}

// ─── Charges Prévisionnelles ───
function ChargesPrevTab({ year, onPrefill }: { year: number; onPrefill: () => void }) {
  const { data: budget = [], isLoading } = useBudgetPrevisionnel(year);
  const { data: allCharges = [] } = useAllCharges();
  const upsertBudget = useUpsertBudget();
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

  const budgetMap = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    budget.filter(b => b.type === "charge").forEach(b => {
      if (!map[b.categorie]) map[b.categorie] = {};
      map[b.categorie][b.mois] = Number(b.montant_prevu);
    });
    return map;
  }, [budget]);

  // Totaux par mois
  const monthTotals = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      let prevu = 0, reel = 0;
      categories.forEach(cat => {
        prevu += budgetMap[cat]?.[m] || 0;
        reel += actuals[cat]?.[m] || 0;
      });
      return { prevu, reel };
    });
  }, [categories, budgetMap, actuals]);

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
        <TableFooter>
          <TableRow className="bg-muted/50 font-bold">
            <TableCell className="sticky left-0 bg-muted/50 z-10 text-xs">TOTAL</TableCell>
            {monthTotals.map((t, i) => (
              <TableCell key={i} className="text-center text-xs">
                <p>{formatEuro(t.prevu)}</p>
                <p className="text-muted-foreground italic font-normal">{formatEuro(t.reel)}</p>
              </TableCell>
            ))}
            <TableCell className="text-center text-xs">
              <p>{formatEuro(monthTotals.reduce((s, t) => s + t.prevu, 0))}</p>
              <p className="text-muted-foreground italic font-normal">{formatEuro(monthTotals.reduce((s, t) => s + t.reel, 0))}</p>
            </TableCell>
          </TableRow>
        </TableFooter>
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

  const formations = ["TAXI", "VTC", "VMDTR", "Recyclage"] as const;
  const prix: Record<string, number> = {
    TAXI: params?.prix_moyen_taxi || 990,
    VTC: params?.prix_moyen_vtc || 990,
    VMDTR: params?.prix_moyen_vmdtr || 990,
    Recyclage: params?.prix_moyen_recyclage || 350,
  };

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

  // Chart data with cumulative
  const chartData = useMemo(() => {
    let cumulPrevu = 0;
    let cumulReel = 0;
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const prevu = formations.reduce((s, f) => s + (budgetCA[f]?.[m] || 0), 0);
      const reel = actualMap[m] || 0;
      cumulPrevu += prevu;
      cumulReel += reel;
      return { month: MONTHS_SHORT[i], prevu, reel, cumulPrevu, cumulReel };
    });
  }, [budgetCA, actualMap]);

  // Row totals
  const yearTotals = useMemo(() => {
    const formTotals: Record<string, { prevu: number; nb: number }> = {};
    formations.forEach(f => {
      let total = 0;
      let nb = 0;
      for (let m = 1; m <= 12; m++) {
        const prevuMontant = budgetCA[f]?.[m] || 0;
        total += prevuMontant;
        nb += prix[f] > 0 ? Math.round(prevuMontant / prix[f]) : 0;
      }
      formTotals[f] = { prevu: total, nb };
    });
    return formTotals;
  }, [budgetCA, formations, prix]);

  return (
    <div className="space-y-6">
      <Card className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">Mois</TableHead>
              {formations.map(f => (
                <TableHead key={f} className="text-center">
                  <div className="flex flex-col items-center">
                    <span>{f}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{formatEuro(prix[f])}/formation</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center font-bold">Total prévu</TableHead>
              <TableHead className="text-center font-bold">Total réel</TableHead>
              <TableHead className="text-center">Écart</TableHead>
              <TableHead className="text-center">Réalisation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const totalPrevu = formations.reduce((s, f) => s + (budgetCA[f]?.[m] || 0), 0);
              const totalReel = actualMap[m] || 0;
              const ecart = totalReel - totalPrevu;
              const pctReal = totalPrevu > 0 ? (totalReel / totalPrevu) * 100 : 0;
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
                  <TableCell className="text-center">
                    {totalPrevu > 0 ? (
                      <div className="flex items-center gap-1.5 justify-center">
                        <Progress value={Math.min(pctReal, 100)} className="h-1.5 w-12" />
                        <span className={`text-xs font-medium ${pctReal >= 100 ? "text-green-600" : pctReal >= 60 ? "text-foreground" : "text-destructive"}`}>
                          {formatPct(pctReal)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-bold">
              <TableCell className="sticky left-0 bg-muted/50 z-10 text-xs">TOTAL</TableCell>
              {formations.map(f => (
                <TableCell key={f} className="text-center text-xs">
                  <p>{yearTotals[f]?.nb || 0} formations</p>
                  <p className="text-muted-foreground font-normal">{formatEuro(yearTotals[f]?.prevu || 0)}</p>
                </TableCell>
              ))}
              <TableCell className="text-center text-xs">{formatEuro(chartData[11]?.cumulPrevu || 0)}</TableCell>
              <TableCell className="text-center text-xs">{formatEuro(chartData[11]?.cumulReel || 0)}</TableCell>
              <TableCell className={`text-center text-xs ${(chartData[11]?.cumulReel || 0) - (chartData[11]?.cumulPrevu || 0) < 0 ? "text-destructive" : "text-green-600"}`}>
                {formatEuro((chartData[11]?.cumulReel || 0) - (chartData[11]?.cumulPrevu || 0))}
              </TableCell>
              <TableCell className="text-center text-xs">
                {(chartData[11]?.cumulPrevu || 0) > 0 ? formatPct(((chartData[11]?.cumulReel || 0) / (chartData[11]?.cumulPrevu || 0)) * 100) : "—"}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* Dual Chart: bars + cumulative line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">CA mensuel : prévu vs réel</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => formatEuroShort(v)} tick={{ fontSize: 11 }} />
              <RechartsTooltip formatter={(v: number) => formatEuro(v)} />
              <Legend />
              <Bar dataKey="prevu" name="Prévu" fill="hsl(var(--primary) / 0.3)" radius={[2,2,0,0]} />
              <Bar dataKey="reel" name="Réel" fill="hsl(var(--primary))" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">CA cumulé : trajectoire</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => formatEuroShort(v)} tick={{ fontSize: 11 }} />
              <RechartsTooltip formatter={(v: number) => formatEuro(v)} />
              <Legend />
              <Area type="monotone" dataKey="cumulPrevu" name="Objectif cumulé" stroke="#93C5FD" fill="#93C5FD" fillOpacity={0.15} strokeWidth={2} strokeDasharray="5 5" />
              <Area type="monotone" dataKey="cumulReel" name="Réel cumulé" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── Projection Résultat ───
function ProjectionTab({ year }: { year: number }) {
  const { data: budget = [] } = useBudgetPrevisionnel(year);

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

  const { data: actualCharges = [] } = useQuery({
    queryKey: ["financial-actual-charges-by-month", year],
    queryFn: async () => {
      const results: { month: number; total: number }[] = [];
      for (let m = 1; m <= 12; m++) {
        const start = `${year}-${String(m).padStart(2, "0")}-01`;
        const end = format(endOfMonth(new Date(year, m - 1)), "yyyy-MM-dd");
        const { data } = await supabase.from("charges").select("montant").gte("date_charge", start).lte("date_charge", end).eq("statut", "active" as any);
        results.push({ month: m, total: (data || []).reduce((s, v) => s + Number(v.montant), 0) });
      }
      return results;
    },
  });

  const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() + 1 : 12;

  const chartData = useMemo(() => {
    const budgetCAMap: Record<number, number> = {};
    const budgetChargesMap: Record<number, number> = {};
    budget.forEach(b => {
      if (b.type === "revenu") budgetCAMap[b.mois] = (budgetCAMap[b.mois] || 0) + Number(b.montant_prevu);
      if (b.type === "charge") budgetChargesMap[b.mois] = (budgetChargesMap[b.mois] || 0) + Number(b.montant_prevu);
    });

    const actualCAMap: Record<number, number> = {};
    actualCA.forEach(a => { actualCAMap[a.month] = a.total; });
    const actualChargesMap: Record<number, number> = {};
    actualCharges.forEach(a => { actualChargesMap[a.month] = a.total; });

    let cumulResultatReel = 0;
    let cumulResultatPrevu = 0;

    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const isPast = m <= currentMonth;
      const caReel = actualCAMap[m] || 0;
      const chargesReel = actualChargesMap[m] || 0;
      const caPrevu = budgetCAMap[m] || 0;
      const chargesPrevu = budgetChargesMap[m] || 0;

      const resultatReel = isPast ? caReel - chargesReel : undefined;
      const resultatPrevu = caPrevu - chargesPrevu;

      cumulResultatPrevu += resultatPrevu;
      if (isPast) cumulResultatReel += (resultatReel || 0);

      return {
        month: MONTHS_SHORT[i],
        resultatPrevu,
        resultatReel: isPast ? resultatReel : undefined,
        cumulPrevu: cumulResultatPrevu,
        cumulReel: isPast ? cumulResultatReel : undefined,
        caPrevu,
        chargesPrevu,
        caReel: isPast ? caReel : undefined,
        chargesReel: isPast ? chargesReel : undefined,
      };
    });
  }, [budget, actualCA, actualCharges, currentMonth]);

  const annualPrevu = chartData[11]?.cumulPrevu || 0;
  const annualReel = chartData.reduce((s, d) => s + (d.resultatReel || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Résultat annuel prévu</p>
          <p className={`text-2xl font-display font-bold mt-1 ${annualPrevu < 0 ? "text-destructive" : "text-foreground"}`}>
            {formatEuro(annualPrevu)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Résultat réel (à ce jour)</p>
          <p className={`text-2xl font-display font-bold mt-1 ${annualReel < 0 ? "text-destructive" : "text-green-600"}`}>
            {formatEuro(annualReel)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Écart cumulé</p>
          <p className={`text-2xl font-display font-bold mt-1 ${annualReel - (chartData[currentMonth - 1]?.cumulPrevu || 0) < 0 ? "text-destructive" : "text-green-600"}`}>
            {formatEuro(annualReel - (chartData[currentMonth - 1]?.cumulPrevu || 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">vs objectif à {MONTHS_SHORT[currentMonth - 1]}</p>
        </Card>
      </div>

      {/* Monthly detail table */}
      <Card className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">Mois</TableHead>
              <TableHead className="text-center">CA Prévu</TableHead>
              <TableHead className="text-center">CA Réel</TableHead>
              <TableHead className="text-center">Charges Prévues</TableHead>
              <TableHead className="text-center">Charges Réelles</TableHead>
              <TableHead className="text-center font-bold">Résultat Prévu</TableHead>
              <TableHead className="text-center font-bold">Résultat Réel</TableHead>
              <TableHead className="text-center">Cumul Prévu</TableHead>
              <TableHead className="text-center">Cumul Réel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map((d, i) => {
              const isPast = i < currentMonth;
              return (
                <TableRow key={i} className={!isPast ? "opacity-50" : ""}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">{d.month}</TableCell>
                  <TableCell className="text-center text-sm">{formatEuro(d.caPrevu)}</TableCell>
                  <TableCell className="text-center text-sm">{isPast ? formatEuro(d.caReel || 0) : "—"}</TableCell>
                  <TableCell className="text-center text-sm">{formatEuro(d.chargesPrevu)}</TableCell>
                  <TableCell className="text-center text-sm">{isPast ? formatEuro(d.chargesReel || 0) : "—"}</TableCell>
                  <TableCell className={`text-center text-sm font-semibold ${d.resultatPrevu < 0 ? "text-destructive" : ""}`}>{formatEuro(d.resultatPrevu)}</TableCell>
                  <TableCell className={`text-center text-sm font-semibold ${isPast && (d.resultatReel || 0) < 0 ? "text-destructive" : isPast ? "text-green-600" : ""}`}>
                    {isPast ? formatEuro(d.resultatReel || 0) : "—"}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{formatEuro(d.cumulPrevu)}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{isPast ? formatEuro(d.cumulReel || 0) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Trajectoire du résultat cumulé</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => formatEuroShort(v)} tick={{ fontSize: 11 }} />
            <RechartsTooltip formatter={(v: number) => formatEuro(v)} />
            <Legend />
            <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="5 5" />
            <Bar dataKey="resultatPrevu" name="Résultat mensuel prévu" fill="hsl(var(--primary) / 0.2)" radius={[2,2,0,0]} />
            <Bar dataKey="resultatReel" name="Résultat mensuel réel" fill="hsl(var(--primary))" radius={[2,2,0,0]} />
            <Line type="monotone" dataKey="cumulPrevu" name="Cumul prévu" stroke="#93C5FD" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="cumulReel" name="Cumul réel" stroke="#1F2937" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
