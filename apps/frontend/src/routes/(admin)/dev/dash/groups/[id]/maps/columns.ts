import { renderComponent } from '$lib/components/ui/data-table';
import type { ColumnDef } from '@tanstack/table-core';
import type { PageData } from './$types';
import BaseTableHeader from '$lib/components/BaseTable/BaseTableHeader.svelte';
import BaseTableLink from '$lib/components/BaseTable/BaseTableLink.svelte';
import TableActions from './table-actions.svelte';

export const columns: ColumnDef<PageData['group']['maps'][number]>[] = [
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
    accessorKey: 'mapLevels',
    header: 'Levels',
    cell: ({ row }) => {
      return row.original.mapLevels.map((mapLevel) => mapLevel.level.name).join(', ');
    }
  },
  {
    accessorKey: 'locationCount',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Locations',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.locationsCount as Number;
      const b = rowB.original.locationsCount as Number;
      return a > b ? 1 : a < b ? -1 : 0;
    },
    cell: ({ row }) => {
      return row.original.locationsCount;
    }
  },
  {
    accessorKey: 'geoguessrLink',
    header: 'Geoguessr',
    cell: ({ row }) =>
      renderComponent(BaseTableLink, {
        link: `https://www.geoguessr.com/maps/${row.original.geoguessrId}`
      })
  },
  {
    accessorKey: 'metaListLink',
    header: 'Meta List',
    cell: ({ row }) =>
      renderComponent(BaseTableLink, {
        link: `/maps/${row.original.geoguessrId}`
      })
  },
  {
    accessorKey: 'downloadLocationsLink',
    header: 'Download JSON',
    cell: ({ row }) =>
      renderComponent(BaseTableLink, {
        link: `/dev/dash/groups/${row.original.mapGroupId}/maps/${row.original.id}/download`
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
