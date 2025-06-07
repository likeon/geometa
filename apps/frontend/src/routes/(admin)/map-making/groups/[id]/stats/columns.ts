import { renderComponent } from '$lib/components/ui/data-table';
import type { ColumnDef } from '@tanstack/table-core';
import BaseTableHeader from '$lib/components/BaseTable/BaseTableHeader.svelte';

type StatsData = {
  metaId: number;
  metaName: string;
  totalCount: number;
  personalMapCount: number;
  regularMapCount: number;
};

export const columns: ColumnDef<StatsData>[] = [
  {
    accessorKey: 'metaName',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Meta Name',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      })
  },
  {
    accessorKey: 'totalCount',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Total Requests',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return value.toLocaleString();
    }
  },
  {
    accessorKey: 'personalMapCount',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Personal Maps',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return value.toLocaleString();
    }
  },
  {
    accessorKey: 'regularMapCount',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Regular Maps',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return value.toLocaleString();
    }
  }
];
