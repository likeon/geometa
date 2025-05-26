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
  import BaseTableFilterPopover from '$lib/components/BaseTable/BaseTableFilterPopover.svelte';
  import { Button } from '$lib/components/ui/button';
  import X from '@lucide/svelte/icons/x';
  import { Input } from '$lib/components/ui/input';

  import * as Table from '$lib/components/ui/table/index.js';
  import { createVirtualizer } from '$lib/virtualizer.svelte';
  import { enhance } from '$app/forms';

  type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    initialSorting?: SortingState;
    selectedId?: number;
    isModalOpen?: boolean;
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
      estimateSize: () => 49,
      overscan: 16
    })
  );
  const items = $derived(virtualizer.getVirtualItems());
  const paddingTop = $derived(items.length > 0 ? items[0].start : 0);
  const paddingBottom = $derived(
    items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1].end : 0
  );
  const selectedRows = $derived(table.getFilteredSelectedRowModel().rows);

  let prevDataSize = data?.length ?? 0;

  // if data is removed/added unselected all rows
  $effect(() => {
    if (data && data.length !== prevDataSize) {
      table.resetRowSelection();
    }
    prevDataSize = data?.length ?? 0;
  });
</script>

<div class="rounded-md">
  <div class="min-h-[40px] flex flex-1 items-center space-x-2">
    {#if selectedRows.length !== 0}
      <form
        action="?/deleteMetas"
        method="post"
        id="delete-metas-form"
        use:enhance={({ cancel, formData }) => {
          const confirmed = confirm(
            `Are you sure you want to delete ${selectedRows.length} meta(s)? IT'S PERMAMENT DELETION`
          );
          if (!confirmed) {
            cancel();
          }
          selectedRows.forEach((row) => {
            formData.append('id', `${row.original.id}`);
          });

          return async ({ update }) => {
            update();
          };
        }}>
        <button
          type="submit"
          class="w-full text-left px-2 py-1.5 bg-red-600 text-white font-semibold rounded hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm">
          MASS DELETE
        </button>
      </form>
    {/if}
    <Input
      placeholder="Filter tags"
      value={table.getColumn('search')?.getFilterValue() ?? ''}
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
  <div class="h-[700px] overflow-auto relative w-full" bind:this={virtualListEl}>
    <Table.Root
      style="--virtualPaddingTop: {paddingTop}px; --virtualPaddingBottom: {paddingBottom}px; table-layout: fixed;">
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head
                style="position: sticky; top:0; z-index :2;"
                class=" {header.column.columnDef.meta?.class}">
                {#if !header.isPlaceholder}
                  <FlexRender
                    content={header.column.columnDef.header}
                    context={header.getContext()} />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#each items as row (row.index)}
          <Table.Row
            data-state={rows[row.index].getIsSelected() && 'selected'}
            onclick={() => {
              selectedId = rows[row.index].original.id;
              isModalOpen = true;
            }}>
            {#each rows[row.index].getVisibleCells() as cell (cell.id)}
              <td
                class="p-2 align-middle {cell.column.columnDef.meta?.class}"
                onclick={cell.column.columnDef.meta?.preventRowClick
                  ? (e) => e.stopPropagation()
                  : undefined}>
                <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
              </td>
            {/each}
          </Table.Row>
        {:else}
          <Table.Row>
            <td colspan={columns.length} class="h-24 text-center">No results.</td>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
</div>

<style>
  :global(tbody::before) {
    display: block;
    padding-top: var(--virtualPaddingTop);
    content: '';
  }

  :global(tbody::after) {
    display: block;
    padding-bottom: var(--virtualPaddingBottom);
    content: '';
  }
</style>
