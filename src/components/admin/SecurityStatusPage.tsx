import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, ShieldCheck, ShieldAlert, Play, Clock, AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink } from "lucide-react";
import { useSecurityRuns, useRunSmokeTests, useRlsViolations, type SecurityTestResult } from "@/hooks/useSecurityDashboard";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function StatusIcon({ status }: { status: string }) {
  switch (status.toUpperCase()) {
    case "PASS": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "FAIL": return <XCircle className="h-4 w-4 text-destructive" />;
    case "WARN": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default: return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "pass" ? "default" : status === "fail" ? "destructive" : "secondary";
  return <Badge variant={variant} className="uppercase text-xs">{status}</Badge>;
}

export function SecurityStatusPage() {
  const { data: runs, isLoading: runsLoading } = useSecurityRuns(5);
  const { data: violations } = useRlsViolations(7);
  const runTests = useRunSmokeTests();
  const [currentResults, setCurrentResults] = useState<SecurityTestResult[] | null>(null);

  const lastRun = runs?.[0];

  const handleRunTests = async () => {
    const result = await runTests.mutateAsync();
    setCurrentResults(result.results);
  };

  const displayResults = currentResults || (lastRun?.summary_json as SecurityTestResult[] | undefined);

  // Group results by category
  const grouped = displayResults?.reduce((acc, r) => {
    let category = "Autre";
    if (r.test.startsWith("RLS:")) category = "RLS activé";
    else if (r.test.startsWith("Orphans:")) category = "Orphelins centre_id";
    else if (r.test.startsWith("Centre-aware:")) category = "Policies centre-aware";
    else if (r.test.includes("Storage") || r.test.includes("Bucket")) category = "Storage";
    else if (r.test.includes("partner_stats")) category = "Vues";
    if (!acc[category]) acc[category] = [];
    acc[category].push(r);
    return acc;
  }, {} as Record<string, SecurityTestResult[]>);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Security Status</h1>
            <p className="text-sm text-muted-foreground">Tableau de bord de sécurité multi-tenant</p>
          </div>
        </div>
        <Button onClick={handleRunTests} disabled={runTests.isPending} className="gap-2">
          <Play className="h-4 w-4" />
          {runTests.isPending ? "Exécution..." : "Lancer smoke tests"}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{lastRun?.total_pass ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Tests PASS</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{lastRun?.total_fail ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Tests FAIL</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{lastRun?.total_warn ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {lastRun ? format(new Date(lastRun.created_at), "dd/MM/yyyy HH:mm", { locale: fr }) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Dernier run</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaked password protection card */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Leaked Password Protection
          </CardTitle>
          <CardDescription>
            Cette protection empêche les utilisateurs d'utiliser des mots de passe compromis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              OFF — À activer manuellement
            </Badge>
          </div>
          <div className="text-sm space-y-2 text-muted-foreground">
            <p><strong>Comment l'activer :</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Accéder aux paramètres Auth du projet</li>
              <li>Section « Password Security »</li>
              <li>Activer « Leaked password protection »</li>
              <li>Enregistrer les modifications</li>
            </ol>
            <p className="text-xs mt-2">
              <strong>Test :</strong> Essayer de créer un compte avec "password123" — doit être refusé.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Résultats des smoke tests</CardTitle>
            <CardDescription>
              {displayResults
                ? `${displayResults.length} tests exécutés`
                : "Lancez un test pour voir les résultats"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayResults && grouped ? (
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {Object.entries(grouped).map(([category, tests]) => {
                    const failCount = tests.filter(t => t.status === "FAIL").length;
                    const passCount = tests.filter(t => t.status === "PASS").length;
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-sm">{category}</h3>
                          <Badge variant="outline" className="text-xs">
                            {passCount}/{tests.length} PASS
                          </Badge>
                          {failCount > 0 && (
                            <Badge variant="destructive" className="text-xs">{failCount} FAIL</Badge>
                          )}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8"></TableHead>
                              <TableHead>Test</TableHead>
                              <TableHead>Détails</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tests.map((t, i) => (
                              <TableRow key={i} className={t.status === "FAIL" ? "bg-destructive/5" : ""}>
                                <TableCell><StatusIcon status={t.status} /></TableCell>
                                <TableCell className="font-mono text-xs">{t.test}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{t.details}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun résultat. Cliquez sur « Lancer smoke tests » pour démarrer.
              </p>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : runs && runs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">P/F/W</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-xs">
                        {format(new Date(run.created_at), "dd/MM HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell><StatusBadge status={run.status} /></TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {run.total_pass}/{run.total_fail}/{run.total_warn}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun run enregistré.</p>
            )}
          </CardContent>
        </Card>

        {/* RLS violations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Erreurs RLS (7 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {violations && violations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.slice(0, 10).map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs">
                        {format(new Date(v.created_at), "dd/MM HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v.table_name}</TableCell>
                      <TableCell className="text-xs">{v.user_email || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune violation RLS détectée</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
