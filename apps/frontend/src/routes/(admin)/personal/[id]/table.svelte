<script
  lang="ts"
  generics="TData extends {
    metaId: number;
    usedInMapName: string | null;
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
  import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table';
  import BaseTableFilterPopover from '$lib/components/BaseTable/BaseTableFilterPopover.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Table from '$lib/components/ui/table';
  import { createVirtualizer } from '$lib/virtualizer.svelte.js';
  import { enhance } from '$app/forms';
  import Icon from '@iconify/svelte';

  type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    initialSorting?: SortingState;
    selectedId?: number;
    isDialogOpen?: boolean;
  };

  const defaultSorting: SortingState = [];
  let {
    data,
    columns,
    initialSorting = defaultSorting,
    selectedId = $bindable(),
    isDialogOpen = $bindable()
  }: DataTableProps<TData, TValue> = $props();
  let sorting = $state<SortingState>([]);
  let hasUserSorted = $state(false);
  let rowSelection = $state<RowSelectionState>({});
  let columnFilters = $state<ColumnFiltersState>([]);
  let columnVisibility = $state<VisibilityState>({
    search: false
  });

  $effect(() => {
    if (!hasUserSorted) {
      sorting = [...initialSorting];
    }
  });

  const table = createSvelteTable({
    get data() {
      return data;
    },
    get columns() {
      return columns;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: (updater) => {
      hasUserSorted = true;
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

  const usedInMapOptions = $derived(
    Array.from(new Set(data.map((item) => item.usedInMapName).filter((name) => name != null)))
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
      estimateSize: () => 48,
      overscan: 75
    })
  );
  const items = $derived(virtualizer.getVirtualItems());
  const paddingTop = $derived(items.length > 0 ? items[0].start : 0);
  const paddingBottom = $derived(
    items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1].end : 0
  );
  const selectedRows = $derived(table.getFilteredSelectedRowModel().rows);

  let prevDataSize = $state(0);

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
        action="?/removeMetasFromPersonalMap"
        method="post"
        id="remove-metas-form"
        use:enhance={({ cancel }) => {
          const confirmed = confirm(
            `Are you sure you want to remove ${selectedRows.length} meta(s) from your map?`
          );
          if (!confirmed) {
            cancel();
          }
          return async ({ update }) => {
            update();
          };
        }}>
        {#each selectedRows as row (row.original.metaId)}
          <input type="hidden" name="id" value={row.original.metaId} />
        {/each}
        <input type="hidden" name="mapId" value={data} />
        <button
          type="submit"
          class="w-full text-left px-2 py-1.5 bg-red-600 text-white font-semibold rounded hover:bg-red-700 active:bg-red-800 transition-colors shadow-xs">
          Remove meta(s)
        </button>
      </form>
    {/if}
    <Input
      placeholder="Filter tags"
      value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
      onchange={(e) => {
        table.getColumn('name')?.setFilterValue(e.currentTarget.value);
      }}
      oninput={(e) => {
        table.getColumn('name')?.setFilterValue(e.currentTarget.value);
      }}
      class="h-8 w-[150px] lg:w-[250px]" />
    {#if usedInMapOptions.length !== 0}
      <BaseTableFilterPopover
        {table}
        columnId="usedInMapName"
        title="Meta Maps"
        options={usedInMapOptions} />
    {/if}
    {#if isFiltered}
      <Button variant="ghost" onclick={() => table.resetColumnFilters()} class="h-8 px-2 lg:px-3">
        Reset <Icon class="ml-2" icon="ic:twotone-clear" />
      </Button>
    {/if}
  </div>
  <div class="h-[700px] overflow-auto relative w-full" bind:this={virtualListEl}>
    <Table.Root style="position: relative; width: 100%; table-layout: fixed;">
      <Table.Header style="position: sticky; top: 0; z-index: 10;">
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head
                style="background-color: var(--background, white);"
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
      <Table.Body style="position: relative;">
        {#if paddingTop > 0}
          <tr style="height: {paddingTop}px;"></tr>
        {/if}
        {#each items as row (row.index)}
          {@const tableRow = rows[row.index]}
          {#if tableRow}
            <Table.Row
              data-state={tableRow.getIsSelected() && 'selected'}
              onclick={() => {
                selectedId = tableRow.original.metaId;
                isDialogOpen = true;
              }}
              style="height: 48px;">
              {#each tableRow.getVisibleCells() as cell (cell.id)}
                <td
                  class="p-2 align-middle {cell.column.columnDef.meta?.class}"
                  onclick={cell.column.columnDef.meta?.preventRowClick
                    ? (e) => e.stopPropagation()
                    : undefined}>
                  <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                </td>
              {/each}
            </Table.Row>
          {/if}
        {:else}
          <Table.Row>
            <td colspan={columns.length} class="h-24 text-center">No results.</td>
          </Table.Row>
        {/each}
        {#if paddingBottom > 0}
          <tr style="height: {paddingBottom}px;"></tr>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>
</div>
