import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  GraduationCap,
  ClipboardList,
  Star,
  Eye,
  Send,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionQualiopi, type QualiopiCriterion } from "@/hooks/useSessionQualiopi";

interface SessionQualiopiTabProps {
  sessionId: string;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType }> = {
  documents: { label: "Documents", icon: FileText },
  pedagogie: { label: "Pédagogie", icon: GraduationCap },
  administratif: { label: "Administratif", icon: ClipboardList },
  qualite: { label: "Qualité", icon: Star },
};

const statusIcons: Record<string, { icon: React.ElementType; class: string; label: string }> = {
  conforme: { icon: CheckCircle2, class: "text-success", label: "Conforme" },
  partiel: { icon: AlertTriangle, class: "text-warning", label: "Partiel" },
  non_conforme: { icon: XCircle, class: "text-destructive", label: "Non conforme" },
  na: { icon: MinusCircle, class: "text-muted-foreground", label: "N/A" },
};

function CriterionRow({ criterion }: { criterion: QualiopiCriterion }) {
  const statusInfo = statusIcons[criterion.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
      criterion.status === "conforme" && "bg-success/5 border-success/20",
      criterion.status === "partiel" && "bg-warning/5 border-warning/20",
      criterion.status === "non_conforme" && "bg-destructive/5 border-destructive/20",
      criterion.status === "na" && "bg-muted/30 border-muted",
    )}>
      <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", statusInfo.class)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{criterion.label}</span>
          {criterion.required && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
              Obligatoire
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusInfo.class)}>
            {statusInfo.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{criterion.description}</p>
        {criterion.detail && (
          <p className={cn("text-xs mt-1 font-medium", statusInfo.class)}>
            {criterion.detail}
          </p>
        )}
      </div>
      <div className="shrink-0">
        {criterion.status === "non_conforme" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive">
                <Send className="h-3 w-3" />
                Générer
              </Button>
            </TooltipTrigger>
            <TooltipContent>Générer ou envoyer ce document</TooltipContent>
          </Tooltip>
        )}
        {criterion.status === "partiel" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-warning hover:text-warning">
                <Eye className="h-3 w-3" />
                Manquants
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voir les éléments manquants</TooltipContent>
          </Tooltip>
        )}
        {criterion.status === "conforme" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-success hover:text-success">
                <Eye className="h-3 w-3" />
                Détail
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voir le détail</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export function SessionQualiopiTab({ sessionId }: SessionQualiopiTabProps) {
  const { data: qualiopi, isLoading } = useSessionQualiopi(sessionId);
  const [showAlertesDialog, setShowAlertesDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!qualiopi) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Aucune donnée Qualiopi disponible</p>
        <p className="text-xs text-muted-foreground mt-1">Les critères seront calculés automatiquement à partir des données de la session.</p>
      </div>
    );
  }

  const progressBg = qualiopi.score >= 80 ? "hsl(var(--success))" : qualiopi.score >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const isAuditReady = qualiopi.score >= 80;

  // Counters
  const preuvesOk = qualiopi.criteria.filter(c => c.status === "conforme").length;
  const preuvesManquantes = qualiopi.criteria.filter(c => c.status === "non_conforme").length;
  const preuvesPartielles = qualiopi.criteria.filter(c => c.status === "partiel").length;

  // Group by category
  const grouped = qualiopi.criteria.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, QualiopiCriterion[]>);

  return (
    <div className="space-y-5">
      {/* Header — Qualiopi état du dossier */}
      <div className={cn(
        "p-4 rounded-xl border-2 space-y-3",
        isAuditReady
          ? "bg-success/5 border-success/30"
          : qualiopi.score >= 50
          ? "bg-warning/5 border-warning/30"
          : "bg-destructive/5 border-destructive/30"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAuditReady ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-warning" />
            )}
            <h3 className="font-semibold text-sm">Qualiopi — état du dossier</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-semibold px-2.5 py-0.5",
                isAuditReady
                  ? "bg-success/10 text-success border-success/30"
                  : "bg-warning/10 text-warning border-warning/30"
              )}
            >
              {isAuditReady ? "✅ Audit-ready" : "⚠️ À compléter"}
            </Badge>
          </div>
        </div>

        {/* Score bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">Complétion</span>
            <span className={cn(
              "text-2xl font-bold tabular-nums",
              qualiopi.score >= 80 ? "text-success" : qualiopi.score >= 50 ? "text-warning" : "text-destructive"
            )}>
              {qualiopi.score}%
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{ width: `${qualiopi.score}%`, backgroundColor: progressBg }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {qualiopi.conformeCount} critères conformes sur {qualiopi.totalApplicable} applicables
          </p>
        </div>
      </div>

      {/* 3 compteurs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-lg font-bold text-success tabular-nums">{preuvesOk}</span>
          </div>
          <span className="text-[11px] text-muted-foreground text-center">Preuves OK</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-lg font-bold text-destructive tabular-nums">{preuvesManquantes}</span>
          </div>
          <span className="text-[11px] text-muted-foreground text-center">Manquantes</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-lg font-bold text-warning tabular-nums">{preuvesPartielles}</span>
          </div>
          <span className="text-[11px] text-muted-foreground text-center">À compléter</span>
        </div>
      </div>

      {/* Alertes */}
      {qualiopi.alertes.length > 0 && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            {qualiopi.alertes.length} point(s) d'attention
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1 text-xs">
              {qualiopi.alertes.slice(0, 3).map((a, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
            {qualiopi.alertes.length > 3 && (
              <Button
                variant="link"
                size="sm"
                className="text-xs p-0 h-auto mt-1 text-destructive"
                onClick={() => setShowAlertesDialog(true)}
              >
                Voir les {qualiopi.alertes.length} alertes →
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Preuves requises — checklist par catégorie */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Preuves requises
        </h4>
      </div>

      {Object.entries(grouped).map(([category, criteria]) => {
        const config = categoryConfig[category] || { label: category, icon: Shield };
        const CategoryIcon = config.icon;
        const conformes = criteria.filter(c => c.status === "conforme").length;
        const applicable = criteria.filter(c => c.status !== "na").length;
        const allConformes = conformes === applicable && applicable > 0;

        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {config.label}
                </h4>
              </div>
              <Badge variant="outline" className={cn(
                "text-[10px]",
                allConformes
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-muted text-muted-foreground"
              )}>
                {conformes}/{applicable}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {criteria.map(c => (
                <CriterionRow key={c.id} criterion={c} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Dialog alertes complètes */}
      <Dialog open={showAlertesDialog} onOpenChange={setShowAlertesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Points d'attention Qualiopi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {qualiopi.alertes.map((a, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg border bg-destructive/5">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm">{a}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
