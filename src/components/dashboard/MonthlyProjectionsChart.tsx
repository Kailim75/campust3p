import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMonthlyProjections } from "@/hooks/useAdvancedStats";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Calendar, TrendingUp, Euro, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthlyProjectionsChartProps {
  onClick?: () => void;
}

export function MonthlyProjectionsChart({ onClick }: MonthlyProjectionsChartProps) {
  const { data, isLoading } = useMonthlyProjections();

  const formatEuro = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalConfirme = data?.reduce((acc, m) => acc + m.caConfirme, 0) || 0;
  const totalPotentiel = data?.reduce((acc, m) => acc + m.caPotentiel, 0) || 0;
  const totalInscriptions = data?.reduce((acc, m) => acc + m.inscriptionsCount, 0) || 0;

  if (isLoading) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "col-span-full lg:col-span-2",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Projections mensuelles
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Prévisions sur 6 mois
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{formatEuro(totalConfirme)}</p>
            <p className="text-xs text-muted-foreground">Confirmé</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-success">{formatEuro(totalPotentiel)}</p>
            <p className="text-xs text-muted-foreground">Potentiel</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
            <Euro className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{formatEuro(totalConfirme)}</p>
            <p className="text-xs text-muted-foreground">CA Confirmé</p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border border-success/10 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-success mb-1" />
            <p className="text-lg font-bold">{formatEuro(totalPotentiel - totalConfirme)}</p>
            <p className="text-xs text-muted-foreground">À capturer</p>
          </div>
          <div className="p-3 rounded-lg bg-info/5 border border-info/10 text-center">
            <Users className="h-4 w-4 mx-auto text-info mb-1" />
            <p className="text-lg font-bold">{totalInscriptions}</p>
            <p className="text-xs text-muted-foreground">Inscrits</p>
          </div>
        </div>

        {/* Area Chart */}
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConfirme" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPotentiel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="moisLabel" 
              tick={{ fontSize: 10 }} 
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
            <Legend verticalAlign="top" height={36} />
            <Area 
              type="monotone" 
              dataKey="caPotentiel" 
              name="Potentiel"
              stroke="hsl(var(--success))" 
              fillOpacity={1} 
              fill="url(#colorPotentiel)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="caConfirme" 
              name="Confirmé"
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorConfirme)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProjectionDetailsTable() {
  const { data, isLoading } = useMonthlyProjections();

  const formatEuro = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Détail des projections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data?.slice(0, 4).map((month, index) => {
            const fillRate = month.caPotentiel > 0 
              ? Math.round((month.caConfirme / month.caPotentiel) * 100) 
              : 0;
            
            return (
              <div 
                key={month.mois}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  index === 0 ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                )}
              >
                <div>
                  <p className="font-medium text-sm capitalize">{month.moisLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {month.sessionsCount} session(s) • {month.inscriptionsCount} inscrits
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatEuro(month.caConfirme)}</p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        fillRate >= 80 ? "bg-success/10 text-success" :
                        fillRate >= 50 ? "bg-warning/10 text-warning" : "bg-muted"
                      )}
                    >
                      {fillRate}%
                    </Badge>
                    {month.placesDisponibles > 0 && (
                      <span className="text-xs text-muted-foreground">
                        +{month.placesDisponibles} places
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
