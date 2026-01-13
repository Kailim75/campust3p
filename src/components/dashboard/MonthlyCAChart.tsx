import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyCA } from "@/hooks/useDashboardStats";
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
import { TrendingUp } from "lucide-react";

export function MonthlyCAChart() {
  const { data, isLoading } = useMonthlyCA();

  const formatEuro = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalCA = data?.reduce((acc, m) => acc + m.ca, 0) || 0;
  const totalPaye = data?.reduce((acc, m) => acc + m.paye, 0) || 0;

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Chiffre d'affaires mensuel
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Évolution sur 12 mois
          </p>
        </div>
        {!isLoading && (
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{formatEuro(totalCA)}</p>
            <p className="text-xs text-muted-foreground">
              dont {formatEuro(totalPaye)} encaissé
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="moisLabel" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                formatter={(value: number) => formatEuro(value)}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ 
                  borderRadius: 8, 
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))"
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => value === "ca" ? "CA émis" : "Encaissé"}
              />
              <Bar 
                dataKey="ca" 
                name="ca"
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="paye" 
                name="paye"
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
