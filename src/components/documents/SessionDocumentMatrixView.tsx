// ═══════════════════════════════════════════════════════════════
// SessionDocumentMatrixView — Full session document cockpit
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Users, CheckCircle2, AlertTriangle,
  ChevronUp, ChevronDown, Download, Play, Mail, FileArchive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSessionDocumentMatrix } from "@/hooks/useSessionDocumentMatrix";
import { DOCUMENT_BLOCKS } from "@/lib/document-workflow/documentBlockConfig";
import { buildAuditCSV, downloadCSV } from "@/lib/document-workflow/auditExport";
import { useGenerateDocument, buildVariablesForGeneration } from "@/hooks/useTemplateStudioV2";
import { SessionDocumentsOverviewCard } from "./SessionDocumentsOverviewCard";
import { SessionDocumentFiltersBar, type LearnerStatusFilter, type BlockFilter } from "./SessionDocumentFiltersBar";
import { SessionDocumentMatrixCell } from "./SessionDocumentMatrixCell";
import { SessionDocumentDetailPanel } from "./SessionDocumentDetailPanel";
import { BulkGenerationDialog } from "./BulkGenerationDialog";
import { BulkEmailDialog } from "./BulkEmailDialog";
import { ExportAuditPackDialog } from "./ExportAuditPackDialog";
import type { DocumentBlock, DocumentBlockSummary, SessionDocumentMatrixRow, DocumentWorkflowItem } from "@/lib/document-workflow/types";

interface SessionDocumentMatrixViewProps {
  sessionId: string;
  sessionName?: string;
  className?: string;
}

type SortField = "name" | "progress" | "status";
type SortDir = "asc" | "desc";

export function SessionDocumentMatrixView({
  sessionId,
  sessionName,
  className,
}: SessionDocumentMatrixViewProps) {
  const { data: rows, isLoading, error, refetch } = useSessionDocumentMatrix({
    sessionId,
    enabled: true,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LearnerStatusFilter>("all");
  const [blockFilter, setBlockFilter] = useState<BlockFilter>("all");

  // Sort
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk dialogs
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [exportAuditOpen, setExportAuditOpen] = useState(false);
  const generateDoc = useGenerateDocument();

  // Detail panel
  const [detailState, setDetailState] = useState<{
    row: SessionDocumentMatrixRow;
    block: DocumentBlockSummary | null;
  } | null>(null);

  const blockOrder = useMemo(() => {
    const entries = Object.entries(DOCUMENT_BLOCKS) as [DocumentBlock, { label: string; sortOrder: number }][];
    entries.sort((a, b) => a[1].sortOrder - b[1].sortOrder);
    return entries;
  }, []);

  // Filter & sort
  const filteredRows = useMemo(() => {
    if (!rows) return [];
    let result = [...rows];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.contactName.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(r => r.overallStatus === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.contactName.localeCompare(b.contactName);
          break;
        case "progress":
          cmp = (a.totalDocuments > 0 ? a.generatedCount / a.totalDocuments : 0)
              - (b.totalDocuments > 0 ? b.generatedCount / b.totalDocuments : 0);
          break;
        case "status": {
          const order = { blocked: 0, incomplete: 1, empty: 2, complete: 3 };
          cmp = (order[a.overallStatus] ?? 2) - (order[b.overallStatus] ?? 2);
          break;
        }
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [rows, search, statusFilter, sortField, sortDir]);

  const filterCounts = useMemo(() => {
    if (!rows) return { all: 0, complete: 0, incomplete: 0, blocked: 0 };
    return {
      all: rows.length,
      complete: rows.filter(r => r.overallStatus === "complete").length,
      incomplete: rows.filter(r => r.overallStatus === "incomplete").length,
      blocked: rows.filter(r => r.overallStatus === "blocked").length,
    };
  }, [rows]);

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map(r => r.contactId)));
    }
  }, [selectedIds.size, filteredRows]);

  // Sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = sortDir === "asc" ? ChevronUp : ChevronDown;

  // Cell click → open detail panel
  const handleCellClick = (row: SessionDocumentMatrixRow, block: DocumentBlockSummary | null) => {
    setDetailState({ row, block });
  };

  // Bulk generation handler
  const handleBulkGenerate = useCallback(async (_contactId: string, item: DocumentWorkflowItem): Promise<boolean> => {
    if (!item.templateId) return false;
    try {
      const variables = await buildVariablesForGeneration({
        contactId: item.contactId ?? undefined,
        sessionId: item.sessionId ?? undefined,
      });
      await generateDoc.mutateAsync({
        templateId: item.templateId,
        contactId: item.contactId ?? undefined,
        sessionId: item.sessionId ?? undefined,
        variables,
      });
      return true;
    } catch {
      return false;
    }
  }, [generateDoc]);

  // Audit export
  const handleExportAudit = useCallback(() => {
    if (!rows?.length) return;
    const csv = buildAuditCSV(rows);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `audit-session-${sessionName?.replace(/\s+/g, "_") ?? sessionId}-${date}.csv`);
    toast.success("Export audit téléchargé");
  }, [rows, sessionName, sessionId]);

  // ── Render ──

  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-2" />
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-12 w-full mb-1" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-10 text-muted-foreground", className)}>
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Erreur de chargement</p>
        <p className="text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className={cn("text-center py-10 text-muted-foreground", className)}>
        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Aucun apprenant inscrit</p>
        <p className="text-sm mt-1">Ajoutez des inscriptions pour voir le pilotage documentaire.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overview */}
      <SessionDocumentsOverviewCard
        rows={rows}
        onFilterIncomplete={() => setStatusFilter("incomplete")}
      />

      {/* Filters */}
      <SessionDocumentFiltersBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        blockFilter={blockFilter}
        onBlockFilterChange={setBlockFilter}
        counts={filterCounts}
      />

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <Badge variant="outline" className="text-[11px] h-6 bg-primary/10 text-primary border-primary/20">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1.5"
            onClick={() => setBulkOpen(true)}
          >
            <Play className="h-3 w-3" />
            Générer les documents
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1.5"
            onClick={handleExportAudit}
          >
            <Download className="h-3 w-3" />
            Export audit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            Désélectionner
          </Button>
        </div>
      )}

      {/* Matrix table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="w-8 px-2 py-2">
                  <Checkbox
                    checked={selectedIds.size === filteredRows.length && filteredRows.length > 0}
                    onCheckedChange={toggleSelectAll}
                    className="h-3.5 w-3.5"
                  />
                </th>
                <th className="text-left px-3 py-2 min-w-[180px]">
                  <button
                    className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort("name")}
                  >
                    Apprenant
                    {sortField === "name" && <SortIcon className="h-3 w-3" />}
                  </button>
                </th>
                <th className="text-center px-2 py-2 w-24">
                  <button
                    className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground mx-auto"
                    onClick={() => handleSort("progress")}
                  >
                    Progrès
                    {sortField === "progress" && <SortIcon className="h-3 w-3" />}
                  </button>
                </th>
                {blockOrder
                  .filter(([block]) => blockFilter === "all" || blockFilter === block)
                  .map(([block, meta]) => (
                    <th key={block} className="text-center px-1.5 py-2 min-w-[80px]">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {meta.label.split(" ")[0]}
                      </span>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const progressPct = row.totalDocuments > 0
                  ? Math.round((row.generatedCount / row.totalDocuments) * 100)
                  : 0;

                const statusStyle = row.overallStatus === "complete"
                  ? "bg-green-50/50"
                  : row.overallStatus === "blocked"
                    ? "bg-orange-50/30"
                    : row.overallStatus === "incomplete"
                      ? ""
                      : "bg-muted/20";

                return (
                  <tr
                    key={row.contactId}
                    className={cn(
                      "border-b last:border-b-0 hover:bg-muted/30 transition-colors",
                      statusStyle
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-2 py-2">
                      <Checkbox
                        checked={selectedIds.has(row.contactId)}
                        onCheckedChange={() => toggleSelect(row.contactId)}
                        className="h-3.5 w-3.5"
                      />
                    </td>

                    {/* Learner name */}
                    <td className="px-3 py-2">
                      <button
                        className="flex items-center gap-2 w-full text-left group"
                        onClick={() => handleCellClick(row, null)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[13px] truncate group-hover:text-primary transition-colors">
                            {row.contactName || "Sans nom"}
                          </p>
                          {row.contactEmail && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {row.contactEmail}
                            </p>
                          )}
                        </div>
                        {row.overallStatus === "complete" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        )}
                        {row.overallStatus === "blocked" && (
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                        )}
                      </button>
                    </td>

                    {/* Progress */}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5 justify-center">
                        <Progress value={progressPct} className="h-1.5 w-12" />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {row.generatedCount}/{row.totalDocuments}
                        </span>
                      </div>
                    </td>

                    {/* Block cells */}
                    {blockOrder
                      .filter(([block]) => blockFilter === "all" || blockFilter === block)
                      .map(([block]) => {
                        const blockSummary = row.blocks.find(b => b.block === block) ?? null;
                        return (
                          <SessionDocumentMatrixCell
                            key={block}
                            block={blockSummary}
                            onClick={() => handleCellClick(row, blockSummary)}
                          />
                        );
                      })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Aucun apprenant ne correspond aux filtres.
          </div>
        )}
      </div>

      {/* Detail panel */}
      <SessionDocumentDetailPanel
        open={!!detailState}
        onOpenChange={(o) => !o && setDetailState(null)}
        contactId={detailState?.row.contactId ?? null}
        contactName={detailState?.row.contactName ?? ""}
        contactEmail={detailState?.row.contactEmail}
        sessionName={sessionName}
        block={detailState?.block ?? null}
        allBlocks={detailState?.row.blocks ?? []}
        onRefetch={refetch}
      />

      {/* Bulk generation dialog */}
      <BulkGenerationDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        rows={rows ?? []}
        selectedContactIds={selectedIds}
        onGenerate={handleBulkGenerate}
        onComplete={() => {
          setSelectedIds(new Set());
          refetch();
        }}
      />
    </div>
  );
}
