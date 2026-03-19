/**
 * DashboardCAChart — Monthly CA / Encaissements / Inscriptions evolution.
 * Reuses useMonthlyCA + useInscriptionTrend from useDashboardStats.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMonthlyCA, useInscriptionTrend } from "@/hooks/useDashboardStats";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { TrendingUp } from "lucide-react";

type ViewMode = "ca" | "inscriptions";

export function DashboardCAChart() {
  const { data: monthlyCA, isLoading: caLoading } = useMonthlyCA();
  const { data: inscriptionTrend, isLoading: inscLoading } = useInscriptionTrend();
  const [viewMode, setViewMode] = useState<ViewMode>("ca");

  const isLoading = caLoading || inscLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const views: { key: ViewMode; label: string }[] = [
    { key: "ca", label: "CA & Encaissements" },
    { key: "inscriptions", label: "Inscriptions" },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Évolution mensuelle
          </h3>
          <div className="flex items-center gap-1">
            {views.map((v) => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                  viewMode === v.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          {viewMode === "ca" ? (
            <ComposedChart data={monthlyCA || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="moisLabel" fontSize={11} tickLine={false} className="text-muted-foreground" />
              <YAxis fontSize={11} tickLine={false} className="text-muted-foreground" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                formatter={(value: number, name: string) => [
                  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value),
                  name === "ca" ? "Facturé" : "Encaissé",
                ]}
              />
              <Legend formatter={(value) => (value === "ca" ? "Facturé" : "Encaissé")} />
              <Bar dataKey="ca" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.3} />
              <Bar dataKey="paye" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          ) : (
            <BarChart data={inscriptionTrend || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="moisLabel" fontSize={11} tickLine={false} className="text-muted-foreground" />
              <YAxis fontSize={11} tickLine={false} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                formatter={(value: number) => [value, "Inscriptions"]}
              />
              <Bar dataKey="inscriptions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
