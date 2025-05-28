import { renderComponent } from '$lib/components/ui/data-table';
import type { ColumnDef } from '@tanstack/table-core';
import type { PageData } from '../../../../../../../.svelte-kit/types/src/routes';
import BaseTableHeader from '$lib/components/BaseTable/BaseTableHeader.svelte';
import TableActions from './table-actions.svelte';

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
      return renderComponent(TableActions, { id: row.original.id });
    },
    meta: {
      class: 'text-right w-[1%] whitespace-nowrap'
    }
  }
];
