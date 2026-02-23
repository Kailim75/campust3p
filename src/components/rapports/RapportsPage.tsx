import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, BarChart3, PieChart, Award } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const FORMATION_COLORS: Record<string, string> = {
  TAXI: "hsl(var(--primary))",
  VTC: "hsl(var(--accent))",
  VMDTR: "hsl(var(--info))",
  "Formation continue Taxi": "hsl(var(--success))",
  "Formation continue VTC": "hsl(var(--warning))",
  "Mobilité Taxi": "#8b5cf6",
};

const SOURCE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

// ─── HOOKS ───────────────────────────────────────────────

function useCAEvolution(months: number) {
  return useQuery({
    queryKey: ["rapports-ca-evolution", months],
    queryFn: async () => {
      const now = new Date();
      const fromDate = format(startOfMonth(subMonths(now, months - 1)), "yyyy-MM-dd");
      const fromDatePrevYear = format(startOfMonth(subMonths(now, months - 1 + 12)), "yyyy-MM-dd");
      const toDatePrevYear = format(startOfMonth(subMonths(now, 12)), "yyyy-MM-dd");

      const [currentRes, prevRes] = await Promise.all([
        supabase
          .from("paiements")
          .select("montant, date_paiement")
          .gte("date_paiement", fromDate),
        supabase
          .from("paiements")
          .select("montant, date_paiement")
          .gte("date_paiement", fromDatePrevYear)
          .lt("date_paiement", toDatePrevYear),
      ]);

      const groupByMonth = (data: any[]) => {
        const map = new Map<string, number>();
        (data || []).forEach((p) => {
          const key = format(new Date(p.date_paiement), "yyyy-MM");
          map.set(key, (map.get(key) || 0) + Number(p.montant));
        });
        return map;
      };

      const currentMap = groupByMonth(currentRes.data || []);
      const prevMap = groupByMonth(prevRes.data || []);

      const result = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(now, i);
        const key = format(date, "yyyy-MM");
        const prevKey = format(subMonths(date, 12), "yyyy-MM");
        result.push({
          month: format(date, "MMM yy", { locale: fr }),
          ca: currentMap.get(key) || 0,
          ca_prev: prevMap.get(prevKey) || 0,
        });
      }
      return result;
    },
  });
}

function useInscriptionsParFormation(months: number) {
  return useQuery({
    queryKey: ["rapports-inscriptions", months],
    queryFn: async () => {
      const fromDate = format(startOfMonth(subMonths(new Date(), months - 1)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("contacts")
        .select("formation, created_at")
        .gte("created_at", fromDate)
        .eq("archived", false);

      if (error) throw error;

      const now = new Date();
      const result = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(now, i);
        const key = format(date, "yyyy-MM");
        const monthData: Record<string, any> = { month: format(date, "MMM yy", { locale: fr }) };
        
        (data || []).forEach((c) => {
          if (format(new Date(c.created_at), "yyyy-MM") === key && c.formation) {
            monthData[c.formation] = (monthData[c.formation] || 0) + 1;
          }
        });
        result.push(monthData);
      }
      return result;
    },
  });
}

function useSourcesLeads() {
  return useQuery({
    queryKey: ["rapports-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("origine")
        .eq("archived", false);

      if (error) throw error;

      const map = new Map<string, number>();
      (data || []).forEach((c) => {
        const source = c.origine || "Non renseigné";
        map.set(source, (map.get(source) || 0) + 1);
      });

      const total = data?.length || 1;
      return Array.from(map.entries())
        .map(([name, value]) => ({
          name: name === "null" ? "Non renseigné" : name,
          value,
          percent: Math.round((value / total) * 100),
        }))
        .sort((a, b) => b.value - a.value);
    },
  });
}

function usePerformanceExamens() {
  return useQuery({
    queryKey: ["rapports-examens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examens_t3p")
        .select("type_examen, resultat, contacts(formation)")
        .neq("resultat", "en_attente");

      if (error) throw error;

      const map = new Map<string, { passages: number; admis: number }>();
      (data || []).forEach((e: any) => {
        const formation = e.contacts?.formation || "Autre";
        const current = map.get(formation) || { passages: 0, admis: 0 };
        current.passages++;
        if (e.resultat === "admis") current.admis++;
        map.set(formation, current);
      });

      return Array.from(map.entries()).map(([formation, stats]) => ({
        formation,
        ...stats,
        taux: stats.passages > 0 ? Math.round((stats.admis / stats.passages) * 100) : 0,
      }));
    },
  });
}

// ─── COMPONENT ───────────────────────────────────────────

export function RapportsPage() {
  const [caPeriod, setCAPeriod] = useState("6");
  const [showPrevYear, setShowPrevYear] = useState(false);

  const { data: caData, isLoading: caLoading } = useCAEvolution(Number(caPeriod));
  const { data: inscData, isLoading: inscLoading } = useInscriptionsParFormation(Number(caPeriod));
  const { data: sourcesData, isLoading: sourcesLoading } = useSourcesLeads();
  const { data: examData, isLoading: examLoading } = usePerformanceExamens();

  const formationKeys = useMemo(() => {
    if (!inscData) return [];
    const keys = new Set<string>();
    inscData.forEach((d) => {
      Object.keys(d).forEach((k) => {
        if (k !== "month") keys.add(k);
      });
    });
    return Array.from(keys);
  }, [inscData]);

  return (
    <div className="min-h-screen">
      <Header title="Rapports" subtitle="Analyse et suivi de performance" />

      <main className="p-6 space-y-8 animate-fade-in">
        {/* 1. Évolution CA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Évolution du CA</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={caPeriod} onValueChange={setCAPeriod}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 mois</SelectItem>
                  <SelectItem value="6">6 mois</SelectItem>
                  <SelectItem value="12">12 mois</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showPrevYear ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPrevYear(!showPrevYear)}
              >
                N-1
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {caLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={caData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString("fr-FR")} €`, ""]}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ca"
                    name="CA"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  {showPrevYear && (
                    <Line
                      type="monotone"
                      dataKey="ca_prev"
                      name="CA N-1"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 2. Inscriptions par formation */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg">Inscriptions par formation</CardTitle>
          </CardHeader>
          <CardContent>
            {inscLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inscData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  {formationKeys.map((key) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key}
                      fill={FORMATION_COLORS[key] || "#6b7280"}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3. Sources de leads */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <PieChart className="h-5 w-5 text-info" />
              <CardTitle className="text-lg">Sources de leads</CardTitle>
            </CardHeader>
            <CardContent>
              {sourcesLoading ? (
                <Skeleton className="h-[280px] w-full rounded-xl" />
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <RePieChart>
                      <Pie
                        data={sourcesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {(sourcesData || []).map((_, i) => (
                          <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value} (${sourcesData?.find(s => s.name === name)?.percent || 0}%)`, name]}
                        contentStyle={{ borderRadius: 12 }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 min-w-[160px]">
                    {(sourcesData || []).slice(0, 6).map((s, i) => (
                      <div key={s.name} className="flex items-center gap-2 text-sm">
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                        />
                        <span className="truncate text-muted-foreground">{s.name}</span>
                        <span className="ml-auto font-medium">{s.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Performance examens */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Award className="h-5 w-5 text-success" />
              <CardTitle className="text-lg">Performance examens</CardTitle>
            </CardHeader>
            <CardContent>
              {examLoading ? (
                <Skeleton className="h-[280px] w-full rounded-xl" />
              ) : !examData || examData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  Aucun résultat d'examen disponible
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
                    <div>Formation</div>
                    <div className="text-right">Passages</div>
                    <div className="text-right">Admis</div>
                    <div className="text-right">Taux</div>
                  </div>
                  {examData.map((row) => (
                    <div key={row.formation} className="grid grid-cols-4 gap-2 items-center text-sm">
                      <div className="font-medium truncate">{row.formation}</div>
                      <div className="text-right text-muted-foreground">{row.passages}</div>
                      <div className="text-right text-muted-foreground">{row.admis}</div>
                      <div className="text-right">
                        <Badge
                          className={cn(
                            "text-xs",
                            row.taux >= 75
                              ? "bg-success/10 text-success"
                              : row.taux >= 50
                              ? "bg-accent/10 text-accent"
                              : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {row.taux}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
