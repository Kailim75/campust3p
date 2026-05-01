import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  /** Optional label override e.g. "factures" */
  itemLabel?: string;
}

/**
 * Sober pagination control for tables.
 * Designed for client-side or server-side pagination.
 */
export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  startIndex,
  endIndex,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  itemLabel = "éléments",
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-sm">
      <div className="text-muted-foreground">
        {totalItems > 0 ? (
          <>
            <span className="font-medium text-foreground">{startIndex}</span>
            {" – "}
            <span className="font-medium text-foreground">{endIndex}</span>
            {" sur "}
            <span className="font-medium text-foreground">{totalItems}</span>
            {" "}
            {itemLabel}
          </>
        ) : (
          <>0 {itemLabel}</>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Par page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={!hasPreviousPage}
            aria-label="Première page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage}
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="px-2 text-xs tabular-nums whitespace-nowrap">
            Page <span className="font-medium text-foreground">{currentPage}</span>
            {" / "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
            aria-label="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
            aria-label="Dernière page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
