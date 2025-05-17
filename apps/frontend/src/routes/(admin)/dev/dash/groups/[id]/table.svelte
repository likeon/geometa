<script
  lang="ts"
  generics="TData extends {
    id: number;
    metaLevels: { level: { name: string } }[];
  }, TValue">
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
  import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import BaseTableFilterPopover from '$lib/components/BaseTable/BaseTableFilterPopover.svelte';
  import { Button } from '$lib/components/ui/button';
  import X from '@lucide/svelte/icons/x';
  import { Input } from '$lib/components/ui/input';
  import { createVirtualizer } from './index.svelte';
  import { onMount, tick } from 'svelte';

  type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    initialSorting?: SortingState;
    selectedId?: Number;
    isModalOpen?: Boolean;
  };

  let {
    data,
    columns,
    initialSorting = [],
    selectedId = $bindable(),
    isModalOpen = $bindable()
  }: DataTableProps<TData, TValue> = $props();
  let sorting = $state<SortingState>(initialSorting);
  let rowSelection = $state<RowSelectionState>({});
  let columnFilters = $state<ColumnFiltersState>([]);
  let columnVisibility = $state<VisibilityState>({
    search: false
  });

  const table = createSvelteTable({
    get data() {
      return data;
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        sorting = updater(sorting);
      } else {
        sorting = updater;
      }
    },
    onRowSelectionChange: (updater) => {
      if (typeof updater === 'function') {
        rowSelection = updater(rowSelection);
      } else {
        rowSelection = updater;
      }
    },
    onColumnFiltersChange: (updater) => {
      if (typeof updater === 'function') {
        columnFilters = updater(columnFilters);
      } else {
        columnFilters = updater;
      }
    },
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === 'function') {
        columnVisibility = updater(columnVisibility);
      } else {
        columnVisibility = updater;
      }
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

  const levelOptions = $derived(
    Array.from(new Set(data.flatMap((row) => row.metaLevels.map((m) => m.level.name))))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }))
  );
  const isFiltered = $derived(table.getState().columnFilters.length > 0);

  const rows = $derived(table.getRowModel().rows);
  let virtualListEl: HTMLDivElement;
  const virtualizer = $derived(
    createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: rows.length,
      getScrollElement: () => virtualListEl,
      estimateSize: () => 36,
      overscan: 16
    })
  );
  const items = $derived(virtualizer.getVirtualItems());
  const paddingTop = $derived(items.length > 0 ? items[0].start : 0);
  const paddingBottom = $derived(
    items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1].end : 0
  );

  let tableEl: HTMLTableElement | null = null;
  let columnWidths: number[] = $state([]);
  let fixedLayout = $state(false);

  async function measureColumnWidths() {
    await tick();
    if (!tableEl) return;
    const ths = tableEl.querySelectorAll('thead th');
    columnWidths = Array.from(ths).map((th) => (th as HTMLElement).offsetWidth);
    fixedLayout = true;
  }

  onMount(() => {
    measureColumnWidths();
  });

  $effect(() => {
    if (items && items.length && !fixedLayout) {
      measureColumnWidths();
    }
  });
</script>

<div class="rounded-md">
  <div class="flex flex-1 items-center space-x-2">
    <Input
      placeholder="Filter tags"
      value={(table.getColumn('search')?.getFilterValue() as string) ?? ''}
      onchange={(e) => {
        table.getColumn('search')?.setFilterValue(e.currentTarget.value);
      }}
      oninput={(e) => {
        table.getColumn('search')?.setFilterValue(e.currentTarget.value);
      }}
      class="h-8 w-[150px] lg:w-[250px]" />
    <BaseTableFilterPopover
      {table}
      columnId="images"
      title="Images"
      options={[
        { label: 'Has Image', value: 'has' },
        { label: 'No Image', value: 'none' }
      ]} />
    <BaseTableFilterPopover
      {table}
      columnId="note"
      title="Notes"
      options={[
        { label: 'Has Note', value: 'has' },
        { label: 'Missing Note', value: 'none' }
      ]} />
    {#if levelOptions.length !== 0}
      <BaseTableFilterPopover {table} columnId="levels" title="Levels" options={levelOptions} />
    {/if}
    {#if isFiltered}
      <Button variant="ghost" onclick={() => table.resetColumnFilters()} class="h-8 px-2 lg:px-3">
        Reset
        <X size={16} />
      </Button>
    {/if}
  </div>
  <div
    style="height: 700px; overflow: auto; relative w-full overflow-auto"
    bind:this={virtualListEl}>
    <table
      style="--virtualPaddingTop: {paddingTop}px; --virtualPaddingBottom: {paddingBottom}px; text-sm
      {fixedLayout ? 'table-layout: fixed;' : ''}
      "
      bind:this={tableEl}>
      {#if fixedLayout && columnWidths.length}
        <colgroup>
          {#each columnWidths as width}
            <col style="width: {width}px;" />
          {/each}
        </colgroup>
      {/if}

      <thead>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <tr>
            {#each headerGroup.headers as header (header.id)}
              <th
                style="position: sticky; top:0; z-index :2;"
                class="bg-green-100 dark:bg-green-900 {header.column.columnDef.meta?.class}">
                {#if !header.isPlaceholder}
                  <FlexRender
                    content={header.column.columnDef.header}
                    context={header.getContext()} />
                {/if}
              </th>
            {/each}
          </tr>
        {/each}
      </thead>
      <tbody>
        {#each items as row, idx (row.index)}
          <tr
            data-state={rows[row.index].getIsSelected() && 'selected'}
            onclick={() => {
              selectedId = rows[row.index].original.id;
              isModalOpen = true;
            }}>
            {#each rows[row.index].getVisibleCells() as cell (cell.id)}
              <td class={cell.column.columnDef.meta?.class}>
                <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
              </td>
            {/each}
          </tr>
        {:else}
          <tr>
            <td colspan={columns.length} class="h-24 text-center">No results.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  table {
    width: 100%;
    table-layout: auto;
    border-spacing: 0;
    isolation: isolate;
  }

  tbody::before {
    display: block;
    padding-top: var(--virtualPaddingTop);
    content: '';
  }
  tbody::after {
    display: block;
    padding-bottom: var(--virtualPaddingBottom);
    content: '';
  }
  th {
    text-align: left;
  }
</style>
