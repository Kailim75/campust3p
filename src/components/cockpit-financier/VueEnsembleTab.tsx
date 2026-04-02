import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { HelpCircle, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Legend, PieChart, Pie, Cell,
} from "recharts";
import { formatEuro, formatEuroShort, formatPct, computeDelta, CHARGE_CATEGORIES, MODE_VERSEMENT_LABELS, FORMATION_LABELS } from "@/lib/formatFinancial";
import type { PeriodRange } from "@/hooks/useFinancialData";
import { useVersements, useVersementsPrev, useCharges, useChargesPrev, useParametresFinanciers, use12MonthsHistory, useVersementsEnriched } from "@/hooks/useFinancialData";

const DONUT_COLORS = ["#2D5016", "#4A7C28", "#6BA33A", "#8ECC5B", "#B5E089", "#D4EEBC"];
const CHARGE_DONUT_COLORS = ["#EF4444", "#F87171", "#FCA5A5", "#FECACA", "#FEE2E2", "#FFF1F2"];

interface Props {
  range: PeriodRange;
}

export function VueEnsembleTab({ range }: Props) {
  const { data: versements = [], isLoading: loadingV } = useVersements(range);
  const { data: versPrev = [] } = useVersementsPrev(range);
  const { data: charges = [], isLoading: loadingC } = useCharges(range);
  const { data: chargesPrev = [] } = useChargesPrev(range);
  const { data: params } = useParametresFinanciers();
  const { data: history = [], isLoading: loadingH } = use12MonthsHistory();
  const { data: versementsEnriched = [] } = useVersementsEnriched(range);

  const kpis = useMemo(() => {
    const ca = versements.reduce((s, v) => s + Number(v.montant), 0);
    const caPrev = versPrev.reduce((s, v) => s + Number(v.montant), 0);

    // CA by mode
    const byMode: Record<string, number> = {};
    versements.forEach(v => { byMode[v.mode] = (byMode[v.mode] || 0) + Number(v.montant); });
    const caTraditional = (byMode["especes"] || 0) + (byMode["cb"] || 0) + (byMode["virement"] || 0);
    const caAlma = byMode["alma"] || 0;
    const caCpf = byMode["cpf"] || 0;

    const activeCharges = charges.filter(c => c.statut === "active");
    const totalCharges = activeCharges.reduce((s, c) => s + Number(c.montant), 0);
    const chargesFixes = activeCharges.filter(c => c.type_charge === "fixe").reduce((s, c) => s + Number(c.montant), 0);
    const chargesVars = activeCharges.filter(c => c.type_charge === "variable").reduce((s, c) => s + Number(c.montant), 0);
    const totalChargesPrev = chargesPrev.reduce((s, c) => s + Number(c.montant), 0);

    const resultat = ca - totalCharges;
    const resultatPrev = caPrev - totalChargesPrev;
    const marge = ca > 0 ? (resultat / ca) * 100 : 0;

    // Seuil de rentabilité
    const prixMoyen = params
      ? ((params.prix_moyen_taxi || 990) + (params.prix_moyen_vtc || 990) + (params.prix_moyen_vmdtr || 990)) / 3
      : 990;
    const seuil = prixMoyen > 0 ? Math.ceil(chargesFixes / prixMoyen) : 0;
    const vendues = versements.length;
    const seuilPct = seuil > 0 ? Math.min((vendues / seuil) * 100, 100) : 0;

    return {
      ca, caPrev, caTraditional, caAlma, caCpf,
      totalCharges, totalChargesPrev, chargesFixes, chargesVars,
      resultat, resultatPrev, marge,
      seuil, vendues, seuilPct, prixMoyen,
    };
  }, [versements, versPrev, charges, chargesPrev, params]);

  // Revenue by formation type
  const revenueByFormation = useMemo(() => {
    const map: Record<string, number> = {};
    versementsEnriched.forEach(v => {
      const key = v.formation || "Autre";
      map[key] = (map[key] || 0) + Number(v.montant);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: FORMATION_LABELS[name] || name, value }))
      .sort((a, b) => b.value - a.value);
  }, [versementsEnriched]);

  // Charges by category
  const chargesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    charges.filter(c => c.statut === "active").forEach(c => {
      const key = c.categorie;
      map[key] = (map[key] || 0) + Number(c.montant);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5).map(([name, value]) => ({
      name: CHARGE_CATEGORIES[name] || name, value,
    }));
    const others = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    if (others > 0) top5.push({ name: "Autres", value: others });
    return top5;
  }, [charges]);

  const isLoading = loadingV || loadingC;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  // Detect partial month (first 5 days)
  const dayOfMonth = new Date().getDate();
  const isPartialMonth = dayOfMonth <= 5;

  const caD = computeDelta(kpis.ca, kpis.caPrev);
  const chD = computeDelta(kpis.totalCharges, kpis.totalChargesPrev);
  const resD = computeDelta(kpis.resultat, kpis.resultatPrev);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA Encaissé */}
        <Card className="p-5 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CA Encaissé</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{formatEuro(kpis.ca)}</p>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <p>Espèces/CB/Virement : {formatEuro(kpis.caTraditional)}</p>
            <p>Alma : {formatEuro(kpis.caAlma)}</p>
            <p>CPF : {formatEuro(kpis.caCpf)}</p>
          </div>
          {caD !== null && <DeltaBadge delta={caD} isPartial={isPartialMonth} />}
        </Card>

        {/* Charges */}
        <Card className="p-5 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Charges Totales</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{formatEuro(kpis.totalCharges)}</p>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <p>Fixes : {formatEuro(kpis.chargesFixes)}</p>
            <p>Variables : {formatEuro(kpis.chargesVars)}</p>
          </div>
          {chD !== null && <DeltaBadge delta={chD} invert isPartial={isPartialMonth} />}
        </Card>

        {/* Résultat */}
        <Card className={`p-5 ${kpis.resultat >= 0 ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Résultat Net</p>
          <p className={`text-2xl font-display font-bold mt-1 ${kpis.resultat < 0 ? "text-destructive" : "text-foreground"}`}>
            {formatEuro(kpis.resultat)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Marge nette : {formatPct(kpis.marge)}</p>
          {kpis.resultat < 0 ? (
            <Badge variant="destructive" className="mt-2 animate-pulse">⚠️ Déficit</Badge>
          ) : (
            <Badge className="mt-2 bg-green-600 text-white hover:bg-green-700">✅ Bénéficiaire</Badge>
          )}
          {resD !== null && <DeltaBadge delta={resD} className="mt-1" isPartial={isPartialMonth} />}
        </Card>

        {/* Seuil de rentabilité */}
        <Card className="p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Seuil de Rentabilité</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Nombre de formations à vendre pour couvrir vos charges fixes. Basé sur un prix moyen de {formatEuro(kpis.prixMoyen)} et {formatEuro(kpis.chargesFixes)} de charges fixes.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-display font-bold text-foreground mt-1">
            {kpis.vendues} / {kpis.seuil} formations
          </p>
          <Progress
            value={kpis.seuilPct}
            className="mt-3 h-2"
            style={{
              // @ts-ignore
              "--progress-background": kpis.seuilPct < 50 ? "#EF4444" : kpis.seuilPct < 80 ? "#F59E0B" : "#22C55E",
            } as React.CSSProperties}
          />
        </Card>
      </div>

      {/* 12-Month Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Évolution sur 12 mois</h3>
        {history.length < 2 ? (
          <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
            Pas encore assez de données pour le graphique
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatEuroShort(v)} tick={{ fontSize: 11 }} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  formatEuro(value),
                  name === "ca" ? "CA Encaissé" : name === "charges" ? "Charges" : "Résultat",
                ]}
              />
              <Legend formatter={(v) => v === "ca" ? "CA Encaissé" : v === "charges" ? "Charges" : "Résultat"} />
              <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="5 5" />
              <Bar dataKey="ca" stackId="a" fill="#2D5016" name="ca" radius={[2,2,0,0]} />
              <Bar dataKey="charges" stackId="b" fill="#EF4444" name="charges" radius={[2,2,0,0]} />
              <Line type="monotone" dataKey="resultat" stroke="#1F2937" strokeWidth={2} dot={false} name="resultat" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue by formation */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenus par type de formation</h3>
          {revenueByFormation.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Aucun revenu sur cette période
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={revenueByFormation} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                    {revenueByFormation.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => formatEuro(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {revenueByFormation.map((item, i) => {
                  const total = revenueByFormation.reduce((s, r) => s + r.value, 0);
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="flex-1 text-muted-foreground truncate">{item.name}</span>
                      <span className="font-medium">{formatEuro(item.value)}</span>
                      <span className="text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Charges by category */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Charges par catégorie</h3>
          {chargesByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Aucune charge saisie sur cette période
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={chargesByCategory} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                    {chargesByCategory.map((_, i) => (
                      <Cell key={i} fill={CHARGE_DONUT_COLORS[i % CHARGE_DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => formatEuro(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {chargesByCategory.map((item, i) => {
                  const total = chargesByCategory.reduce((s, r) => s + r.value, 0);
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHARGE_DONUT_COLORS[i % CHARGE_DONUT_COLORS.length] }} />
                      <span className="flex-1 text-muted-foreground truncate">{item.name}</span>
                      <span className="font-medium">{formatEuro(item.value)}</span>
                      <span className="text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DeltaBadge({ delta, invert, className, isPartial }: { delta: number; invert?: boolean; className?: string; isPartial?: boolean }) {
  if (isPartial) {
    return (
      <div className={`flex items-center gap-1 text-xs font-medium text-muted-foreground ${className || ""}`}>
        <span>en cours (partiel)</span>
      </div>
    );
  }
  const positive = invert ? delta < 0 : delta >= 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-green-600" : "text-destructive"} ${className || ""}`}>
      {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{delta >= 0 ? "+" : ""}{delta}% vs période préc.</span>
    </div>
  );
}
