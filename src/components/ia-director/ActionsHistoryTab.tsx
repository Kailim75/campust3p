import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { History, CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronRight, ExternalLink, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActionLogs } from "@/hooks/useAuditEngine";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { ActionLog } from "./audit/types";

/** Keep only the most recent log per (anomaly_id, action_type) combo */
function deduplicateLogs(logs: ActionLog[]): ActionLog[] {
  const seen = new Map<string, ActionLog>();
  for (const log of logs) {
    const key = `${log.anomaly_id}::${log.action_type}`;
    const existing = seen.get(key);
    if (!existing || new Date(log.created_at) > new Date(existing.created_at)) {
      seen.set(key, log);
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  executed: { label: "Exécutée", icon: CheckCircle2, className: "text-green-500" },
  pending: { label: "En attente", icon: Clock, className: "text-yellow-500" },
  failed: { label: "Échouée", icon: XCircle, className: "text-red-500" },
};

const actionTypeLabels: Record<string, string> = {
  open_filtered_view: "Voir liste filtrée",
  send_email: "Email envoyé",
  send_sms: "SMS envoyé",
  create_task: "Tâche créée",
  bulk_update: "Mise à jour masse",
  schedule_campaign: "Campagne planifiée",
  schedule_session_suggestion: "Session suggérée",
  change_status: "Changement statut",
};

function EntityDetails({ entityIds }: { entityIds: string[] }) {
  const navigate = useNavigate();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["action-log-contacts", entityIds],
    queryFn: async () => {
      if (!entityIds || entityIds.length === 0) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, nom, prenom, email, telephone, statut, formation")
        .in("id", entityIds);
      if (error) throw error;
      return data || [];
    },
    enabled: entityIds.length > 0,
  });

  // Also check factures linked to these contacts
  const { data: factures } = useQuery({
    queryKey: ["action-log-factures", entityIds],
    queryFn: async () => {
      if (!entityIds || entityIds.length === 0) return [];
      const { data, error } = await supabase
        .from("factures")
        .select("id, numero_facture, montant_total, statut, contact_id")
        .in("contact_id", entityIds)
        .in("statut", ["brouillon", "emise", "impayee", "partiel"])
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: entityIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="space-y-1 py-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2 italic">
        Aucun enregistrement trouvé pour les IDs référencés.
      </p>
    );
  }

  const facturesByContact = (factures || []).reduce((acc, f) => {
    if (!acc[f.contact_id]) acc[f.contact_id] = [];
    acc[f.contact_id].push(f);
    return acc;
  }, {} as Record<string, typeof factures>);

  const statutLabels: Record<string, string> = {
    prospect: "Prospect",
    inscrit: "Inscrit",
    en_formation: "En formation",
    diplome: "Diplômé",
    archive: "Archivé",
    abandon: "Abandon",
  };

  const statutColors: Record<string, string> = {
    prospect: "bg-blue-100 text-blue-700",
    inscrit: "bg-purple-100 text-purple-700",
    en_formation: "bg-emerald-100 text-emerald-700",
    diplome: "bg-green-100 text-green-700",
    archive: "bg-muted text-muted-foreground",
    abandon: "bg-red-100 text-red-700",
  };

  const factureStatutLabels: Record<string, string> = {
    brouillon: "Brouillon",
    emise: "Émise",
    impayee: "Impayée",
    partiel: "Partiel",
  };

  const factureStatutColors: Record<string, string> = {
    brouillon: "bg-muted text-muted-foreground",
    emise: "bg-blue-100 text-blue-700",
    impayee: "bg-red-100 text-red-700",
    partiel: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-2 py-2">
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {contacts.length} enregistrement(s) concerné(s) :
      </p>
      <div className="grid gap-2">
        {contacts.map((contact) => {
          const contactFactures = facturesByContact[contact.id] || [];
          return (
            <div
              key={contact.id}
              className="border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {contact.prenom} {contact.nom}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {contact.email && <span className="truncate">{contact.email}</span>}
                      {contact.telephone && <span>{contact.telephone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {contact.statut && (
                    <Badge variant="outline" className={cn("text-[10px]", statutColors[contact.statut])}>
                      {statutLabels[contact.statut] || contact.statut}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Voir fiche
                  </Button>
                </div>
              </div>

              {contact.formation && (
                <p className="text-xs text-muted-foreground mt-1 ml-10">
                  Formation : <span className="font-medium">{contact.formation}</span>
                </p>
              )}

              {contactFactures.length > 0 && (
                <div className="mt-2 ml-10 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Factures associées :
                  </p>
                  {contactFactures.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5"
                    >
                      <span className="font-mono">{f.numero_facture}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {Number(f.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] px-1.5", factureStatutColors[f.statut])}
                        >
                          {factureStatutLabels[f.statut] || f.statut}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ActionsHistoryTab() {
  const { data: rawLogs, isLoading } = useActionLogs();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Dédupliquer les logs : garder uniquement la plus récente par (anomaly_id, action_type)
  const logs = rawLogs ? deduplicateLogs(rawLogs) : undefined;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune action exécutée</p>
          <p className="text-sm">Les actions lancées depuis l'onglet Audit apparaîtront ici</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historique des Actions
            <Badge variant="outline" className="ml-auto text-xs">{logs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const sCfg = statusConfig[log.status] || statusConfig.pending;
                const StatusIcon = sCfg.icon;
                const payload = log.payload as Record<string, any> || {};
                const entityCount = (log.entity_ids || []).length;
                const isExpanded = expandedRows.has(log.id);

                return (
                  <div key={log.id} className="group">
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors",
                        isExpanded && "bg-muted/20"
                      )}
                      onClick={() => entityCount > 0 && toggleRow(log.id)}
                    >
                      {/* Expand icon */}
                      <div className="flex-shrink-0 w-5">
                        {entityCount > 0 ? (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : (
                          <span className="block w-4" />
                        )}
                      </div>

                      {/* Status icon */}
                      <div className={cn("flex-shrink-0", sCfg.className)}>
                        <StatusIcon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {log.anomaly_title || log.anomaly_id}
                          </p>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {actionTypeLabels[log.action_type] || log.action_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {payload.label && (
                            <span className="text-xs text-muted-foreground">
                              — {payload.label}
                            </span>
                          )}
                          {payload.new_status && (
                            <span className="text-xs text-muted-foreground">
                              → {payload.new_status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Entity count badge */}
                      {entityCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-xs flex-shrink-0 cursor-pointer"
                        >
                          {entityCount} fiche{entityCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && entityCount > 0 && (
                      <div className="px-4 pb-4 pl-12 border-t border-dashed border-border/50 bg-muted/10">
                        <EntityDetails entityIds={log.entity_ids || []} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
