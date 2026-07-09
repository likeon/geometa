import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  type VisibilityState
} from '@tanstack/table-core';
import { createSvelteTable } from '$lib/components/ui/data-table';

// Shared tanstack table setup for BaseTable and VirtualizedTable.
// Must be called during component initialization (it creates $effects).
export function createBaseTable<TData, TValue>(params: {
  data: () => TData[];
  columns: () => ColumnDef<TData, TValue>[];
  initialSorting: () => SortingState;
  hiddenColumns?: () => string[];
}) {
  let sorting = $state<SortingState>([]);
  let hasUserSorted = $state(false);
  let rowSelection = $state<RowSelectionState>({});
  let columnFilters = $state<ColumnFiltersState>([]);
  let columnVisibility = $state<VisibilityState>({});
  let hasUserColumnVisibility = $state(false);

  $effect(() => {
    if (!hasUserSorted) {
      sorting = [...params.initialSorting()];
    }
  });

  $effect(() => {
    if (!hasUserColumnVisibility) {
      columnVisibility = (params.hiddenColumns?.() ?? []).reduce((acc, col) => {
        acc[col] = false;
        return acc;
      }, {} as VisibilityState);
    }
  });

  return createSvelteTable({
    get data() {
      return params.data();
    },
    get columns() {
      return params.columns();
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: (updater) => {
      hasUserSorted = true;
      sorting = typeof updater === 'function' ? updater(sorting) : updater;
    },
    onRowSelectionChange: (updater) => {
      rowSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
    },
    onColumnFiltersChange: (updater) => {
      columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
    },
    onColumnVisibilityChange: (updater) => {
      hasUserColumnVisibility = true;
      columnVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
    },
    state: {
      get columnVisibility() {
        return columnVisibility;
      },
      get sorting() {
        return sorting;
      },
      get rowSelection() {
        return rowSelection;
      },
      get columnFilters() {
        return columnFilters;
      }
    },
    enableSortingRemoval: false
  });
}
