import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Target, Activity, FileText, CreditCard, Database,
  Play, CheckCircle2, XCircle, Loader2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Anomaly, AnomalyCategory, AnomalySeverity } from "./audit/types";
import { useExecuteAction } from "@/hooks/useAuditEngine";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface Props {
  anomalies: Anomaly[];
  isLoading: boolean;
}

export default function AuditAnomaliesTab({ anomalies, isLoading }: Props) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<{
    anomalyId: string;
    label: string;
    actionType: string;
  } | null>(null);
  const executeAction = useExecuteAction();

  const filtered = anomalies.filter((a) => {
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    return true;
  });

  const handleAction = (anomaly: Anomaly, playbook: Anomaly["playbooks"][0]) => {
    if (playbook.confirmation_required) {
      setConfirmAction({
        anomalyId: anomaly.id,
        label: playbook.label,
        actionType: playbook.action_type,
      });
    } else {
      executeAction.mutate({
        anomalyId: anomaly.id,
        actionType: playbook.action_type,
        payload: { label: playbook.label, affected_count: anomaly.affected_count },
      });
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    executeAction.mutate({
      anomalyId: confirmAction.anomalyId,
      actionType: confirmAction.actionType,
      payload: { label: confirmAction.label },
    });
    setConfirmAction(null);
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
              const CatIcon = catCfg.icon;
              return (
                <Card key={anomaly.id} className={cn(
                  "border transition-all hover:shadow-md",
                  anomaly.severity === "critical" && "border-red-500/30",
                  anomaly.severity === "high" && "border-orange-500/20",
                )}>
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
                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-foreground">
                              {anomaly.priority_score}
                            </span>
                            <p className="text-[10px] text-muted-foreground">Priorité</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
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
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            Confiance : {anomaly.confidence_score}%
                          </span>
                        </div>

                        <p className="text-[10px] text-muted-foreground italic">
                          Règle : {anomaly.detection_rule}
                        </p>

                        {/* Playbooks */}
                        {anomaly.playbooks.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {anomaly.playbooks.map((pb, i) => (
                              <Button
                                key={i}
                                variant={pb.confirmation_required ? "outline" : "secondary"}
                                size="sm"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => handleAction(anomaly, pb)}
                                disabled={executeAction.isPending}
                              >
                                <Play className="h-3 w-3" />
                                {pb.label}
                                {pb.confirmation_required && (
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                )}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous exécuter : <strong>{confirmAction?.label}</strong> ?
              <br />Cette action sera loggée et tracée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Exécuter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
