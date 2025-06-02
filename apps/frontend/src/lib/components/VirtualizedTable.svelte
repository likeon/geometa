<script lang="ts" generics="TData extends Record<string, any>, TValue">
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
  import X from '@lucide/svelte/icons/x';
  import Icon from '@iconify/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index';
  import { ChevronDown } from '@lucide/svelte';

  type FilterOption = {
    label: string;
    value: string;
  };

  type FilterConfig = {
    columnId: string;
    title: string;
    options: FilterOption[] | ((data: TData[]) => FilterOption[]);
  };

  type ActionConfig = {
    buttonText: string;
    handler: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    icon?: string;
  };

  type MassActionConfig =
    | ActionConfig
    | {
        dropdownItems: ActionConfig[];
        dropdownTriggerText?: string;
      };

  type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    initialSorting?: SortingState;
    selectedId?: string | number;
    selectedIds?: (string | number)[];
    isDialogOpen?: boolean;
    // Customization props
    searchPlaceholder?: string;
    searchColumnId?: string;
    filters?: FilterConfig[];
    massAction?: MassActionConfig;
    onRowClick?: (row: TData) => void;
    getRowId: (row: TData) => string | number;
    tableHeight?: string;
    rowHeight?: number;
    overscan?: number;
    showResetButton?: boolean;
    resetButtonIcon?: string;
    hiddenColumns?: string[];
  };

  let {
    data,
    columns,
    initialSorting = [],
    selectedId = $bindable(),
    selectedIds = $bindable(),
    isDialogOpen = $bindable(),
    searchPlaceholder = 'Filter tags',
    searchColumnId = 'search',
    filters = [],
    massAction,
    onRowClick,
    getRowId,
    tableHeight = '700px',
    rowHeight = 48,
    overscan = 75,
    showResetButton = true,
    resetButtonIcon = 'x',
    hiddenColumns = []
  }: DataTableProps<TData, TValue> = $props();

  let sorting = $state<SortingState>(initialSorting);
  let rowSelection = $state<RowSelectionState>({});
  let columnFilters = $state<ColumnFiltersState>([]);
  let columnVisibility = $state<VisibilityState>(
    [...hiddenColumns].reduce((acc, col) => {
      acc[col] = false;
      return acc;
    }, {} as VisibilityState)
  );

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

  const isFiltered = $derived(table.getState().columnFilters.length > 0);
  const rows = $derived(table.getRowModel().rows);
  const selectedRows = $derived(table.getFilteredSelectedRowModel().rows);
  $effect(() => {
    selectedIds = selectedRows.map((row) => getRowId(row.original));
  });
  let virtualListEl: HTMLDivElement;
  const virtualizer = $derived(
    createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: rows.length,
      getScrollElement: () => virtualListEl,
      estimateSize: () => rowHeight,
      overscan
    })
  );
  const items = $derived(virtualizer.getVirtualItems());
  const paddingTop = $derived(items.length > 0 ? items[0].start : 0);
  const paddingBottom = $derived(
    items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1].end : 0
  );

  let prevDataSize = data?.length ?? 0;

  // if data is removed/added unselect all rows
  $effect(() => {
    if (data && data.length !== prevDataSize) {
      table.resetRowSelection();
    }
    prevDataSize = data?.length ?? 0;
  });

  $effect(() => {
    if (selectedIds?.length === 0 && table.getSelectedRowModel().rows.length > 0) {
      table.resetRowSelection();
    }
  });

  const handleRowClick = (row: TData) => {
    if (onRowClick) {
      onRowClick(row);
    } else {
      selectedId = getRowId(row);
      isDialogOpen = true;
    }
  };

  const getFilterOptions = (filter: FilterConfig): FilterOption[] => {
    if (typeof filter.options === 'function') {
      return filter.options(data);
    }
    return filter.options;
  };
</script>

<div class="rounded-md">
  <div class="min-h-[40px] flex flex-1 items-center space-x-2">
    {#if massAction && selectedRows.length > 0}
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">{selectedRows.length} selected</span>

        {#if 'dropdownItems' in massAction}
          <!-- Dropdown mass actions -->
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="outline" size="sm">
                {massAction.dropdownTriggerText || 'Actions'}
                <ChevronDown size={16} class="ml-1" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
              {#each massAction.dropdownItems as action, index (index)}
                {#if index > 0 && action.variant === 'destructive'}
                  <DropdownMenu.Separator />
                {/if}
                <DropdownMenu.Item
                  class={action.variant === 'destructive'
                    ? 'text-destructive focus:text-destructive'
                    : ''}
                  onclick={action.handler}>
                  {#if action.icon}
                    <span class="mr-2">{action.icon}</span>
                  {/if}
                  {action.buttonText}
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {/if}
      </div>
    {/if}

    <Input
      placeholder={searchPlaceholder}
      value={table.getColumn(searchColumnId)?.getFilterValue() ?? ''}
      onchange={(e) => {
        table.getColumn(searchColumnId)?.setFilterValue(e.currentTarget.value);
      }}
      oninput={(e) => {
        table.getColumn(searchColumnId)?.setFilterValue(e.currentTarget.value);
      }}
      class="h-8 w-[150px] lg:w-[250px]" />

    {#each filters as filter, idx (idx)}
      {@const options = getFilterOptions(filter)}
      {#if options.length !== 0}
        <BaseTableFilterPopover {table} columnId={filter.columnId} title={filter.title} {options} />
      {/if}
    {/each}

    {#if isFiltered && showResetButton}
      <Button variant="ghost" onclick={() => table.resetColumnFilters()} class="h-8 px-2 lg:px-3">
        Reset
        {#if resetButtonIcon === 'x'}
          <X size={16} />
        {:else}
          <Icon class="ml-2" icon={resetButtonIcon} />
        {/if}
      </Button>
    {/if}
  </div>

  <div
    class="h-[{tableHeight}] overflow-auto relative w-full"
    bind:this={virtualListEl}
    style="height: {tableHeight};">
    <Table.Root style="position: relative; width: 100%;">
      <colgroup>
        {#each columns as column, idx (idx)}
          <col class={column.meta?.class || ''} />
        {/each}
      </colgroup>
      <Table.Header style="position: sticky; top: 0; z-index: 10;">
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head
                style="background-color: var(--background, white);"
                class={header.column.columnDef.meta?.class || ''}>
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
              onclick={() => handleRowClick(tableRow.original)}
              style="height: {rowHeight}px;">
              {#each tableRow.getVisibleCells() as cell (cell.id)}
                <td
                  class="p-2 align-middle {cell.column.columnDef.meta?.class || ''}"
                  onclick={cell.column.columnDef.meta?.preventRowClick
                    ? (e) => {
                        if (cell.column.id === 'select') {
                          e.stopPropagation();
                          tableRow.toggleSelected();
                        } else {
                          e.stopPropagation();
                        }
                      }
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
