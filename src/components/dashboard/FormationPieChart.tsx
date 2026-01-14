import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormationStats } from "@/hooks/useDashboardStats";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { GraduationCap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
  "hsl(var(--secondary))",
  "hsl(142, 76%, 36%)",
  "hsl(262, 83%, 58%)",
];

interface FormationPieChartProps {
  onClick?: () => void;
}

export function FormationPieChart({ onClick }: FormationPieChartProps) {
  const { data, isLoading } = useFormationStats();

  const totalInscriptions = data?.reduce((acc, f) => acc + f.count, 0) || 0;

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-md group"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          Répartition par formation
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {totalInscriptions} inscriptions au total
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="formation"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} inscrits`, name]}
                contentStyle={{ 
                  borderRadius: 8, 
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))",
                  fontSize: 12,
                }}
              />
              <Legend 
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value) => (
                  <span className="text-xs">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            Aucune donnée disponible
          </div>
        )}
      </CardContent>
    </Card>
  );
}
