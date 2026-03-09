// ═══════════════════════════════════════════════════════════════
// SessionDocumentFiltersBar — Filters for the session matrix
// ═══════════════════════════════════════════════════════════════

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentBlock } from "@/lib/document-workflow/types";
import { DOCUMENT_BLOCKS } from "@/lib/document-workflow/documentBlockConfig";

export type LearnerStatusFilter =
  | "all"
  | "complete"
  | "incomplete"
  | "blocked"
  | "empty";

export type BlockFilter = DocumentBlock | "all";
export type ContractFilter = "all" | "contrat" | "convention" | "a_qualifier";

interface SessionDocumentFiltersBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: LearnerStatusFilter;
  onStatusFilterChange: (val: LearnerStatusFilter) => void;
  blockFilter: BlockFilter;
  onBlockFilterChange: (val: BlockFilter) => void;
  contractFilter?: ContractFilter;
  onContractFilterChange?: (val: ContractFilter) => void;
  counts: {
    all: number;
    complete: number;
    incomplete: number;
    blocked: number;
  };
  contractCounts?: {
    all: number;
    contrat: number;
    convention: number;
    a_qualifier: number;
  };
  className?: string;
}

const STATUS_FILTERS: { value: LearnerStatusFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "complete", label: "Complets" },
  { value: "incomplete", label: "Incomplets" },
  { value: "blocked", label: "Bloqués" },
];

const CONTRACT_FILTERS: { value: ContractFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "contrat", label: "Contrat" },
  { value: "convention", label: "Convention" },
  { value: "a_qualifier", label: "À qualifier" },
];

export function SessionDocumentFiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  blockFilter,
  onBlockFilterChange,
  contractFilter,
  onContractFilterChange,
  counts,
  contractCounts,
  className,
}: SessionDocumentFiltersBarProps) {
  const blockEntries = Object.entries(DOCUMENT_BLOCKS) as [DocumentBlock, { label: string }][];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Row 1: Search + Status filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un apprenant..."
            className="pl-8 h-8 text-xs"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map(({ value, label }) => {
            const count = counts[value === "all" ? "all" : value] ?? 0;
            return (
              <Button
                key={value}
                variant={statusFilter === value ? "default" : "outline"}
                size="sm"
                className="h-7 text-[11px] gap-1 px-2.5"
                onClick={() => onStatusFilterChange(value)}
              >
                {label}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] h-4 px-1 ml-0.5",
                    statusFilter === value
                      ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                      : "bg-muted"
                  )}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Contract + Block filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Contract filter */}
        {contractFilter !== undefined && onContractFilterChange && contractCounts && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground mr-1">Cadre :</span>
            {CONTRACT_FILTERS.map(({ value, label }) => {
              const count = contractCounts[value] ?? 0;
              return (
                <Button
                  key={value}
                  variant={contractFilter === value ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-6 text-[10px] px-2 gap-1",
                    value === "a_qualifier" && contractFilter !== value && count > 0 && "text-orange-600"
                  )}
                  onClick={() => onContractFilterChange(value)}
                >
                  {label}
                  {count > 0 && value !== "all" && (
                    <span className="text-[9px] text-muted-foreground">({count})</span>
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {/* Block filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] text-muted-foreground mr-1">Bloc :</span>
          <Button
            variant={blockFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => onBlockFilterChange("all")}
          >
            Tous
          </Button>
          {blockEntries.map(([block, meta]) => (
            <Button
              key={block}
              variant={blockFilter === block ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => onBlockFilterChange(block)}
            >
              {meta.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
