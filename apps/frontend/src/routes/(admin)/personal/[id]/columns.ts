import { renderComponent } from '$lib/components/ui/data-table';
import type { ColumnDef } from '@tanstack/table-core';
import BaseTableHeader from '$lib/components/BaseTable/BaseTableHeader.svelte';
import { Checkbox } from '$lib/components/ui/checkbox';
import type { PageData } from './$types';

export const columns: ColumnDef<PageData['metaList'][number]>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      renderComponent(Checkbox, {
        checked: table.getIsAllPageRowsSelected(),
        indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
        onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
    cell: ({ row }) =>
      renderComponent(Checkbox, {
        checked: row.getIsSelected(),
        onCheckedChange: (value) => row.toggleSelected(!!value),
        'aria-label': 'Select row'
      }),
    enableSorting: false,
    enableHiding: false,
    meta: { class: 'pl-2 w-8 min-w-8 max-w-8', preventRowClick: true }
  },

  {
    accessorKey: 'name',
    accessorFn: (row) => {
      const country = row.countries?.[0] || 'Unknown country';
      return `${country} - ${row.name}`;
    },
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Name',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
    meta: {
      class: 'pl-2 flex-[2] min-w-[120px] max-w-[220px] xl:flex-[1] xl:max-w-[150px]'
    }
  },
  {
    accessorKey: 'usedInMapName',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Meta Map',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
    filterFn: (row, columnId, filterValue) => {
      const filters = Array.isArray(filterValue)
        ? (filterValue as string[])
        : filterValue != null
          ? [filterValue as string]
          : [];

      if (filters.length === 0) return true;

      const joined: string = row.getValue<string>(columnId) ?? '';

      return filters.some((f) =>
        joined
          .toLowerCase()
          .split(/\s*,\s*/)
          .includes(f.toLowerCase())
      );
    },
    meta: {
      class: 'pl-2 flex-[2] min-w-[120px] max-w-[220px] xl:flex-[1] xl:max-w-[150px]'
    }
  },
  {
    accessorKey: 'locationsCount',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Locations',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
    meta: {
      class: 'w-24 min-w-16 max-w-28 pl-2 xl:w-32 xl:max-w-40'
    }
  }
];
