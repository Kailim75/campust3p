/**
 * DashboardSynthesisBar — Direction-level synthesis bar.
 * Shows 4-5 status indicators for instant situational awareness.
 * No artificial scores. Only factual, verifiable signals.
 */

import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface Props {
  metrics: DashboardMetrics | undefined;
  isLoading: boolean;
}

interface StatusItem {
  label: string;
  status: "ok" | "warning" | "critical";
  detail?: string;
}

function getStatuses(m: DashboardMetrics): StatusItem[] {
  const items: StatusItem[] = [];

  // Commercial
  if (m.prospectsRelance > 5) {
    items.push({ label: "Commercial", status: "warning", detail: `${m.prospectsRelance} relances en attente` });
  } else if (m.prospectsRelance > 0) {
    items.push({ label: "Commercial", status: "ok", detail: `${m.prospectsRelance} relance(s)` });
  } else {
    items.push({ label: "Commercial", status: "ok", detail: "À jour" });
  }

  // Dossiers
  const totalDossiers = m.dossiersInitialManquants + m.dossiersContinuManquants;
  if (totalDossiers > 10) {
    items.push({ label: "Dossiers", status: "critical", detail: `${totalDossiers} incomplets` });
  } else if (totalDossiers > 0) {
    items.push({ label: "Dossiers", status: "warning", detail: `${totalDossiers} incomplet(s)` });
  } else {
    items.push({ label: "Dossiers", status: "ok", detail: "Complets" });
  }

  // Sessions
  if (m.sessionsRisque > 2) {
    items.push({ label: "Sessions", status: "critical", detail: `${m.sessionsRisque} à risque` });
  } else if (m.sessionsRisque > 0) {
    items.push({ label: "Sessions", status: "warning", detail: `${m.sessionsRisque} à risque` });
  } else {
    items.push({ label: "Sessions", status: "ok", detail: "Sécurisées" });
  }

  // Finance
  if (m.paiementsRetard > 3) {
    items.push({ label: "Finance", status: "critical", detail: `${m.paiementsRetard} retards` });
  } else if (m.paiementsRetard > 0) {
    items.push({ label: "Finance", status: "warning", detail: `${m.paiementsRetard} retard(s)` });
  } else {
    items.push({ label: "Finance", status: "ok", detail: "Sous contrôle" });
  }

  // Qualiopi (if checklist items exist)
  if (m.qualiopiTotal > 0) {
    const pct = Math.round((m.qualiopiValide / m.qualiopiTotal) * 100);
    if (pct >= 80) {
      items.push({ label: "Qualiopi", status: "ok", detail: `${pct}% conforme` });
    } else if (pct >= 50) {
      items.push({ label: "Qualiopi", status: "warning", detail: `${pct}% conforme` });
    } else {
      items.push({ label: "Qualiopi", status: "critical", detail: `${pct}% conforme` });
    }
  }

  return items;
}

const statusConfig = {
  ok: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  critical: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

export function DashboardSynthesisBar({ metrics, isLoading }: Props) {
  if (isLoading || !metrics) {
    return (
      <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-32 rounded-lg" />
        ))}
      </div>
    );
  }

  const statuses = getStatuses(metrics);
  const hasCritical = statuses.some((s) => s.status === "critical");
  const hasWarning = statuses.some((s) => s.status === "warning");

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-colors",
        hasCritical
          ? "border-destructive/30 bg-destructive/5"
          : hasWarning
          ? "border-warning/30 bg-warning/5"
          : "border-border bg-card"
      )}
      role="status"
      aria-label="Synthèse de l'état du centre"
    >
      <span className="text-xs font-medium text-muted-foreground shrink-0 uppercase tracking-wider">
        État du centre
      </span>
      <span className="w-px h-6 bg-border shrink-0" />
      <div className="flex items-center gap-3 flex-wrap">
        {statuses.map((item) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
                config.bg
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", config.color)} />
              <span className="text-xs font-medium text-foreground">
                {item.label}
              </span>
              {item.detail && (
                <span className="text-[11px] text-muted-foreground">
                  · {item.detail}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
