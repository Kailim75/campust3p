// ═══════════════════════════════════════════════════════════════
// LearnerDocumentsOverviewCard — Summary banner with stats
// ═══════════════════════════════════════════════════════════════

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Send, PenTool,
  Package, Eye, RefreshCw, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewStats {
  total: number;
  generated: number;
  missing: number;
  sent: number;
  signed: number;
  errors: number;
  blocked: number;
}

interface LearnerDocumentsOverviewCardProps {
  stats: OverviewStats;
  isLoading?: boolean;
  onGenerateAll?: () => void;
  onRetryFailed?: () => void;
  isGenerating?: boolean;
  isRetrying?: boolean;
  className?: string;
}

export function LearnerDocumentsOverviewCard({
  stats,
  isLoading = false,
  onGenerateAll,
  onRetryFailed,
  isGenerating = false,
  isRetrying = false,
  className,
}: LearnerDocumentsOverviewCardProps) {
  const progressPercent = stats.total > 0
    ? Math.round((stats.generated / stats.total) * 100)
    : 0;

  const isComplete = stats.missing === 0 && stats.blocked === 0 && stats.errors === 0;
  const canGenerate = stats.missing > 0 && stats.blocked < stats.missing;

  if (isLoading) {
    return (
      <Card className={cn("bg-gradient-to-r from-primary/5 to-primary/10 border-primary/10", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-primary/10 rounded w-32 animate-pulse" />
              <div className="h-2 bg-primary/10 rounded w-48 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-l-4",
        isComplete
          ? "border-l-green-500 bg-gradient-to-r from-green-50/50 to-background"
          : stats.errors > 0
            ? "border-l-destructive bg-gradient-to-r from-destructive/5 to-background"
            : stats.blocked > 0
              ? "border-l-orange-500 bg-gradient-to-r from-orange-50/50 to-background"
              : "border-l-primary bg-gradient-to-r from-primary/5 to-background",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: Icon + Progress */}
          <div className="flex items-center gap-3 flex-1">
            <div
              className={cn(
                "p-2.5 rounded-full flex-shrink-0",
                isComplete ? "bg-green-100" :
                stats.errors > 0 ? "bg-destructive/10" :
                stats.blocked > 0 ? "bg-orange-100" :
                "bg-primary/10"
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : stats.errors > 0 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">Documents</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-5",
                    isComplete && "bg-green-50 text-green-700 border-green-200"
                  )}
                >
                  {stats.generated}/{stats.total}
                </Badge>
              </div>
              
              <Progress value={progressPercent} className="h-1.5 mt-2 max-w-[200px]" />
            </div>
          </div>

          {/* Center: Stats chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {stats.sent > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-indigo-50 text-indigo-700 border-indigo-200">
                <Send className="h-2.5 w-2.5" />
                {stats.sent} envoyé{stats.sent > 1 ? "s" : ""}
              </Badge>
            )}
            {stats.signed > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-green-50 text-green-700 border-green-200">
                <PenTool className="h-2.5 w-2.5" />
                {stats.signed} signé{stats.signed > 1 ? "s" : ""}
              </Badge>
            )}
            {stats.missing > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="h-2.5 w-2.5" />
                {stats.missing} à générer
              </Badge>
            )}
            {stats.blocked > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-orange-50 text-orange-700 border-orange-200">
                <AlertTriangle className="h-2.5 w-2.5" />
                {stats.blocked} bloqué{stats.blocked > 1 ? "s" : ""}
              </Badge>
            )}
            {stats.errors > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-destructive/10 text-destructive border-destructive/30">
                {stats.errors} erreur{stats.errors > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {stats.errors > 0 && onRetryFailed && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={onRetryFailed}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Relancer
              </Button>
            )}
            {canGenerate && onGenerateAll && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={onGenerateAll}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Package className="h-3.5 w-3.5" />
                )}
                Générer tout
              </Button>
            )}
            {isComplete && (
              <Badge variant="outline" className="h-8 px-3 text-xs bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Dossier complet
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
