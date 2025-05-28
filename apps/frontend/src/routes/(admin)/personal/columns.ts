import { renderComponent } from '$lib/components/ui/data-table';
import type { ColumnDef } from '@tanstack/table-core';
import type { PageData } from '../../../../.svelte-kit/types/src/routes';
import BaseTableHeader from '$lib/components/BaseTable/BaseTableHeader.svelte';
import BaseTableLink from '$lib/components/BaseTable/BaseTableLink.svelte';

export const columns: ColumnDef<PageData['personalMaps'][number]>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Name',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
    cell: ({ row }) =>
      renderComponent(BaseTableLink, {
        link: `/personal/${row.original.id}`,
        name: `${row.original.name}`
      })
  },
  {
    accessorKey: 'metasCount',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Metas',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      })
  },
  {
    accessorKey: 'locationsCount',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Locations',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      })
  }
];
