import { renderComponent } from '$lib/components/ui/data-table';
import type { ColumnDef } from '@tanstack/table-core';
import DataTableActions from './table-actions.svelte';
import BaseTableHeader from '../../../../../../lib/components/BaseTable/BaseTableHeader.svelte';
import { Checkbox } from '$lib/components/ui/checkbox';
import type { PageData } from './$types';
import Check from '@lucide/svelte/icons/check';
import ImageIcon from '@lucide/svelte/icons/image';
import StickyNoteIcon from '@lucide/svelte/icons/sticky-note';


export const columns: ColumnDef<PageData['group']['metas'][number]>[] = [
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
    meta: { class: 'pl-2 w-8 min-w-8 max-w-8',
        preventRowClick: true 
     }
  },
  {
    accessorKey: 'tagName',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Tag',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
      meta: {
  class: 'pl-2 flex-[2] min-w-[120px] max-w-[220px] xl:flex-[1] xl:max-w-[150px]'
}
  },

  {
    accessorKey: 'name',
    header: ({ column }) =>
      renderComponent(BaseTableHeader, {
        name: 'Name',
        onclick: column.getToggleSortingHandler(),
        sort: column.getIsSorted()
      }),
      meta: {
  class: 'flex-[2] min-w-[120px] max-w-[220px] xl:flex-[1] xl:max-w-[150px]'
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
    accessorFn: (row) => row.locationsCount?.total ?? 0,
    meta: {
  class: 'w-24 min-w-16 max-w-28 pl-2 xl:w-32 xl:max-w-40'
}
  },
  {
    accessorKey: 'levels',
    header: () => renderComponent(BaseTableHeader, { name: 'Levels' }),
    accessorFn: (row) =>
      row.metaLevels
        .map((m) => m.level.name)
        .sort()
        .join(', '),
    filterFn: (row, columnId, filterValue) => {
      const filters = Array.isArray(filterValue)
        ? (filterValue as string[])
        : filterValue != null
          ? [filterValue as string]
          : [];

      if (filters.length === 0) return true;

      const joined: string = row.getValue<string>(columnId) ?? '';

      const result = filters.some((f) =>
        joined
          .toLowerCase()
          .split(/\s*,\s*/)
          .includes(f.toLowerCase())
      );

      return result;
    },
    meta: {
  class: 'w-40 min-w-[96px] max-w-[160px] truncate xl:w-64 xl:max-w-[240px]'
}
  },
  {
    accessorKey: 'images',
    header: () => renderComponent(ImageIcon, { size: 16, class: 'mx-auto' }),
    cell: ({ row }) => {
      if (row.original.images.length != 0) {
        return renderComponent(Check, { size: 16, color: 'green',class: 'mx-auto' });
      } else {
        return '';
      }
    },
    filterFn: (row, columnId, filterValue) => {
      const filters = Array.isArray(filterValue)
        ? filterValue
        : filterValue != null
          ? [filterValue]
          : [];

      if (filters.length === 0) return true;

      const images = row.getValue<string[]>(columnId) || [];

      return filters.some((f) => {
        if (f === 'has') return images.length > 0;
        if (f === 'none') return images.length === 0;
        return true;
      });
    },
    meta: { class: 'w-12 min-w-10 max-w-14 text-left hidden xl:table-cell' }
  },
  {
    accessorKey: 'note',
  header: () => renderComponent(StickyNoteIcon, { size: 16, class: 'mx-auto' }),
    cell: ({ row }) =>
      row.getValue<string>('note') ? renderComponent(Check, { size: 16, color: 'green',class: 'mx-auto' }) : '',
    filterFn: (row, columnId, filterValue) => {
      const filters = Array.isArray(filterValue)
        ? filterValue
        : filterValue != null
          ? [filterValue]
          : [];

      if (filters.length === 0) return true;
      const note = row.getValue<string>(columnId) || '';

      return filters.some((f) => {
        if (f === 'has') return note.length > 0;
        if (f === 'none') return note.length === 0;
        return false;
      });
    },
    meta: { class: 'w-12 min-w-10 max-w-14 text-center hidden xl:table-cell' }
  },
  {
    id: 'search',
    header: '',
    filterFn: (row, _colId, filterValue) => {
      const search = (filterValue as string).toLowerCase();
      return (
        row.getValue<string>('tagName').toLowerCase().includes(search) ||
        row.getValue<string>('name').toLowerCase().includes(search)
      );
    },
    enableHiding: true
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return renderComponent(DataTableActions, { id: row.original.id });
    },
    meta: {
      class: 'w-12 min-w-12 max-w-12 text-right' 
    }
  }
];
