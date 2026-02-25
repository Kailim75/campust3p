import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Users, Target } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import type { ProjectionData } from "./useFinancialProjections";

interface Props {
  data: ProjectionData | undefined;
  isLoading: boolean;
  viewMode: "executive" | "analytical";
}

function formatEuro(v: number): string {
  if (v >= 10000) return `${(v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k€`;
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`;
}

export default function FinancialProjectionsCard({ data, isLoading, viewMode }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { projections, ca_mensuel_moyen, ca_mois_courant, taux_conversion_historique, total_pipeline } = data;

  const chartData = projections.map((p) => ({
    name: p.label,
    "Pipeline IA": p.ca_pipeline,
    "Tendance historique": p.ca_historique,
    "Projection combinée": p.ca_combine,
    prospects: p.nb_prospects,
  }));

  const maxProjection = Math.max(...projections.map((p) => p.ca_combine));

  // Executive: compact KPI cards only
  if (viewMode === "executive") {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Projections CA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {projections.map((p) => (
              <div key={p.days} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{p.label}</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatEuro(p.ca_combine)}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{p.nb_prospects} prospects</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] text-muted-foreground">CA mois en cours</span>
                <p className="text-sm font-semibold text-foreground">{formatEuro(ca_mois_courant)}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Moyenne 6 mois</span>
                <p className="text-sm font-semibold text-foreground">{formatEuro(ca_mensuel_moyen)}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Conversion : {taux_conversion_historique}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Analytical: full chart + detailed breakdown
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Projections CA — 30 / 60 / 90 jours
          <Badge variant="outline" className="ml-auto text-[10px]">
            Pipeline total : {formatEuro(total_pipeline)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{formatEuro(ca_mois_courant)}</p>
            <p className="text-[10px] text-muted-foreground">CA mois en cours</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{formatEuro(ca_mensuel_moyen)}</p>
            <p className="text-[10px] text-muted-foreground">Moyenne mensuelle (6m)</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{taux_conversion_historique}%</p>
            <p className="text-[10px] text-muted-foreground">Taux conversion</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{formatEuro(maxProjection)}</p>
            <p className="text-[10px] text-muted-foreground">Projection max (90j)</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => formatEuro(v)}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatEuro(value), name]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar
                dataKey="Pipeline IA"
                fill="hsl(var(--primary))"
                fillOpacity={0.7}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Tendance historique"
                fill="hsl(var(--muted-foreground))"
                fillOpacity={0.3}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Projection combinée"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              {ca_mensuel_moyen > 0 && (
                <ReferenceLine
                  y={ca_mensuel_moyen}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  label={{
                    value: `Moy. ${formatEuro(ca_mensuel_moyen)}`,
                    position: "right",
                    fontSize: 10,
                    fill: "hsl(var(--destructive))",
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed breakdown table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Horizon</th>
                <th className="text-right p-2.5 text-xs font-medium text-muted-foreground">Pipeline IA</th>
                <th className="text-right p-2.5 text-xs font-medium text-muted-foreground">Historique</th>
                <th className="text-right p-2.5 text-xs font-medium text-muted-foreground font-semibold">Combiné</th>
                <th className="text-center p-2.5 text-xs font-medium text-muted-foreground">Prospects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projections.map((p) => (
                <tr key={p.days} className="hover:bg-muted/30">
                  <td className="p-2.5 font-medium text-foreground">{p.label}</td>
                  <td className="p-2.5 text-right text-foreground">{formatEuro(p.ca_pipeline)}</td>
                  <td className="p-2.5 text-right text-muted-foreground">{formatEuro(p.ca_historique)}</td>
                  <td className="p-2.5 text-right font-semibold text-foreground">{formatEuro(p.ca_combine)}</td>
                  <td className="p-2.5 text-center">
                    <Badge variant="outline" className="text-[10px]">{p.nb_prospects}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          Projection combinée = 60% Pipeline IA (scoring × probabilité) + 40% tendance historique (moyenne 6 mois).
        </p>
      </CardContent>
    </Card>
  );
}
