import { AlertTriangle, FileSearch, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useFacturationAudit, type FactureAuditStatus } from "@/hooks/useFacturationAudit";

const statusLabels: Record<FactureAuditStatus, string> = {
  brouillon: "Brouillon",
  emise: "Émise",
  payee: "Payée",
  partiel: "Partiel",
  impayee: "Impayée",
  annulee: "Annulée",
};

function formatMoney(value: number) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateLabel(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd MMM yyyy", { locale: fr });
  } catch {
    return value;
  }
}

function AuditSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}

export function FacturationAuditPanel() {
  const { data, isLoading, error } = useFacturationAudit(12);

  return (
    <Card className="border-dashed border-border/80 bg-background/70">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-4 w-4" />
              Audit facturation v2
            </CardTitle>
            <CardDescription>
              Lecture seule. Ce panneau compare les factures et paiements sans modifier les flux actuels.
            </CardDescription>
          </div>
          <Badge variant="outline" className="whitespace-nowrap">
            Safe mode
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          Ce contrôle sert uniquement à repérer les écarts de cohérence avant toute bascule. Aucun statut, paiement ou document n’est modifié ici.
        </div>

        {isLoading ? <AuditSummarySkeleton /> : null}

        {!isLoading && error ? (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-warning">
              <AlertTriangle className="h-4 w-4" />
              Audit temporairement indisponible
            </div>
            <p className="mt-2 text-muted-foreground">
              Le CRM continue de fonctionner normalement. Le panneau d’audit n’a pas pu charger ses données.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Anomalies détectées</p>
                <p className="mt-1 text-2xl font-bold">{data.summary.totalAnomalies}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Statuts incohérents</p>
                <p className="mt-1 text-2xl font-bold">{data.summary.statusMismatchCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Factures sans lignes</p>
                <p className="mt-1 text-2xl font-bold">{data.summary.missingLinesCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Paiements supprimés</p>
                <p className="mt-1 text-2xl font-bold">{data.summary.softDeletedPaymentsCount}</p>
              </div>
            </div>

            {data.items.length === 0 ? (
              <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium text-success">
                  <ShieldCheck className="h-4 w-4" />
                  Aucun écart détecté sur l’échantillon audité
                </div>
                <p className="mt-2 text-muted-foreground">
                  Les factures analysées paraissent cohérentes avec les paiements actifs et les lignes enregistrées.
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {data.items.map((item) => (
                  <AccordionItem key={item.facture_id} value={item.facture_id}>
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex flex-1 items-center gap-3 text-left">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{item.numero_facture}</Badge>
                            <span className="font-medium truncate">{item.contact_name || "Contact inconnu"}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Émise le {formatDateLabel(item.date_emission)} · Échéance {formatDateLabel(item.date_echeance)}
                          </p>
                        </div>

                        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                          {item.status_mismatch ? (
                            <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
                              Statut
                            </Badge>
                          ) : null}
                          {item.missing_lines ? (
                            <Badge className="bg-warning/10 text-warning hover:bg-warning/10">
                              Lignes
                            </Badge>
                          ) : null}
                          {item.soft_deleted_payments ? (
                            <Badge className="bg-warning/10 text-warning hover:bg-warning/10">
                              Soft delete
                            </Badge>
                          ) : null}
                          {item.overpaid ? (
                            <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
                              Surpaiement
                            </Badge>
                          ) : null}
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatMoney(item.remaining_due)} €</p>
                            <p className="text-xs text-muted-foreground">reste à payer</p>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border p-3 space-y-2 text-sm">
                          <p className="font-medium">Cohérence métier</p>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Statut stocké</span>
                            <Badge variant="outline">{statusLabels[item.current_status]}</Badge>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Statut calculé v2</span>
                            <Badge variant="outline">{statusLabels[item.expected_status]}</Badge>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Montant facture</span>
                            <span>{formatMoney(item.invoice_total)} €</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Montant payé actif</span>
                            <span>{formatMoney(item.active_paid_total)} €</span>
                          </div>
                        </div>

                        <div className="rounded-lg border p-3 space-y-2 text-sm">
                          <p className="font-medium">Contrôles techniques</p>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Lignes de facture</span>
                            <span>{item.line_count}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Paiements actifs</span>
                            <span>{item.active_payment_count}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Paiements supprimés</span>
                            <span>
                              {item.deleted_payment_count}
                              {item.deleted_paid_total > 0 ? ` · ${formatMoney(item.deleted_paid_total)} €` : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Score de sévérité</span>
                            <span>{item.severity_score}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.anomaly_reasons?.map((reason) => (
                          <Badge key={reason} variant="secondary">
                            {reason}
                          </Badge>
                        ))}
                        {item.overpaid_amount > 0 ? (
                          <Badge variant="secondary">
                            Trop-perçu: {formatMoney(item.overpaid_amount)} €
                          </Badge>
                        ) : null}
                        {item.missing_due_date ? (
                          <Badge variant="secondary">Échéance absente</Badge>
                        ) : null}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              L’échantillon affiché est limité aux anomalies les plus prioritaires. Cette vue n’écrit rien en base et ne remplace pas encore les règles CRM en production.
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
