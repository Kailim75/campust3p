import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, Euro, TrendingUp, TrendingDown, Target, Wallet,
  BarChart3 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FinancialSynthesis, useFinancial12MonthsHistory } from "@/hooks/useFinancialCockpit";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Line, ComposedChart } from "recharts";

interface Props {
  synthesis: FinancialSynthesis | null;
}

const formatEuro = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

function KPICard({ 
  title, value, icon: Icon, variant = "default", suffix 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  variant?: "default" | "success" | "warning" | "danger";
  suffix?: string;
}) {
  const colors = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">
              {value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
            </p>
          </div>
          <div className={cn("p-2 rounded-lg", colors[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SyntheseTab({ synthesis }: Props) {
  const { data: history, isLoading: historyLoading } = useFinancial12MonthsHistory();

  if (!synthesis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const chartConfig = {
    totalCA: { label: "CA encaissé", color: "hsl(var(--primary))" },
    studentsCount: { label: "Élèves", color: "hsl(var(--success))" },
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Élèves du mois"
          value={synthesis.studentsCount}
          icon={Users}
          variant="default"
        />
        <KPICard
          title="CA encaissé"
          value={formatEuro(synthesis.totalCA)}
          icon={Euro}
          variant="success"
        />
        <KPICard
          title="Résultat"
          value={formatEuro(synthesis.resultat)}
          icon={synthesis.resultat >= 0 ? TrendingUp : TrendingDown}
          variant={synthesis.resultat >= 0 ? "success" : "danger"}
        />
        <KPICard
          title="Marge"
          value={synthesis.margePct.toFixed(1)}
          suffix="%"
          icon={TrendingUp}
          variant={synthesis.margePct >= 20 ? "success" : synthesis.margePct >= 0 ? "warning" : "danger"}
        />
        <KPICard
          title="Coût/élève"
          value={formatEuro(synthesis.coutReelParEleve)}
          icon={Target}
        />
        <KPICard
          title="Cashflow"
          value={formatEuro(synthesis.cashflow)}
          icon={Wallet}
          variant={synthesis.cashflow >= 0 ? "success" : "danger"}
        />
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Seuil de rentabilité</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.ceil(synthesis.seuilRentabilite)} <span className="text-sm font-normal text-muted-foreground">élèves</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              Prix moyen : {formatEuro(synthesis.prixMoyen)} · Marge contributive : {formatEuro(synthesis.margeContributive)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Charges fixes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatEuro(synthesis.totalFixed)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Par élève : {formatEuro(synthesis.fixeParEleve)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Charges variables</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatEuro(synthesis.totalVariable)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Par élève : {formatEuro(synthesis.variableParEleve)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 12 months chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Évolution 12 mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-64">
              <ComposedChart data={history || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="left" dataKey="totalCA" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="CA encaissé" />
                <Line yAxisId="right" type="monotone" dataKey="studentsCount" stroke="hsl(var(--success))" strokeWidth={2} name="Élèves" dot={{ r: 3 }} />
              </ComposedChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
