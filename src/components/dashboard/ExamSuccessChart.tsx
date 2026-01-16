import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useExamSuccessStats } from "@/hooks/useAdvancedStats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Award, TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamSuccessChartProps {
  onClick?: () => void;
}

export function ExamSuccessChart({ onClick }: ExamSuccessChartProps) {
  const { data, isLoading } = useExamSuccessStats();

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
            <Award className="h-4 w-4 text-primary" />
            Taux de réussite aux examens
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Évolution sur 6 mois
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{data?.global.tauxReussite}%</p>
            <p className="text-xs text-muted-foreground">Global</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* T3P Stats */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Examen T3P</span>
              <Badge variant="outline" className={cn(
                "text-xs",
                data?.t3p.tauxReussite >= 70 ? "bg-success/10 text-success" : 
                data?.t3p.tauxReussite >= 50 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
              )}>
                {data?.t3p.tauxReussite}%
              </Badge>
            </div>
            <Progress value={data?.t3p.tauxReussite || 0} className="h-2 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{data?.t3p.admis} admis</span>
              <span>{data?.t3p.refuse} refusés</span>
              <span>{data?.t3p.enAttente} en attente</span>
            </div>
          </div>

          {/* Pratique Stats */}
          <div className="p-4 rounded-lg bg-success/5 border border-success/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Examen Pratique</span>
              <Badge variant="outline" className={cn(
                "text-xs",
                data?.pratique.tauxReussite >= 70 ? "bg-success/10 text-success" : 
                data?.pratique.tauxReussite >= 50 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
              )}>
                {data?.pratique.tauxReussite}%
              </Badge>
            </div>
            <Progress value={data?.pratique.tauxReussite || 0} className="h-2 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{data?.pratique.admis} admis</span>
              <span>{data?.pratique.refuse} refusés</span>
              <span>{data?.pratique.enAttente} en attente</span>
            </div>
          </div>
        </div>

        {/* Monthly Evolution Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data?.byMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="moisLabel" 
              tick={{ fontSize: 11 }} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value: number) => `${value}%`}
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
            />
            <Line 
              type="monotone"
              dataKey="tauxT3P" 
              name="T3P"
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
            />
            <Line 
              type="monotone"
              dataKey="tauxPratique" 
              name="Pratique"
              stroke="hsl(var(--success))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--success))", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ExamSuccessByFormation() {
  const { data, isLoading } = useExamSuccessStats();

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

  const formationData = data?.byFormationType || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Réussite par formation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {formationData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formationData} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis 
                type="category" 
                dataKey="type" 
                tick={{ fontSize: 11 }} 
                width={60}
              />
              <Tooltip
                formatter={(value: number) => `${value}%`}
                contentStyle={{ 
                  borderRadius: 8, 
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))"
                }}
              />
              <Bar 
                dataKey="tauxReussite" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        )}
      </CardContent>
    </Card>
  );
}
