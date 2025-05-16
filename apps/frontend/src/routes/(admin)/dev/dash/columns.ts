import { renderComponent } from '$lib/components/ui/data-table';
import type { ColumnDef } from '@tanstack/table-core';
import type { PageData } from './$types';
import BaseTableHeader from '$lib/components/BaseTable/BaseTableHeader.svelte';
import BaseTableLink from '$lib/components/BaseTable/BaseTableLink.svelte';
export const columns: ColumnDef<PageData['userGroups'][number]>[] = [
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
        link: `/dev/dash/groups/${row.original.id}`,
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
    accessorKey: 'locationCount',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Locations',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      })
  },
  {
    accessorKey: 'mapsCount',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Maps',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      })
  },
  {
    accessorKey: 'gamesPlayed',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Games Played',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      })
  }
];
