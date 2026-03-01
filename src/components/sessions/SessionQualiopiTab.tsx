import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Shield,
  FileText,
  GraduationCap,
  ClipboardList,
  Star,
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
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{criterion.description}</p>
        {criterion.detail && (
          <p className={cn("text-xs mt-1 font-medium", statusInfo.class)}>
            {criterion.detail}
          </p>
        )}
      </div>
    </div>
  );
}

export function SessionQualiopiTab({ sessionId }: SessionQualiopiTabProps) {
  const { data: qualiopi, isLoading } = useSessionQualiopi(sessionId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!qualiopi) return null;

  const progressBg = qualiopi.score >= 80 ? "hsl(var(--success))" : qualiopi.score >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  // Group by category
  const grouped = qualiopi.criteria.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, QualiopiCriterion[]>);

  return (
    <div className="space-y-5">
      {/* Score global */}
      <div className="p-4 rounded-xl border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Score de conformité Qualiopi</h3>
          </div>
          <span className={cn(
            "text-2xl font-bold",
            qualiopi.score >= 80 ? "text-success" : qualiopi.score >= 50 ? "text-warning" : "text-destructive"
          )}>
            {qualiopi.score}%
          </span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full transition-all rounded-full"
            style={{ width: `${qualiopi.score}%`, backgroundColor: progressBg }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {qualiopi.conformeCount} critères conformes sur {qualiopi.totalApplicable} applicables
        </p>
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
              {qualiopi.alertes.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Critères par catégorie */}
      {Object.entries(grouped).map(([category, criteria]) => {
        const config = categoryConfig[category] || { label: category, icon: Shield };
        const CategoryIcon = config.icon;
        const conformes = criteria.filter(c => c.status === "conforme").length;
        const applicable = criteria.filter(c => c.status !== "na").length;

        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {config.label}
                </h4>
              </div>
              <span className="text-xs text-muted-foreground">
                {conformes}/{applicable}
              </span>
            </div>
            <div className="space-y-1.5">
              {criteria.map(c => (
                <CriterionRow key={c.id} criterion={c} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
