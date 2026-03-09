// ═══════════════════════════════════════════════════════════════
// SessionDocumentsOverviewCard — Session-level document stats banner
// ═══════════════════════════════════════════════════════════════

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, CheckCircle2, AlertTriangle, Clock, FileText,
  Package, Loader2, Filter, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildAuditCSV, downloadCSV } from "@/lib/document-workflow/auditExport";
import { toast } from "sonner";
import type { SessionDocumentMatrixRow } from "@/lib/document-workflow/types";

interface SessionDocumentsOverviewCardProps {
  rows: SessionDocumentMatrixRow[];
  isLoading?: boolean;
  onFilterIncomplete?: () => void;
  onBulkGenerate?: () => void;
  isBulkGenerating?: boolean;
  className?: string;
}

export function SessionDocumentsOverviewCard({
  rows,
  isLoading = false,
  onFilterIncomplete,
  onBulkGenerate,
  isBulkGenerating = false,
  className,
}: SessionDocumentsOverviewCardProps) {
  const totalLearners = rows.length;
  const completeLearners = rows.filter(r => r.overallStatus === "complete").length;
  const incompleteLearners = rows.filter(r => r.overallStatus === "incomplete").length;
  const blockedLearners = rows.filter(r => r.overallStatus === "blocked").length;
  const totalDocs = rows.reduce((s, r) => s + r.totalDocuments, 0);
  const generatedDocs = rows.reduce((s, r) => s + r.generatedCount, 0);
  const missingDocs = rows.reduce((s, r) => s + r.missingCount, 0);

  const progressPercent = totalDocs > 0 ? Math.round((generatedDocs / totalDocs) * 100) : 0;
  const allComplete = incompleteLearners === 0 && blockedLearners === 0 && totalLearners > 0;

  if (isLoading) {
    return (
      <Card className={cn("bg-gradient-to-r from-primary/5 to-primary/10 border-primary/10", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-primary/10 rounded w-40 animate-pulse" />
              <div className="h-2 bg-primary/10 rounded w-56 animate-pulse" />
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
        allComplete
          ? "border-l-green-500 bg-gradient-to-r from-green-50/50 to-background"
          : blockedLearners > 0
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
                allComplete ? "bg-green-100" :
                blockedLearners > 0 ? "bg-orange-100" :
                "bg-primary/10"
              )}
            >
              {allComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : blockedLearners > 0 ? (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              ) : (
                <Users className="h-5 w-5 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">Pilotage documentaire</span>
                <Badge variant="outline" className="text-[10px] h-5">
                  {totalLearners} apprenant{totalLearners > 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Progress value={progressPercent} className="h-1.5 flex-1 max-w-[200px]" />
                <span className="text-[11px] text-muted-foreground">
                  {generatedDocs}/{totalDocs} docs
                </span>
              </div>
            </div>
          </div>

          {/* Center: Stats chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {completeLearners} complet{completeLearners > 1 ? "s" : ""}
            </Badge>
            {incompleteLearners > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="h-2.5 w-2.5" />
                {incompleteLearners} incomplet{incompleteLearners > 1 ? "s" : ""}
              </Badge>
            )}
            {blockedLearners > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-orange-50 text-orange-700 border-orange-200">
                <AlertTriangle className="h-2.5 w-2.5" />
                {blockedLearners} bloqué{blockedLearners > 1 ? "s" : ""}
              </Badge>
            )}
            {missingDocs > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-muted text-muted-foreground">
                <FileText className="h-2.5 w-2.5" />
                {missingDocs} à générer
              </Badge>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {incompleteLearners > 0 && onFilterIncomplete && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={onFilterIncomplete}
              >
                <Filter className="h-3.5 w-3.5" />
                Voir incomplets
              </Button>
            )}
            {missingDocs > 0 && onBulkGenerate && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={onBulkGenerate}
                disabled={isBulkGenerating}
              >
                {isBulkGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Package className="h-3.5 w-3.5" />
                )}
                Générer
              </Button>
            )}
            {allComplete && (
              <Badge variant="outline" className="h-8 px-3 text-xs bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Dossiers complets
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                const csv = buildAuditCSV(rows);
                const date = new Date().toISOString().slice(0, 10);
                downloadCSV(csv, `audit-session-${date}.csv`);
                toast.success("Export audit téléchargé");
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Export audit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
