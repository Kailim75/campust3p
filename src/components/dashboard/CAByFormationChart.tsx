import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCAByFormationType } from "@/hooks/useAdvancedStats";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { PieChartIcon, Euro } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
  "hsl(220 70% 50%)",
  "hsl(280 70% 50%)",
];

interface CAByFormationChartProps {
  onClick?: () => void;
}

export function CAByFormationChart({ onClick }: CAByFormationChartProps) {
  const { data, isLoading } = useCAByFormationType();

  const formatEuro = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalCA = data?.reduce((acc, item) => acc + item.ca, 0) || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.slice(0, 6) || [];

  return (
    <Card 
      className={cn(
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            CA par formation
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Répartition du chiffre d'affaires
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">{formatEuro(totalCA)}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="ca"
                  nameKey="type"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatEuro(value)}
                  contentStyle={{ 
                    borderRadius: 8, 
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--background))"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="flex-1 space-y-2">
              {chartData.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm truncate max-w-[100px]">{item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatEuro(item.ca)}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        )}
      </CardContent>
    </Card>
  );
}
