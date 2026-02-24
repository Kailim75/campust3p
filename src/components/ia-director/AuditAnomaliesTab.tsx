import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Target, Activity, FileText, CreditCard, Database,
  CheckCircle2, Loader2, Eye, EyeOff, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Anomaly, AnomalyCategory, AnomalySeverity, AnomalyStatus } from "./audit/types";
import AnomalyActionModal from "./AnomalyActionModal";
import { useExecuteAction, useChangeAnomalyStatus } from "@/hooks/useAuditEngine";

const categoryConfig: Record<AnomalyCategory, { icon: typeof Target; label: string }> = {
  prospects: { icon: Target, label: "Prospects" },
  sessions: { icon: Activity, label: "Sessions" },
  administratif: { icon: FileText, label: "Administratif" },
  paiements: { icon: CreditCard, label: "Paiements" },
  qualite_data: { icon: Database, label: "Qualité Data" },
  documents: { icon: FileText, label: "Documents" },
  conformite: { icon: FileText, label: "Conformité" },
};

const severityConfig: Record<AnomalySeverity, { label: string; className: string }> = {
  critical: { label: "Critique", className: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400" },
  high: { label: "Haute", className: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400" },
  medium: { label: "Moyenne", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400" },
  low: { label: "Basse", className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400" },
};

const statusIcons: Record<AnomalyStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  open: { icon: AlertTriangle, className: "text-amber-500", label: "Ouverte" },
  in_progress: { icon: Clock, className: "text-blue-500", label: "En cours" },
  resolved: { icon: CheckCircle2, className: "text-green-500", label: "Résolue" },
  ignored: { icon: EyeOff, className: "text-muted-foreground", label: "Ignorée" },
};

interface Props {
  anomalies: Anomaly[];
  isLoading: boolean;
  onAnomalyStatusChange?: (anomalyId: string, status: AnomalyStatus) => void;
}

export default function AuditAnomaliesTab({ anomalies, isLoading, onAnomalyStatusChange }: Props) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const executeAction = useExecuteAction();
  const changeStatus = useChangeAnomalyStatus();

  const filtered = anomalies.filter((a) => {
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const handleExecuteAction = (anomalyId: string, actionType: string, payload: Record<string, unknown>, entityIds: string[], anomalyTitle: string) => {
    executeAction.mutate({
      anomalyId,
      actionType,
      payload,
      entityIds,
      anomalyTitle,
    }, {
      onSuccess: () => {
        // Auto-mark as in_progress
        onAnomalyStatusChange?.(anomalyId, "in_progress");
      }
    });
  };

  const handleChangeStatus = (anomalyId: string, status: AnomalyStatus) => {
    const anomaly = anomalies.find(a => a.id === anomalyId);
    changeStatus.mutate({
      anomalyId,
      newStatus: status,
      anomalyTitle: anomaly?.title,
    }, {
      onSuccess: () => {
        onAnomalyStatusChange?.(anomalyId, status);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {Object.entries(categoryConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sévérité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes sévérités</SelectItem>
            {Object.entries(severityConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="open">Ouvertes</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="resolved">Résolues</SelectItem>
            <SelectItem value="ignored">Ignorées</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} anomalie(s)
        </span>
      </div>

      {/* Anomalies list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-50" />
            <p className="font-medium">Aucune anomalie détectée</p>
            <p className="text-sm">Lancez une analyse pour scanner votre CRM</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {filtered.map((anomaly) => {
              const catCfg = categoryConfig[anomaly.category];
              const sevCfg = severityConfig[anomaly.severity];
              const stCfg = statusIcons[anomaly.status || "open"];
              const CatIcon = catCfg.icon;
              const StIcon = stCfg.icon;
              return (
                <Card
                  key={anomaly.id}
                  className={cn(
                    "border transition-all hover:shadow-md cursor-pointer",
                    anomaly.severity === "critical" && "border-red-500/30",
                    anomaly.severity === "high" && "border-orange-500/20",
                    anomaly.status === "resolved" && "opacity-60",
                    anomaly.status === "ignored" && "opacity-40",
                  )}
                  onClick={() => setSelectedAnomaly(anomaly)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", sevCfg.className.split(" ").find(c => c.startsWith("bg-")))}>
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground text-sm">{anomaly.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{anomaly.description}</p>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <span className="text-sm font-bold text-foreground">
                              {anomaly.priority_score}
                            </span>
                            <p className="text-[10px] text-muted-foreground">Priorité</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-[10px] gap-1", stCfg.className)}>
                            <StIcon className="h-3 w-3" />
                            {stCfg.label}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px]", sevCfg.className)}>
                            {sevCfg.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {catCfg.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {anomaly.affected_count} concerné(s)
                          </Badge>
                          {anomaly.impact_estime_euros > 0 && (
                            <span className="text-xs font-semibold text-foreground">
                              💰 {anomaly.impact_estime_euros.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1 ml-auto text-primary hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAnomaly(anomaly);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            Actions
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Action Modal */}
      <AnomalyActionModal
        anomaly={selectedAnomaly}
        open={!!selectedAnomaly}
        onOpenChange={(open) => { if (!open) setSelectedAnomaly(null); }}
        onExecuteAction={handleExecuteAction}
        onChangeStatus={handleChangeStatus}
        isExecuting={executeAction.isPending || changeStatus.isPending}
      />
    </div>
  );
}
