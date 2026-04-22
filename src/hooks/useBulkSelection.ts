import { useCallback, useMemo, useState } from "react";

/**
 * Generic multi-row selection state for any list view.
 * `getId` extracts a stable identifier from a row.
 *
 * Usage:
 *   const sel = useBulkSelection(rows, (r) => r.id);
 *   <Checkbox checked={sel.isSelected(row.id)} onCheckedChange={() => sel.toggle(row.id)} />
 *   <BulkActionBar count={sel.count} onClear={sel.clear}>...</BulkActionBar>
 */
export function useBulkSelection<T>(items: T[], getId: (item: T) => string) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => items.map(getId), [items, getId]);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(allIds));
  }, [allIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === allIds.length && allIds.length > 0 ? new Set() : new Set(allIds),
    );
  }, [allIds]);

  const selectedItems = useMemo(
    () => items.filter((it) => selected.has(getId(it))),
    [items, selected, getId],
  );

  const allSelected = allIds.length > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && selected.size < allIds.length;

  return {
    selected,
    selectedIds: Array.from(selected),
    selectedItems,
    count: selected.size,
    isSelected,
    toggle,
    selectAll,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}
