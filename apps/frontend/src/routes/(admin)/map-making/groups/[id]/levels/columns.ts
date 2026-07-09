import { renderComponent } from '$lib/components/ui/data-table';
import type { ColumnDef } from '@tanstack/table-core';
import type { PageData } from './$types';
import BaseTableHeader from '$lib/components/BaseTable/BaseTableHeader.svelte';
import BaseTableDeleteDropdown from '$lib/components/BaseTable/BaseTableDeleteDropdown.svelte';

export const columns: ColumnDef<PageData['group']['levels'][number]>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Name',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      })
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return renderComponent(BaseTableDeleteDropdown, {
        id: row.original.id,
        action: '?/deleteLevel'
      });
    },
    meta: {
      class: 'text-right w-[1%] whitespace-nowrap'
    }
  }
];
