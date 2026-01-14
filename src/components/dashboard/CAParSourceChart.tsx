import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { useCAParSource } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

export function CAParSourceChart() {
  const { data, isLoading } = useCAParSource();

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (data || []).slice(0, 6).map((item, index) => ({
    ...item,
    source: item.source.length > 12 ? item.source.slice(0, 12) + "…" : item.source,
    fullSource: item.source,
    color: COLORS[index % COLORS.length],
  }));

  const totalCA = chartData.reduce((acc, item) => acc + item.ca, 0);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          CA par source
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Aucune donnée disponible
          </div>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="source"
                    tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€`,
                      "CA",
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullSource;
                      }
                      return label;
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="ca" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total toutes sources</span>
              <span className="font-semibold">
                {totalCA.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
