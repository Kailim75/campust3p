// ═══════════════════════════════════════════════════════════════
// DocumentSystemStatePage — Phase 1 sécurisation documentaire
// ═══════════════════════════════════════════════════════════════
// Vue admin (lecture seule) : tables documentaires, volumes,
// dernière écriture, statut de migration V1/V2.
// Aucune action destructive, aucun écriture en base.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText, Database, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDocumentSystemState, type DocSourceStatus } from "@/hooks/useDocumentSystemState";
import { useCurrentUserRole } from "@/hooks/useUsers";
import {
  V1_MIGRATION_REGISTRY,
  getMigrationSummary,
  getDeprecationWarnings,
} from "@/lib/document-workflow/v1MigrationRegistry";

const STATUS_LABELS: Record<DocSourceStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active:             { label: "Active",            variant: "default" },
  shared:             { label: "Partagée V1/V2",    variant: "secondary" },
  legacy:             { label: "Legacy",            variant: "outline" },
  deprecated:         { label: "Dépréciée",         variant: "destructive" },
  archive_candidate:  { label: "À archiver",        variant: "outline" },
};

function StatusBadge({ status }: { status: DocSourceStatus }) {
  const meta = STATUS_LABELS[status];
  return <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>;
}

export function DocumentSystemStatePage() {
  const { data: role, isLoading: roleLoading } = useCurrentUserRole();
  const { data: tables, isLoading, error } = useDocumentSystemState();

  if (roleLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (role !== "admin" && role !== "super_admin" && role !== "staff") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Accès restreint</AlertTitle>
          <AlertDescription>
            Cette page est réservée aux administrateurs et au staff autorisé.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const summary = getMigrationSummary();
  const warnings = getDeprecationWarnings();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Database className="h-6 w-6" />
          État du système documentaire
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue lecture seule des sources de vérité documentaires (Phase 1 — sécurisation sans migration).
        </p>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Mode lecture seule</AlertTitle>
        <AlertDescription>
          Aucune action destructive disponible ici. Aucune migration de données n'est exécutée par cette page.
        </AlertDescription>
      </Alert>

      {/* Résumé migration V1 → V2 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Avancement migration V1 → V2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Migré"       value={summary.migrated}        tone="success" />
            <Stat label="Partiel"     value={summary.partial}         tone="warn" />
            <Stat label="En attente"  value={summary.pending}         tone="warn" />
            <Stat label="Déprécié"    value={summary.deprecated}      tone="muted" />
            <Stat label="Complétion"  value={`${summary.percentComplete}%`} tone="success" />
          </div>
        </CardContent>
      </Card>

      {/* Volumes par table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tables documentaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Erreur de chargement : {(error as Error).message}</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Table</th>
                    <th className="text-left py-2 px-2">Rôle</th>
                    <th className="text-left py-2 px-2">Statut</th>
                    <th className="text-right py-2 px-2">Volume</th>
                    <th className="text-left py-2 px-2">Dernière écriture</th>
                  </tr>
                </thead>
                <tbody>
                  {tables?.map((t) => (
                    <tr key={t.table} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div className="font-medium">{t.label}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{t.table}</div>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{t.role}</td>
                      <td className="py-2 px-2"><StatusBadge status={t.status} /></td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {t.error ? <span className="text-destructive text-xs">—</span> : (t.count ?? 0).toLocaleString("fr-FR")}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {t.lastWriteAt
                          ? format(new Date(t.lastWriteAt), "dd MMM yyyy HH:mm", { locale: fr })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avertissements dépréciation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Avertissements de dépréciation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {warnings.map((w) => (
            <Alert key={w.feature} variant={w.severity === "critical" ? "destructive" : "default"}>
              <AlertTitle className="text-sm font-mono">{w.feature}</AlertTitle>
              <AlertDescription className="text-xs">{w.message}</AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Registre détaillé */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registre de migration V1/V2</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-2">Fonctionnalité V1</th>
                  <th className="text-left py-2 px-2">Équivalent V2</th>
                  <th className="text-left py-2 px-2">Statut</th>
                  <th className="text-left py-2 px-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {V1_MIGRATION_REGISTRY.map((e) => (
                  <tr key={e.v1Feature} className="border-b">
                    <td className="py-2 px-2">
                      <div className="font-medium">{e.v1Feature}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{e.v1Table}</div>
                    </td>
                    <td className="py-2 px-2">
                      <div>{e.v2Equivalent}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{e.v2Table}</div>
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{e.status}</Badge>
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{e.migrationNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: "success" | "warn" | "muted" }) {
  const toneClass = tone === "success"
    ? "text-primary"
    : tone === "warn"
    ? "text-amber-600"
    : "text-muted-foreground";
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
}
