import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInscriptionTrend } from "@/hooks/useDashboardStats";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users } from "lucide-react";

export function InscriptionTrendChart() {
  const { data, isLoading } = useInscriptionTrend();

  const totalInscriptions = data?.reduce((acc, m) => acc + m.inscriptions, 0) || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Évolution des inscriptions
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            6 derniers mois
          </p>
        </div>
        {!isLoading && (
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{totalInscriptions}</p>
            <p className="text-xs text-muted-foreground">inscriptions</p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="inscriptionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="moisLabel" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value: number) => [`${value} inscriptions`, "Inscriptions"]}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ 
                  borderRadius: 8, 
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))"
                }}
              />
              <Area
                type="monotone"
                dataKey="inscriptions"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#inscriptionsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
