import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, PlayCircle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type CronResult = {
  ok?: boolean;
  mode?: string;
  lookback_days?: number;
  scanned?: number;
  recorded?: number;
  already_recorded?: number;
  skipped_no_facture?: number;
  skipped_zero_amount?: number;
  errors?: Array<{ payment_id: string; error: string }>;
  error?: string;
} | null;

export function AlmaCronMonitorPanel() {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<CronResult>(null);
  const queryClient = useQueryClient();

  // Quick recent-Alma-payments stat from DB
  const { data: stats } = useQuery({
    queryKey: ["alma-paiements-stats"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("paiements")
        .select("id, montant, date_paiement, reference")
        .eq("mode_paiement", "alma")
        .gte("date_paiement", since.toISOString().split("T")[0])
        .is("deleted_at", null)
        .order("date_paiement", { ascending: false });
      if (error) throw error;
      const total = (data ?? []).reduce((s, p) => s + Number(p.montant || 0), 0);
      return { count: data?.length ?? 0, total, last: data?.[0] };
    },
  });

  const runNow = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("alma-reconcile-cron", {
        body: {},
      });
      if (error) throw error;
      setLastResult(data as CronResult);
      toast.success(
        `Réconciliation terminée — ${data?.recorded ?? 0} nouveau(x), ${data?.already_recorded ?? 0} déjà OK`,
      );
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      queryClient.invalidateQueries({ queryKey: ["alma-paiements-stats"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la réconciliation");
      setLastResult({ error: e?.message ?? "Erreur inconnue" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Réconciliation automatique Alma
        </CardTitle>
        <CardDescription>
          Une tâche planifiée tourne chaque nuit à 03h15 et rattrape les paiements Alma dont
          le webhook a échoué (filet de sécurité). Vous pouvez aussi la lancer manuellement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Paiements Alma (30j)</p>
            <p className="text-xl font-semibold mt-1">{stats?.count ?? "—"}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Total encaissé (30j)</p>
            <p className="text-xl font-semibold mt-1">
              {(stats?.total ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 0 })} €
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Dernier paiement</p>
            <p className="text-sm font-medium mt-1">
              {stats?.last?.date_paiement
                ? new Date(stats.last.date_paiement).toLocaleDateString("fr-FR")
                : "—"}
            </p>
          </div>
        </div>

        <Button onClick={runNow} disabled={running} variant="outline" size="sm">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Réconciliation en cours…
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Lancer maintenant (7 derniers jours)
            </>
          )}
        </Button>

        {lastResult && !lastResult.error && (
          <Alert>
            <AlertTitle className="text-sm">
              Résultat — mode <code>{lastResult.mode}</code>, fenêtre {lastResult.lookback_days}j
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 space-y-0.5">
              <div>{lastResult.scanned} paiement(s) Alma scanné(s)</div>
              <div className="text-emerald-700 dark:text-emerald-400">
                ✓ {lastResult.recorded} nouvellement enregistré(s)
              </div>
              <div>↻ {lastResult.already_recorded} déjà présent(s) (idempotent)</div>
              {(lastResult.skipped_no_facture ?? 0) > 0 && (
                <div className="text-amber-700 dark:text-amber-400">
                  ⚠ {lastResult.skipped_no_facture} sans facture_id (à reconcilier manuellement)
                </div>
              )}
              {(lastResult.errors?.length ?? 0) > 0 && (
                <div className="text-destructive">
                  ✗ {lastResult.errors!.length} erreur(s) — voir logs edge function
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {lastResult?.error && (
          <Alert variant="destructive">
            <AlertTitle>Échec</AlertTitle>
            <AlertDescription className="text-xs">{lastResult.error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
