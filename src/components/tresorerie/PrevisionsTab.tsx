import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTresorerieSoldes, useUpsertSolde, useTresorerieStats } from "@/hooks/useTresorerie";
import { formatEuro } from "@/lib/formatFinancial";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function PrevisionsTab() {
  const { data: soldes, isLoading } = useTresorerieSoldes();
  const { data: stats } = useTresorerieStats();
  const upsertSolde = useUpsertSolde();

  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newSolde, setNewSolde] = useState("");
  const [newPrev, setNewPrev] = useState("");

  const handleAddSolde = async () => {
    if (!newSolde) {
      toast.error("Veuillez saisir un solde réel");
      return;
    }
    try {
      await upsertSolde.mutateAsync({
        date_solde: newDate,
        solde_reel: parseFloat(newSolde.replace(",", ".")),
        solde_previsionnel: newPrev ? parseFloat(newPrev.replace(",", ".")) : null,
        banque: "BNP",
        compte: null,
        notes: null,
      });
      toast.success("Solde enregistré");
      setNewSolde("");
      setNewPrev("");
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    }
  };

  const chartData = useMemo(() => {
    if (!soldes?.length) return [];
    return [...soldes]
      .reverse()
      .map((s) => ({
        date: new Date(s.date_solde).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        reel: Number(s.solde_reel),
        previsionnel: s.solde_previsionnel ? Number(s.solde_previsionnel) : null,
      }));
  }, [soldes]);

  // Projections simples
  const projection = useMemo(() => {
    if (!stats) return null;
    const dailyAvg = stats.nbTransactions > 0 ? stats.soldeNet / 30 : 0;
    const soldeActuel = stats.dernierSolde;
    return {
      dans30j: soldeActuel + dailyAvg * 30,
      dans60j: soldeActuel + dailyAvg * 60,
      dans90j: soldeActuel + dailyAvg * 90,
      rythme: dailyAvg,
    };
  }, [stats]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Projections */}
      {projection && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Dans 30 jours", value: projection.dans30j },
            { label: "Dans 60 jours", value: projection.dans60j },
            { label: "Dans 90 jours", value: projection.dans90j },
          ].map((p) => (
            <Card key={p.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", p.value >= 0 ? "bg-success/10" : "bg-destructive/10")}>
                    {p.value >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-success" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{p.label}</p>
                    <p className={cn("text-lg font-bold", p.value >= 0 ? "text-success" : "text-destructive")}>
                      {formatEuro(p.value)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Évolution du solde</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatEuro(value)} />
                  <Area
                    type="monotone"
                    dataKey="reel"
                    name="Solde réel"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="previsionnel"
                    name="Prévisionnel"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.05}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add solde */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Enregistrer un solde
          </CardTitle>
          <CardDescription>
            Saisissez votre solde bancaire réel pour suivre la trésorerie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Date</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div>
              <Label>Solde réel (€)</Label>
              <Input
                placeholder="12 500,00"
                value={newSolde}
                onChange={(e) => setNewSolde(e.target.value)}
              />
            </div>
            <div>
              <Label>Prévisionnel (€)</Label>
              <Input
                placeholder="Optionnel"
                value={newPrev}
                onChange={(e) => setNewPrev(e.target.value)}
              />
            </div>
            <Button onClick={handleAddSolde} disabled={upsertSolde.isPending}>
              {upsertSolde.isPending ? "..." : "Enregistrer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historique */}
      {soldes && soldes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historique des soldes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Solde réel</th>
                    <th className="text-right p-2">Prévisionnel</th>
                    <th className="text-right p-2">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {soldes.map((s) => {
                    const ecart = s.solde_previsionnel ? Number(s.solde_reel) - Number(s.solde_previsionnel) : null;
                    return (
                      <tr key={s.id} className="border-t hover:bg-muted/30">
                        <td className="p-2">{new Date(s.date_solde).toLocaleDateString("fr-FR")}</td>
                        <td className="p-2 text-right font-mono font-medium">{formatEuro(Number(s.solde_reel))}</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">
                          {s.solde_previsionnel ? formatEuro(Number(s.solde_previsionnel)) : "—"}
                        </td>
                        <td className={cn("p-2 text-right font-mono", ecart && ecart >= 0 ? "text-success" : "text-destructive")}>
                          {ecart !== null ? formatEuro(ecart) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
