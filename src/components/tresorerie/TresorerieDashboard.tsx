import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useTresorerieStats, useTransactionsBancaires } from "@/hooks/useTresorerie";
import { formatEuro } from "@/lib/formatFinancial";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Upload,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMemo } from "react";

interface TresorerieDashboardProps {
  onNavigateToImport?: () => void;
}

export function TresorerieDashboard({ onNavigateToImport }: TresorerieDashboardProps) {
  const { data: stats, isLoading } = useTresorerieStats();
  const { data: allTxs } = useTransactionsBancaires();

  // Group transactions by week for chart
  const chartData = useMemo(() => {
    if (!allTxs?.length) return [];
    const grouped: Record<string, { semaine: string; credits: number; debits: number }> = {};

    allTxs.slice(0, 200).forEach((tx) => {
      const d = new Date(tx.date_operation);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const key = weekStart.toISOString().split("T")[0];
      const label = `${weekStart.getDate().toString().padStart(2, "0")}/${(weekStart.getMonth() + 1).toString().padStart(2, "0")}`;

      if (!grouped[key]) grouped[key] = { semaine: label, credits: 0, debits: 0 };
      if (tx.montant > 0) grouped[key].credits += Number(tx.montant);
      else grouped[key].debits += Math.abs(Number(tx.montant));
    });

    return Object.values(grouped).reverse().slice(-12);
  }, [allTxs]);

  const hasNoData = !isLoading && (!allTxs || allTxs.length === 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // === ONBOARDING: no bank data ===
  if (hasNoData) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg font-semibold text-foreground">Trésorerie non configurée</h3>
            <p className="text-sm text-muted-foreground">
              Importez votre premier relevé bancaire pour activer le suivi de trésorerie : solde, flux, rapprochement.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg mt-2">
            <div className="flex items-start gap-2 text-left p-3 rounded-lg bg-muted/50">
              <div className="p-1.5 rounded bg-primary/10 shrink-0 mt-0.5">
                <Upload className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium">1. Importer</p>
                <p className="text-[11px] text-muted-foreground">Relevé CSV (format BNP)</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-left p-3 rounded-lg bg-muted/50">
              <div className="p-1.5 rounded bg-primary/10 shrink-0 mt-0.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium">2. Vérifier</p>
                <p className="text-[11px] text-muted-foreground">Aperçu avant validation</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-left p-3 rounded-lg bg-muted/50">
              <div className="p-1.5 rounded bg-primary/10 shrink-0 mt-0.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium">3. Analyser</p>
                <p className="text-[11px] text-muted-foreground">Solde, flux, rapprochement</p>
              </div>
            </div>
          </div>
          {onNavigateToImport ? (
            <Button onClick={onNavigateToImport} className="mt-2">
              <Upload className="h-4 w-4 mr-2" />
              Importer un relevé bancaire
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              Rendez-vous dans l'onglet « Import relevés » pour commencer.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    {
      title: "Solde actuel",
      value: formatEuro(stats?.dernierSolde || 0),
      icon: Wallet,
      color: (stats?.dernierSolde || 0) >= 0 ? "text-success" : "text-destructive",
      bg: (stats?.dernierSolde || 0) >= 0 ? "bg-success/10" : "bg-destructive/10",
      sub: stats?.dateDernierSolde ? `au ${new Date(stats.dateDernierSolde).toLocaleDateString("fr-FR")}` : "Non renseigné",
    },
    {
      title: "Entrées du mois",
      value: formatEuro(stats?.totalCredits || 0),
      icon: ArrowUpCircle,
      color: "text-success",
      bg: "bg-success/10",
      sub: `${stats?.nbTransactions || 0} transactions`,
    },
    {
      title: "Sorties du mois",
      value: formatEuro(stats?.totalDebits || 0),
      icon: ArrowDownCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      sub: `Solde net : ${formatEuro(stats?.soldeNet || 0)}`,
    },
    {
      title: "Rapprochement",
      value: `${stats?.tauxRapprochement || 0}%`,
      icon: stats?.tauxRapprochement === 100 ? CheckCircle2 : AlertTriangle,
      color: (stats?.tauxRapprochement || 0) >= 80 ? "text-success" : "text-warning",
      bg: (stats?.tauxRapprochement || 0) >= 80 ? "bg-success/10" : "bg-warning/10",
      sub: `${stats?.nbNonRapproche || 0} non rapproché(s)`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-lg", kpi.bg)}>
                  <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{kpi.title}</p>
                  <p className={cn("text-lg font-bold", kpi.color)}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{kpi.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Taux de rapprochement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Taux de rapprochement bancaire</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={stats?.tauxRapprochement || 0} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{stats?.nbRapproche || 0} rapproché(s)</span>
            <span>{stats?.nbNonRapproche || 0} en attente</span>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Flux de trésorerie par semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="semaine" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatEuro(value)}
                    labelFormatter={(label) => `Semaine du ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="credits" name="Entrées" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="debits" name="Sorties" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
