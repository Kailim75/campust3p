import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActionLogs } from "@/hooks/useAuditEngine";

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

export default function ActionsHistoryTab() {
  const { data: logs, isLoading } = useActionLogs();

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
          <ScrollArea className="max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Anomalie</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Action</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">Enregistrements</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">Statut</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const sCfg = statusConfig[log.status] || statusConfig.pending;
                  const StatusIcon = sCfg.icon;
                  const payload = log.payload as Record<string, any> || {};
                  const entityCount = (log.entity_ids || []).length;
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-xs text-foreground max-w-[200px]">
                        <p className="font-medium truncate">{log.anomaly_title || log.anomaly_id}</p>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {actionTypeLabels[log.action_type] || log.action_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {entityCount > 0 ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {entityCount}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className={cn("inline-flex items-center gap-1 text-xs", sCfg.className)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {sCfg.label}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {payload.label || payload.new_status || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
